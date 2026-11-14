# -*- coding: utf-8 -*-
"""界面层：tkinter。只调用 core，不直接写 SQL。"""
from __future__ import annotations

import tkinter as tk
from decimal import Decimal, InvalidOperation
from tkinter import font as tkfont
from tkinter import messagebox, ttk

import core


def _money(cents: int) -> str:
    return f"{Decimal(cents) / 100:.2f}"


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title(f"{core.APP_DISPLAY_NAME} · {core.APP_NAME}")
        self.geometry("720x520")
        self.minsize(560, 420)
        try:
            tkfont.nametofont("TkDefaultFont").configure(size=11, family="Microsoft YaHei UI")
        except tk.TclError:
            pass
        self._build()

    def _build(self) -> None:
        frame = ttk.Frame(self, padding=16)
        frame.pack(fill="both", expand=True)

        form = ttk.LabelFrame(frame, text="记一笔", padding=12)
        form.pack(fill="x")

        ttk.Label(form, text="金额（元）").grid(row=0, column=0, sticky="w", pady=4)
        self.amount = ttk.Entry(form, width=16)
        self.amount.grid(row=0, column=1, sticky="w", padx=(8, 16), pady=4)

        ttk.Label(form, text="备注").grid(row=0, column=2, sticky="w", pady=4)
        self.note = ttk.Entry(form, width=36)
        self.note.grid(row=0, column=3, sticky="we", padx=(8, 16), pady=4)
        form.columnconfigure(3, weight=1)

        ttk.Button(form, text="保存", command=self.on_add).grid(row=0, column=4, pady=4)
        self.amount.bind("<Return>", lambda _event: self.note.focus_set())
        self.note.bind("<Return>", lambda _event: self.on_add())

        actions = ttk.Frame(frame)
        actions.pack(fill="x", pady=(12, 8))
        ttk.Button(actions, text="备份数据", command=self.on_backup).pack(side="left")
        self.balance = ttk.Label(actions, text="结余：0.00 元")
        self.balance.pack(side="right")

        columns = ("created_at", "amount", "note")
        self.tree = ttk.Treeview(frame, columns=columns, show="headings", height=14)
        self.tree.heading("created_at", text="时间")
        self.tree.heading("amount", text="金额（元）")
        self.tree.heading("note", text="备注")
        self.tree.column("created_at", width=160, anchor="center")
        self.tree.column("amount", width=110, anchor="e")
        self.tree.column("note", width=360)
        self.tree.pack(fill="both", expand=True)

        self.status = ttk.Label(frame, text="", foreground="#555")
        self.status.pack(fill="x", pady=(8, 0))

        self.refresh()

    def refresh(self) -> None:
        for item in self.tree.get_children():
            self.tree.delete(item)
        for row in core.list_entries():
            self.tree.insert(
                "",
                "end",
                values=(row["created_at"].replace("T", " "), _money(row["amount_cents"]), row["note"]),
            )
        self.balance.configure(text=f"结余：{_money(core.balance_cents())} 元")
        self.status.configure(text=f"数据目录：{core.data_dir()}")

    def on_add(self) -> None:
        raw = self.amount.get().strip()
        if raw == "":
            messagebox.showinfo("提示", "请先填金额。")
            return
        try:
            amount = Decimal(raw)
        except InvalidOperation:
            messagebox.showerror("金额不对", "金额请填数字，例如 12.50。")
            return
        if amount <= 0:
            messagebox.showerror("金额不对", "金额要大于 0。")
            return
        try:
            core.add_entry(int((amount * 100).to_integral_value()), self.note.get())
        except Exception as error:  # noqa: BLE001 - 用户面前只显示一句白话
            messagebox.showerror("没保存成功", f"这次没保存成功：{error}\n数据还在，可以再试一次。")
            return
        self.amount.delete(0, "end")
        self.note.delete(0, "end")
        self.amount.focus_set()
        self.refresh()

    def on_backup(self) -> None:
        target = core.backup_db("manual")
        if target is None:
            messagebox.showinfo("提示", "还没有数据可以备份，先记一笔。")
            return
        messagebox.showinfo("备份好了", f"备份文件：\n{target}\n\n建议再复制一份到网盘或U盘。")


def run() -> None:
    App().mainloop()
