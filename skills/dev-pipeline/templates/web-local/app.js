// 本地记账：数据存 localStorage，支持导出/导入 JSON 备份。无外部依赖。
const KEY = "jizhang.entries.v1";

const $ = (id) => document.getElementById(id);
const money = (cents) => (cents / 100).toFixed(2);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save(entries) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

function render() {
  const entries = load();
  const body = $("list");
  body.innerHTML = "";
  let total = 0;
  for (const entry of entries.slice().reverse()) {
    total += Number(entry.amountCents) || 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${String(entry.createdAt || "").replace("T", " ")}</td>
      <td class="right">${money(Number(entry.amountCents) || 0)}</td>
      <td>${escapeHtml(entry.note || "")}</td>
      <td><button class="remove" data-id="${entry.id}">删除</button></td>`;
    body.appendChild(tr);
  }
  if (entries.length === 0) {
    body.innerHTML = '<tr><td colspan="4" class="empty">还没有记录，先记一笔。</td></tr>';
  }
  $("balance").textContent = `结余：${money(total)} 元`;
  $("status").textContent = `共 ${entries.length} 笔；数据只在这台电脑的浏览器里。`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

$("form").addEventListener("submit", (event) => {
  event.preventDefault();
  const raw = $("amount").value.trim();
  const note = $("note").value.trim();
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value <= 0) {
    alert("金额请填大于 0 的数字，例如 12.50。");
    return;
  }
  const entries = load();
  entries.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    amountCents: Math.round(value * 100),
    note,
    createdAt: new Date().toISOString(),
  });
  save(entries);
  $("amount").value = "";
  $("note").value = "";
  $("amount").focus();
  render();
});

$("list").addEventListener("click", (event) => {
  const id = event.target?.dataset?.id;
  if (!id) return;
  if (!confirm("确定删除这一笔？")) return;
  save(load().filter((entry) => entry.id !== id));
  render();
});

$("export").addEventListener("click", () => {
  const payload = { app: "jizhang-web", exportedAt: new Date().toISOString(), entries: load() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `jizhang-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

$("import").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const entries = Array.isArray(data) ? data : data.entries;
    if (!Array.isArray(entries)) throw new Error("bad file");
    if (!confirm("导入会覆盖当前记录，确定继续？")) return;
    save(entries);
    render();
    alert("导入完成。");
  } catch {
    alert("这个文件不是有效的备份，请选择之前导出的 JSON。");
  } finally {
    event.target.value = "";
  }
});

render();
