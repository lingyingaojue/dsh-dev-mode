# -*- coding: utf-8 -*-
"""数据层：SQLite、备份、日志、自测。界面只通过这里读写数据。"""
from __future__ import annotations

import json
import os
import shutil
import sqlite3
import tempfile
from contextlib import closing
from datetime import datetime
from pathlib import Path

APP_NAME = "Jizhang"          # 英文名，用于数据目录/打包产物，避免中文路径问题
APP_DISPLAY_NAME = "记账小工具"  # 中文名，用于窗口标题
SCHEMA_VERSION = 1
BACKUP_KEEP = 10


def data_dir() -> Path:
    """数据目录：测试用 APP_DATA_DIR 覆盖；生产用用户数据目录，不写 Program Files。"""
    override = os.environ.get("APP_DATA_DIR")
    if override:
        base = Path(override).expanduser().resolve()
    elif os.name == "nt":
        root = os.environ.get("LOCALAPPDATA") or (Path.home() / "AppData" / "Local")
        base = Path(root) / APP_NAME
    else:
        root = os.environ.get("XDG_DATA_HOME") or (Path.home() / ".local" / "share")
        base = Path(root) / APP_NAME
    base.mkdir(parents=True, exist_ok=True)
    return base


def db_path() -> Path:
    return data_dir() / "data.db"


def backups_dir() -> Path:
    path = data_dir() / "backups"
    path.mkdir(parents=True, exist_ok=True)
    return path


def logs_dir() -> Path:
    path = data_dir() / "logs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def log(message: str) -> None:
    try:
        line = f"{datetime.now().isoformat(timespec='seconds')} {message}\n"
        with (logs_dir() / "app.log").open("a", encoding="utf-8") as handle:
            handle.write(line)
    except OSError:
        pass


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(db_path())
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    with closing(_connect()) as connection, connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount_cents INTEGER NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
        )
        connection.execute(
            "INSERT OR IGNORE INTO meta(key, value) VALUES('schema_version', ?)",
            (str(SCHEMA_VERSION),),
        )
    log("init_db ok")


def backup_db(reason: str = "manual") -> Path | None:
    """复制一份数据库到 backups/，保留最近 BACKUP_KEEP 份；数据库不存在时跳过。"""
    source = db_path()
    if not source.exists():
        return None
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target = backups_dir() / f"backup-{stamp}-{reason}.db"
    shutil.copy2(source, target)
    backups = sorted(backups_dir().glob("backup-*.db"), key=lambda item: item.stat().st_mtime)
    for old in backups[:-BACKUP_KEEP]:
        try:
            old.unlink()
        except OSError:
            pass
    log(f"backup {target.name}")
    return target


def add_entry(amount_cents: int, note: str) -> int:
    if amount_cents <= 0:
        raise ValueError("金额必须大于 0")
    with closing(_connect()) as connection, connection:
        cursor = connection.execute(
            "INSERT INTO entries(amount_cents, note, created_at) VALUES(?, ?, ?)",
            (int(amount_cents), note.strip(), datetime.now().isoformat(timespec="seconds")),
        )
        return int(cursor.lastrowid)


def list_entries(limit: int = 500) -> list[dict]:
    with closing(_connect()) as connection:
        rows = connection.execute(
            "SELECT id, amount_cents, note, created_at FROM entries ORDER BY id DESC LIMIT ?",
            (int(limit),),
        ).fetchall()
    return [dict(row) for row in rows]


def balance_cents() -> int:
    with closing(_connect()) as connection:
        row = connection.execute("SELECT COALESCE(SUM(amount_cents), 0) AS total FROM entries").fetchone()
    return int(row["total"])


def export_json(path: Path) -> None:
    payload = {
        "app": APP_NAME,
        "exported_at": datetime.now().isoformat(timespec="seconds"),
        "balance_cents": balance_cents(),
        "entries": list_entries(limit=100000),
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def selftest() -> int:
    """不依赖界面：建库 -> 写入 -> 关闭 -> 重开 -> 校验 -> 备份。"""
    old_override = os.environ.get("APP_DATA_DIR")
    with tempfile.TemporaryDirectory(prefix="jizhang-selftest-") as tmp:
        os.environ["APP_DATA_DIR"] = tmp
        try:
            init_db()
            first = add_entry(12345, "自测一")
            second = add_entry(500, "自测二")
            if first <= 0 or second <= 0:
                raise AssertionError("insert returned no id")
            if balance_cents() != 12845:
                raise AssertionError(f"balance mismatch: {balance_cents()}")
            rows = list_entries()
            if len(rows) != 2:
                raise AssertionError(f"row count mismatch: {len(rows)}")
            backup = backup_db("selftest")
            if backup is None or not backup.exists():
                raise AssertionError("backup missing")
            # 关闭并重新打开：验证持久化
            if balance_cents() != 12845 or len(list_entries()) != 2:
                raise AssertionError("persistence mismatch")
        finally:
            if old_override is None:
                os.environ.pop("APP_DATA_DIR", None)
            else:
                os.environ["APP_DATA_DIR"] = old_override
    print("SELFTEST=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(selftest())
