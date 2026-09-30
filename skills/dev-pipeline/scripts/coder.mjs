#!/usr/bin/env node
// dev-pipeline 唯一脚本：驱动「开发者模式」的后台极简会话。
//
//   node coder.mjs selfcheck
//   node coder.mjs start --cwd <工程目录> --plan-file <plan.md> [--title <白话标题>] [--deadline-sec 540]
//   node coder.mjs send --session <id> (--text <s> | --issues-file <qa.md>) [--deadline-sec 540]
//   node coder.mjs wait --session <id> [--deadline-sec 540]
//   node coder.mjs read --session <id> [--tail 3]
//   node coder.mjs list
//   node coder.mjs preflight [--force]
//
// 退出码：0 完成 / 2 仍在跑（幂等续 wait）/ 3 配置·认证·参数错 / 4 极简会话自报失败 / 5 长时间无进展
// 本脚本无状态：所有进度都能从 <工程目录>\.dsh-dev\ 与 session/list 重新读出来，被杀不影响后台会话。
import {
  appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { connect, dshHome } from "./lib.mjs";

const VERSION = "1.1.1";
const PRESET = "minimal";
const EFFORT_DEFAULT = "max";
/** 后台会话起不来（权限/沙箱挡住）时，自动改用这个档位重开一次。 */
const PERMISSION_FALLBACK = "danger-full-access";
/** 汇报里出现这些字样，说明后台会话被权限或沙箱挡住了。 */
const BLOCKED_PATTERN = /PTY shell exited|permission denied|sandbox|EACCES|EPERM|access is denied|拒绝访问/i;
/** selfcheck 要逐条校验的流程条款：`标题::正文锚点`（两个都在才算这一条真的生效）。 */
const REQUIRED_MARKERS = [
  "### 第 0 步 开工体检::selfcheck",
  "## 流程分级：快线 / 全线::快线（四条全满足）",
  "## 交付前的验收表::证据文件路径",
  "## 出口表::分岔",
  "DEVPERM::分岔",
  "先列出本机实际可用的技能::windows-app-builder",
  "## 和小白说话的铁律::黑窗口",
  "## 开场：先给例子，再问问题::2–4 个选项",
  "## 每次只说三件事::你要不要做什么",
  "## 交付三件套::桌面快捷方式",
  "## 你自己怎么验::点哪里",
  "## 绝不出现的东西::英文报错",
  "## 出错时只说三句话::我打算怎么修",
];
const DEADLINE_DEFAULT = 540;
const POLL_MS = 5000;
/** 探活成功时必须看到的机器可判标志（不靠猜文字）。 */
const PROBE_OK = "DEVPROBE_OK=1";
/** 卡住阈值必须严格小于截止时间，否则"卡住"永远轮不到就先超时了。 */
const STALL_DEFAULT = 300;
const LOG_CAP = 2 * 1024 * 1024;

const argv = process.argv.slice(2);
const cmd = argv[0];
function flag(name, fallback) {
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const value = argv[at + 1];
  return value === undefined || value.startsWith("--") ? true : value;
}
const has = (name) => argv.includes(`--${name}`);
const num = (value, fallback) => (value === true || value === undefined ? fallback : Number(value));
/** 取可选参数值：没给、或给了但没带值时都返回 undefined。 */
const optFlag = (name) => { const value = flag(name, undefined); return value === true ? undefined : value; };
/** 解析输入文件参数：相对路径按工程目录解析；给了就必须存在，免得后台会话扑空。 */
function resolveInput(value, cwd, label) {
  if (value === undefined || value === true) return undefined;
  const full = resolve(cwd, String(value));
  if (!existsSync(full)) die(3, `${label} 指向的文件不存在：${full}`);
  return full;
}
/** 本机时区；取不到就回退（不写死任何地区的时区）。 */
function localTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}

function out(line) { process.stdout.write(`${line}\n`); }
function die(code, message) { process.stderr.write(`${message}\n`); process.exit(code); }
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function devRoot() {
  const root = join(dshHome(), "dev-mode");
  mkdirSync(root, { recursive: true });
  return root;
}
function registryPath() { return join(devRoot(), "state.json"); }
function readRegistry() {
  try { return JSON.parse(readFileSync(registryPath(), "utf8")); } catch { return { sessions: {} }; }
}
function writeRegistry(registry) { writeFileSync(registryPath(), JSON.stringify(registry, null, 2), "utf8"); }
function projectPaths(cwd) {
  const root = join(cwd, ".dsh-dev");
  return { root, status: join(root, "status.json"), logs: join(root, "logs") };
}
function ensureProjectDirs(cwd) {
  const paths = projectPaths(cwd);
  mkdirSync(paths.logs, { recursive: true });
  return paths;
}
function readStatus(paths) {
  try { return JSON.parse(readFileSync(paths.status, "utf8")); } catch { return {}; }
}
function writeStatus(paths, patch) {
  const next = { ...readStatus(paths), ...patch, updatedAt: new Date().toISOString() };
  try { writeFileSync(paths.status, JSON.stringify(next, null, 2), "utf8"); } catch { /* 状态写不动不该中断流程 */ }
}
/** 只追加、不覆盖：工程目录已有 .gitignore 时补一行 .dsh-dev/。 */
function ensureGitignore(cwd) {
  const file = join(cwd, ".gitignore");
  try {
    if (!existsSync(file)) return;
    const text = readFileSync(file, "utf8");
    if (text.split(/\r?\n/).some((line) => line.trim() === ".dsh-dev/" || line.trim() === ".dsh-dev")) return;
    appendFileSync(file, `${text.endsWith("\n") ? "" : "\n"}.dsh-dev/\n`, "utf8");
  } catch { /* 忽略 */ }
}
function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error?.code === "EPERM"; }
}
/** 建会话期间用的短锁：防同一项目并发开两个后台会话。 */
function acquireLock(cwd, force) {
  const path = join(devRoot(), `${createHash("sha256").update(cwd).digest("hex").slice(0, 12)}.lock`);
  const attempt = () => {
    const fd = openSync(path, "wx");
    writeFileSync(fd, JSON.stringify({ pid: process.pid, cwd, at: new Date().toISOString() }), "utf8");
    closeSync(fd);
  };
  try { attempt(); } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    let previous = {};
    try { previous = JSON.parse(readFileSync(path, "utf8")); } catch { previous = {}; }
    if (pidAlive(previous.pid) && !force) die(3, `该项目正在另一个后台会话里创建程序（pid ${previous.pid}）。等它结束，或加 --force 强制继续。`);
    try { unlinkSync(path); } catch { /* 忽略 */ }
    attempt();
  }
  return () => { try { unlinkSync(path); } catch { /* 忽略 */ } };
}

function rowOf(items, sessionId) { return items.find((item) => item.sessionId === sessionId); }
function turnsOf(row) { return row?.projections?.values?.sessionStats?.turns ?? 0; }

function rowsOfPage(page) {
  const records = page?.records ?? [];
  return records.map((record) => record.event ?? record).filter((event) => event !== undefined);
}
function textOfAssistant(event) {
  const content = event?.data?.message?.content ?? [];
  return content.filter((block) => block.type === "text").map((block) => block.text ?? "").join("");
}
function describeEvents(events) {
  const histogram = {};
  const tools = [];
  let lastText = "";
  let sawTurnEnd = false;
  for (const event of events) {
    const type = String(event.type ?? "?");
    histogram[type] = (histogram[type] ?? 0) + 1;
    if (type.startsWith("tool/")) {
      const name = event.data?.name ?? event.data?.toolName ?? event.data?.tool?.name ?? event.data?.call?.name;
      if (typeof name === "string") tools.push(name);
    }
    if (type === "assistant/message") {
      const text = textOfAssistant(event);
      if (text.trim() !== "") lastText = text;
    }
    if (type === "turn/end") sawTurnEnd = true;
  }
  return { histogram, tools, lastText, sawTurnEnd };
}

async function fetchRow(dsh, sessionId) {
  const listed = await dsh.call("session/list", { _request: {} });
  if (!listed.ok) throw new Error(`session/list failed: ${JSON.stringify(listed.error)}`);
  return { row: rowOf(listed.value?.items ?? [], sessionId), items: listed.value?.items ?? [] };
}

async function pollTurn(dsh, sessionId, baselineTurns, deadlineSec, stallSec, paths, phase, forceStall) {
  const started = Date.now();
  let lastSignature = "";
  let lastChange = Date.now();
  let lastStatusWrite = 0;
  for (;;) {
    const { row } = await fetchRow(dsh, sessionId);
    if (row === undefined) die(3, `session/list 里找不到会话 ${sessionId}（可能被删了）。`);
    const turns = turnsOf(row);
    const running = row?.running === true;
    const signature = `${turns}|${String(running)}|${String(row?.updatedAt ?? "")}`;
    if (signature !== lastSignature) { lastSignature = signature; lastChange = Date.now(); }
    if (Date.now() - lastStatusWrite > 30000) {
      writeStatus(paths, { phase, sessionId, turns, running, lastUpdatedAt: row?.updatedAt ?? null });
      lastStatusWrite = Date.now();
    }
    if (turns >= baselineTurns + 1 && !running) return { state: "done", row };
    if (forceStall !== true && Date.now() - lastChange > stallSec * 1000) return { state: "stalled", row };
    if (Date.now() - started > deadlineSec * 1000) return { state: "timeout", row };
    await sleep(POLL_MS);
  }
}

/** 只取"最后一轮"的事件：从倒数第二个 turn/end 之后切起，避免把上一轮的汇报当成本轮的。 */
function eventsOfLastTurn(events) {
  const ends = [];
  for (let i = 0; i < events.length; i += 1) if (String(events[i]?.type) === "turn/end") ends.push(i);
  if (ends.length < 2) return events;
  return events.slice(ends[ends.length - 2] + 1);
}

async function collect(dsh, sessionId, row, paths, label) {
  const cursor = row?.projections?.asOfSeq ?? 0;
  const page = await dsh.call("session/page", { request: { address: { kind: "session", sessionId }, throughSeq: cursor } });
  if (!page.ok) die(3, `session/page failed: ${JSON.stringify(page.error)}`);
  const all = rowsOfPage(page.value);
  const events = eventsOfLastTurn(all);
  const described = describeEvents(events);
  let logPath = null;
  try {
    logPath = join(paths.logs, `coder-${label}.json`);
    const header = { sessionId, label, at: new Date().toISOString(), cursor, totalEvents: all.length, turnEvents: events.length };
    let payload = JSON.stringify({ ...header, events }, null, 0);
    if (payload.length > LOG_CAP) {
      let keep = Math.floor(events.length / 2);
      while (keep > 0 && payload.length > LOG_CAP) {
        payload = JSON.stringify({ ...header, truncated: true, keptEvents: keep, events: events.slice(-keep) }, null, 0);
        keep = Math.floor(keep / 2);
      }
      if (payload.length > LOG_CAP) payload = JSON.stringify({ ...header, truncated: true, keptEvents: 0, events: [] }, null, 0);
    }
    writeFileSync(logPath, payload, "utf8");
  } catch { logPath = null; }
  return { cursor, ...described, logPath, totalEvents: all.length, turnEvents: events.length };
}

function summarize(dsh, row) {
  return {
    preset: row?.projections?.values?.agentPreset ?? null,
    model: row?.projections?.values?.modelSelection ?? null,
    permissions: row?.projections?.values?.permissions ?? null,
    title: row?.projections?.values?.title ?? null,
    turns: turnsOf(row),
    tokenUsage: row?.projections?.values?.tokenUsage ?? null,
  };
}

function emitResult({ sessionId, status, result, turns, toolCount, logPath, text, extra }) {
  out(`DEVSESSION_ID=${sessionId}`);
  out(`DEVSTATUS=${status}`);
  if (result !== undefined) out(`DEVRESULT=${result}`);
  if (turns !== undefined) out(`DEVTURNS=${turns}`);
  if (toolCount !== undefined) out(`DEVTOOLCALLS=${toolCount}`);
  if (logPath) out(`DEVLOG=${logPath}`);
  if (extra) for (const line of extra) out(line);
  out("--- 后台会话最后一段汇报 ---");
  const body = (text ?? "").trim();
  out(body === "" ? "(没有拿到文字汇报，看 DEVLOG 或点开会话查看)" : body.slice(0, 1500));
}

function defaultInstruction(cwd, planPath, issuesPath) {
  const lines = [
    "你是一位实现工程师。请严格按计划把程序做出来，并且让它真的能跑起来。",
    "",
    `工作目录（绝对路径，所有文件都建在这里）：${cwd}`,
    planPath ? `计划文件（先完整读一遍）：${planPath}` : null,
    issuesPath ? `问题清单（先完整读一遍，逐条修）：${issuesPath}` : null,
    "",
    "要求：",
    "1. 先读上面给的文件；然后只在上面那个工作目录里创建、修改文件，不要动目录以外的任何东西。",
    "2. 需要用户拍板的事不要问，按计划里写明的方案做。",
    "3. 做完必须自测三连，三条都过才算完成：",
    "   a) 产物存在：计划要求的文件或可执行文件确实生成了；",
    "   b) 构建或启动成功：构建命令正常结束，或者程序窗口真的起来了；",
    "   c) 端到端跑一次：真的执行一遍主要功能，把输出贴出来。",
    "   任何一条没过，不许说完成了，最后一行必须写 DEVRESULT=FAIL。",
    "4. 最后用中文汇报，格式固定（这几行必须有）：",
    "   DEVRESULT=OK 或 DEVRESULT=FAIL",
    "   改动的文件：",
    "   怎么运行：",
    "   自测结果：",
    "   未解决的地方：",
  ];
  return lines.filter((line) => line !== null).join("\n");
}

async function createCoderSession(dsh, { cwd, provider, model, effort, permission, title }) {
  const created = await dsh.call("session/create", { request: { cwd, agentPreset: PRESET } });
  if (!created.ok) die(3, `建后台会话失败：${JSON.stringify(created.error)}`);
  const sessionId = created.value?.sessionId;
  if (sessionId === undefined) die(3, "建后台会话失败：返回里没有 sessionId。");
  // 不写死任何模型名：没指定就用本机默认；指定的在本机不存在就自动改用默认。
  const catalog = await dsh.call("session/modelCatalog", {});
  const deployment = { provider: catalog.value?.default?.provider, model: catalog.value?.default?.model };
  let chosen = { provider: provider ?? deployment.provider, model: model ?? deployment.model };
  if (chosen.provider === undefined || chosen.model === undefined) die(3, "不知道用哪个模型，也读不到本机默认模型。");
  let selected = await dsh.call("session/selectModel", { request: { sessionId, provider: chosen.provider, model: chosen.model, reasoningEffort: effort } });
  if (!selected.ok) {
    const unavailable = JSON.stringify(selected.error ?? {}).includes("model-unavailable");
    if (unavailable && (chosen.provider !== deployment.provider || chosen.model !== deployment.model)) {
      chosen = { provider: deployment.provider, model: deployment.model };
      out(`DEVMODELFALLBACK=${chosen.provider}/${chosen.model}`);
      selected = await dsh.call("session/selectModel", { request: { sessionId, provider: chosen.provider, model: chosen.model, reasoningEffort: effort } });
    }
  }
  if (!selected.ok) die(3, `设置模型/思考强度失败：${JSON.stringify(selected.error)}`);
  if (permission !== undefined && permission !== true) {
    const applied = await dsh.call("commands/execute", { agentId: sessionId, line: `/permission ${permission}`, submittedAttachments: [] });
    if (!applied.ok) die(3, `设置权限失败：${JSON.stringify(applied.error)}`);
  }
  const registry = readRegistry();
  registry.sessions[sessionId] = {
    sessionId, cwd, title: title ?? null, createdAt: new Date().toISOString(),
    preset: PRESET, effort, provider: chosen.provider, model: chosen.model,
    permission: permission === undefined || permission === true ? null : String(permission),
  };
  writeRegistry(registry);
  return sessionId;
}

async function sendPrompt(dsh, sessionId, text) {
  const sent = await dsh.call("session/prompt", {
    request: { requestId: randomUUID(), sessionId, mode: "queue", content: [{ type: "text", text }], clientTimeZone: localTimeZone() },
  });
  if (!sent.ok) die(3, `发消息给后台会话失败：${JSON.stringify(sent.error)}`);
}

/**
 * 建好会话后探一次活：只让它读一行文件，目的是尽早发现「权限太紧、连命令都跑不起来」。
 * 探活失败的情况下继续等下去只是白烧时间，所以宁可多花这一小轮。
 */
async function probeShell(dsh, sessionId, paths) {
  await sendPrompt(dsh, sessionId, [
    "先只做一件事，不要写任何文件、不要建任何东西：执行下面这条命令，把原始输出贴出来，最后一行写 DEVRESULT=OK。",
    `命令：echo ${PROBE_OK}`,
  ].join("\n"));
  await sleep(3000);
  const settled = await pollTurn(dsh, sessionId, 0, DEADLINE_DEFAULT, STALL_DEFAULT, paths, "probe", false);
  const collected = await collect(dsh, sessionId, settled.row, paths, "probe");
  const text = collected.lastText;
  return { state: settled.state, text, passed: text.includes(PROBE_OK) };
}

/** 读一个"最近改动过"的会话，看它实际生效的权限档位（仅供参考，不等于部署默认值）。 */
async function lastPermission(dsh) {
  const listed = await dsh.call("session/list", { _request: {} });
  if (!listed.ok) return { value: null, source: "unknown" };
  for (const item of listed.value?.items ?? []) {
    const value = item?.projections?.values?.permissions?.currentValue;
    if (typeof value === "string" && value !== "") {
      return { value, source: `most-recent-session(${String(item.sessionId).slice(8, 16)}，仅供参考，不代表默认档位)` };
    }
  }
  return { value: null, source: "unknown" };
}

/** 卡住时的下一步：按运行时读到的权限档位分岔，不预设任何默认值。 */
function devHint(permissions) {
  const value = String(permissions?.currentValue ?? "");
  if (value.includes("danger-full-access")) return "DEVHINT=不是等批准（权限已完全放开）：用 read --tail 3 看卡在哪，必要时补一条纠正指令，或本会话接手自己做";
  if (value !== "") return "DEVHINT=可能停在等批准：让用户点开这个会话批准，或用 --permission danger-full-access 重开一次";
  return "DEVHINT=权限档位未知：先 read 看 DEVPERM，再决定是等批准还是本会话接手";
}

function sessionContext(sessionId, cwdArg) {
  const registry = readRegistry();
  const known = registry.sessions[sessionId];
  const cwd = cwdArg === undefined ? known?.cwd : resolve(cwdArg);
  if (cwd === undefined) die(3, `不知道会话 ${sessionId} 的工程目录；补一个 --cwd <工程目录>。`);
  return { cwd, known };
}

// ---------------------------------------------------------------- commands

async function selfcheck() {
  out(`coder.mjs v${VERSION}`);
  const dsh = connect();
  const presets = await dsh.call("agentPresets/list", {});
  // 地址行放在这次调用之后打印：万一探测换了地址，这里显示的才是真正在用的那个
  out(`baseUrl=${dsh.baseUrl} source=${dsh.source} home=${dsh.home}`);
  if (!presets.ok) {
    const tried = dsh.tried.length > 0 ? `；已试过：${dsh.tried.join(" ")}` : "";
    die(3, `连不上本机 /api 或认证失败：${JSON.stringify(presets.error)}${tried}；候选地址：${dsh.candidates.join(" ")}`);
  }
  const list = presets.value?.items ?? presets.value?.presets ?? presets.value ?? [];
  const ids = Array.isArray(list) ? list.map((item) => item?.id ?? item?.agentPreset).filter(Boolean) : [];
  out(`agentPresets=${ids.join(",")}`);
  const failures = [];
  const checkPreset = (id) => {
    const ok = ids.includes(id);
    out(`CHECK=preset:${id} ${ok ? "OK" : "MISSING"}`);
    if (!ok) failures.push(`模式名单里没有 ${id}`);
  };
  checkPreset(PRESET);
  checkPreset("dev");
  const catalog = await dsh.call("session/modelCatalog", {});
  if (!catalog.ok) die(3, `读模型名单失败：${JSON.stringify(catalog.error)}`);
  const text = JSON.stringify(catalog.value ?? {});
  const effortOk = text.includes(`"${EFFORT_DEFAULT}"`);
  out(`CHECK=effort:${EFFORT_DEFAULT} ${effortOk ? "OK" : "MISSING"}`);
  if (!effortOk) failures.push(`模型名单里没有思考强度 ${EFFORT_DEFAULT}`);
  const routable = Array.isArray(catalog.value?.routableProviders) ? catalog.value.routableProviders : [];
  out(`CHECK=modelRoute:${routable.length > 0 ? routable.join("|") : "(无)"} ${routable.length > 0 ? "OK" : "MISSING"}`);
  if (routable.length === 0) failures.push("本机没有任何可用的模型来源");
  const fallback = catalog.value?.default ?? {};
  const fallbackOk = fallback.provider !== undefined && fallback.model !== undefined;
  out(`CHECK=modelDefault:${fallbackOk ? `${fallback.provider}/${fallback.model}` : "(无)"} (reasoningEffort=${fallback.reasoningEffort ?? "?"}) ${fallbackOk ? "OK" : "MISSING"}`);
  if (!fallbackOk) failures.push("读不到本机默认模型");
  const preset = await dsh.call("agentPresets/read", { agentPreset: "dev" });
  if (!preset.ok) {
    out("CHECK=persona:(读不到 dev 模式内容) MISSING");
    failures.push(`读 dev 模式内容失败：${JSON.stringify(preset.error)}`);
  } else {
    const content = String(preset.value?.content ?? "");
    for (const entry of REQUIRED_MARKERS) {
      const [marker, anchor] = entry.split("::");
      const hasMarker = content.includes(marker);
      const hasAnchor = anchor === undefined || content.includes(anchor);
      const ok = hasMarker && hasAnchor;
      out(`CHECK=persona:${marker} ${ok ? "OK" : hasMarker ? "ANCHOR-MISSING" : "MISSING"}`);
      if (!ok) failures.push(hasMarker
        ? `条款标题在、正文锚点丢了（内容可能被改坏）：${marker}（应有「${anchor}」）`
        : `流程条款没生效：缺「${marker}」`);
    }
  }
  const perm = await lastPermission(dsh);
  out(`CHECK=perm:${perm.value ?? "unknown"} source=${perm.source}`);
  if (failures.length > 0) {
    die(3, [
      "自检未通过：",
      ...failures.map((line) => `- ${line}`),
      "「流程条款没生效」＝本机还在用旧版本插件：按 README 的「先移除、再安装」重装，或重启 DSH 应用。",
      "「正文锚点丢了」＝插件版本是本机的，但条款内容被改坏：检查 cordis.patch.yml 是否被误改。",
    ].join("\n"));
  }
  out("SELFCHECK=OK");
  process.exit(0);
}

async function preflight() {
  const cachePath = join(devRoot(), "preflight.json");
  // 缓存只在"版本一致 + 上次真的跑完且成功"时才采信；损坏的缓存当没有。
  if (!has("force") && existsSync(cachePath)) {
    let cached = null;
    try { cached = JSON.parse(readFileSync(cachePath, "utf8")); } catch { cached = null; }
    const usable = cached !== null && cached.version === VERSION && cached.status === "done";
    if (usable) {
      out(`PREFLIGHT=cached at=${cached.at} version=${cached.version}`);
      out(cached.text ?? "");
      process.exit(0);
    }
    out(`PREFLIGHT=cache-ignored(${cached === null ? "缓存损坏" : `version=${cached.version ?? "?"} status=${cached.status ?? "?"}`})`);
  }
  const cwd = resolve(String(flag("cwd", join(devRoot(), "probe"))));
  mkdirSync(cwd, { recursive: true });
  const paths = ensureProjectDirs(cwd);
  const dsh = connect();
  const sessionId = await createCoderSession(dsh, {
    cwd, provider: optFlag("provider"), model: optFlag("model"),
    effort: String(flag("effort", EFFORT_DEFAULT)), permission: optFlag("permission"), title: "极简会话能力预检",
  });
  out(`DEVSESSION_ID=${sessionId}`);
  const shellName = process.platform === "win32" ? "pwsh" : "bash";
  const probe = [
    `请只做一件事，不要建任何项目：用 ${shellName} 执行下面这条命令，把它的原始输出贴出来，最后一行写 DEVRESULT=OK。`,
    "命令：node -v; npm -v; python --version; dotnet --version",
  ].join("\n");
  await sendPrompt(dsh, sessionId, probe);
  let baseline = 0;
  await sleep(3000);
  const { row } = await fetchRow(dsh, sessionId);
  baseline = turnsOf(row);
  const settled = await pollTurn(dsh, sessionId, Math.max(0, baseline - 1), num(flag("deadline-sec", undefined), DEADLINE_DEFAULT), STALL_DEFAULT, paths, "preflight", false);
  const collected = await collect(dsh, sessionId, settled.row, paths, "preflight");
  const payload = { version: VERSION, at: new Date().toISOString(), cwd, sessionId, status: settled.state, text: collected.lastText.slice(0, 2000) };
  writeFileSync(cachePath, JSON.stringify(payload, null, 2), "utf8");
  await dsh.call("workspace/archiveSession", { request: { sessionId, stopActivity: false } });
  out(`PREFLIGHT=${settled.state}`);
  out(collected.lastText.slice(0, 1200));
  process.exit(settled.state === "done" ? 0 : 2);
}

async function start() {
  const cwdRaw = flag("cwd", undefined);
  if (cwdRaw === undefined || cwdRaw === true) die(3, "start 需要 --cwd <工程目录>。");
  const cwd = resolve(String(cwdRaw));
  if (!existsSync(cwd)) die(3, `工程目录不存在：${cwd}（先建好再启动后台会话）。`);
  const planPath = resolveInput(flag("plan-file", undefined), cwd, "--plan-file");
  const issuesPath = resolveInput(flag("issues-file", undefined), cwd, "--issues-file");
  const dsh = connect();
  const release = acquireLock(cwd, has("force") === true);
  process.on("exit", release); // process.exit() 不会走 finally，这里兜底把锁解掉
  try {
    if (!has("force")) {
      const registry = readRegistry();
      for (const [sessionId, info] of Object.entries(registry.sessions)) {
        if (resolve(info.cwd ?? "") !== cwd) continue;
        const { row } = await fetchRow(dsh, sessionId);
        if (row?.running === true) die(3, `这个项目已经有一个后台会话在跑（${sessionId}）。等它结束，或加 --force 另开一个。`);
      }
    }
    const paths = ensureProjectDirs(cwd);
    ensureGitignore(cwd);
    const provider = optFlag("provider");
    const model = optFlag("model");
    const permission = optFlag("permission");
    const title = optFlag("title");
    const effort = String(flag("effort", EFFORT_DEFAULT));
    let sessionId = await createCoderSession(dsh, { cwd, provider, model, effort, permission, title });
    out(`DEVSESSION_ID=${sessionId}`);
    // 探活：只看"后台有没有回 DEVPROBE_OK=1"这个机器可判的标志，不靠猜文字
    if (!has("no-probe") && permission !== PERMISSION_FALLBACK) {
      const probe = await probeShell(dsh, sessionId, paths);
      if (probe.passed) {
        out("DEVPROBE=ok");
      } else {
        out(`DEVPROBE=blocked(${BLOCKED_PATTERN.test(probe.text) ? "权限/沙箱字样" : "没拿到标志"})`);
        out(`DEVPERMFALLBACK=1（改用 ${PERMISSION_FALLBACK} 重开一次）`);
        const abandoned = sessionId;
        sessionId = await createCoderSession(dsh, { cwd, provider, model, effort, permission: PERMISSION_FALLBACK, title });
        out(`DEVABANDONED=${abandoned}`);
        out(`DEVSESSION_ID=${sessionId}`);
      }
    }
    const text = flag("text", undefined);
    const promptText = text === undefined || text === true
      ? defaultInstruction(cwd, planPath, issuesPath)
      : String(text);
    const beforeSend = await fetchRow(dsh, sessionId);
    const baseline = turnsOf(beforeSend.row);
    await sendPrompt(dsh, sessionId, promptText);
    if (has("no-wait")) { out("DEVSTATUS=running"); out("(--no-wait) 已发送，未等待。用 wait --session 继续。"); process.exit(2); }
    await sleep(3000);
    const settled = await pollTurn(dsh, sessionId, baseline, num(flag("deadline-sec", undefined), DEADLINE_DEFAULT), num(flag("stall-sec", undefined), STALL_DEFAULT), paths, "coding", false);
    const collected = await collect(dsh, sessionId, settled.row, paths, "start");
    const result = collected.lastText.includes("DEVRESULT=FAIL") ? "FAIL" : collected.lastText.includes("DEVRESULT=OK") ? "OK" : "UNKNOWN";
    const summary = summarize(dsh, settled.row);
    emitResult({
      sessionId, status: settled.state, result, turns: summary.turns, toolCount: collected.tools.length,
      logPath: collected.logPath, text: collected.lastText,
      extra: [
        `DEVPRESET=${summary.preset}`, `DEVMODEL=${JSON.stringify(summary.model)}`,
        `DEVPERM=${JSON.stringify(summary.permissions)}`, `DEVTOKENS=${JSON.stringify(summary.tokenUsage)}`,
        ...(settled.state === "stalled" ? [devHint(summary.permissions)] : []),
      ],
    });
    writeStatus(paths, { phase: settled.state === "done" ? "coded" : "coding", sessionId, turns: summary.turns });
    if (settled.state === "timeout") process.exit(2);
    if (settled.state === "stalled") process.exit(5);
    process.exit(result === "FAIL" ? 4 : 0);
  } finally { release(); }
}

async function send() {
  const sessionId = flag("session", undefined);
  if (sessionId === undefined || sessionId === true) die(3, "send 需要 --session <id>。");
  const cwdFlag = flag("cwd", undefined);
  const { cwd } = sessionContext(String(sessionId), cwdFlag === true ? undefined : cwdFlag);
  const paths = ensureProjectDirs(cwd);
  const dsh = connect();
  const before = await fetchRow(dsh, String(sessionId));
  const baseline = turnsOf(before.row);
  const issuesPath = resolveInput(flag("issues-file", undefined), cwd, "--issues-file");
  const textFlag = flag("text", undefined);
  const text = textFlag === undefined || textFlag === true
    ? defaultInstruction(cwd, undefined, issuesPath)
    : String(textFlag);
  await sendPrompt(dsh, String(sessionId), text);
  if (has("no-wait")) { out(`DEVSESSION_ID=${String(sessionId)}`); out("DEVSTATUS=running"); process.exit(2); }
  const settled = await pollTurn(dsh, String(sessionId), baseline, num(flag("deadline-sec", undefined), DEADLINE_DEFAULT), num(flag("stall-sec", undefined), STALL_DEFAULT), paths, "debugging", false);
  const collected = await collect(dsh, String(sessionId), settled.row, paths, `send-${String(baseline)}`);
  const result = collected.lastText.includes("DEVRESULT=FAIL") ? "FAIL" : collected.lastText.includes("DEVRESULT=OK") ? "OK" : "UNKNOWN";
  emitResult({
    sessionId: String(sessionId), status: settled.state, result, turns: turnsOf(settled.row),
    toolCount: collected.tools.length, logPath: collected.logPath, text: collected.lastText,
    extra: settled.state === "stalled" ? [devHint(settled.row?.projections?.values?.permissions)] : undefined,
  });
  if (settled.state === "timeout") process.exit(2);
  if (settled.state === "stalled") process.exit(5);
  process.exit(result === "FAIL" ? 4 : 0);
}

async function wait_() {
  const sessionId = flag("session", undefined);
  if (sessionId === undefined || sessionId === true) die(3, "wait 需要 --session <id>。");
  const cwdFlag = flag("cwd", undefined);
  const { cwd } = sessionContext(String(sessionId), cwdFlag === true ? undefined : cwdFlag);
  const paths = ensureProjectDirs(cwd);
  const dsh = connect();
  const { row } = await fetchRow(dsh, String(sessionId));
  if (row === undefined) die(3, `session/list 里找不到会话 ${String(sessionId)}。`);
  const baseline = turnsOf(row);
  if (row?.running !== true && baseline > 0) {
    // 早退也必须给出完整契约行（否则"再 wait 一次"这条主恢复路径会读到空结果）
    const collected = await collect(dsh, String(sessionId), row, paths, `wait-${String(baseline)}`);
    const result = collected.lastText.includes("DEVRESULT=FAIL") ? "FAIL" : collected.lastText.includes("DEVRESULT=OK") ? "OK" : "UNKNOWN";
    emitResult({
      sessionId: String(sessionId), status: "done", result, turns: baseline,
      toolCount: collected.tools.length, logPath: collected.logPath, text: collected.lastText,
    });
    process.exit(result === "FAIL" ? 4 : 0);
  }
  const settled = await pollTurn(dsh, String(sessionId), baseline, num(flag("deadline-sec", undefined), DEADLINE_DEFAULT), num(flag("stall-sec", undefined), STALL_DEFAULT), paths, "waiting", false);
  const collected = await collect(dsh, String(sessionId), settled.row, paths, `wait-${String(turnsOf(settled.row))}`);
  const result = collected.lastText.includes("DEVRESULT=FAIL") ? "FAIL" : collected.lastText.includes("DEVRESULT=OK") ? "OK" : "UNKNOWN";
  emitResult({
    sessionId: String(sessionId), status: settled.state, result, turns: turnsOf(settled.row),
    toolCount: collected.tools.length, logPath: collected.logPath, text: collected.lastText,
    extra: settled.state === "stalled" ? [devHint(settled.row?.projections?.values?.permissions)] : undefined,
  });
  if (settled.state === "timeout") process.exit(2);
  if (settled.state === "stalled") process.exit(5);
  process.exit(result === "FAIL" ? 4 : 0);
}

async function read() {
  const sessionId = flag("session", undefined);
  if (sessionId === undefined || sessionId === true) die(3, "read 需要 --session <id>。");
  const cwdFlag = flag("cwd", undefined);
  const { cwd } = sessionContext(String(sessionId), cwdFlag === true ? undefined : cwdFlag);
  const paths = ensureProjectDirs(cwd);
  const dsh = connect();
  const { row } = await fetchRow(dsh, String(sessionId));
  if (row === undefined) die(3, `session/list 里找不到会话 ${String(sessionId)}。`);
  const cursor = row?.projections?.asOfSeq ?? 0;
  const page = await dsh.call("session/page", { request: { address: { kind: "session", sessionId: String(sessionId) }, throughSeq: cursor } });
  if (!page.ok) die(3, `session/page failed: ${JSON.stringify(page.error)}`);
  const events = rowsOfPage(page.value);
  const texts = events.filter((event) => event.type === "assistant/message").map(textOfAssistant).filter((text) => text.trim() !== "");
  const logPath = join(paths.logs, `read-${String(cursor)}.json`);
  try {
    writeFileSync(logPath, JSON.stringify({ sessionId: String(sessionId), label: `read-${String(cursor)}`, at: new Date().toISOString(), cursor, totalEvents: events.length, events }, null, 0), "utf8");
  } catch { /* 落盘失败不影响读取本身 */ }
  const tail = Math.max(1, num(flag("tail", undefined), 2));
  const summary = summarize(dsh, row);
  out(`DEVSESSION_ID=${String(sessionId)}`);
  out(`DEVSTATUS=${row?.running === true ? "running" : "idle"}`);
  out(`DEVTURNS=${summary.turns}`);
  out(`DEVPRESET=${String(summary.preset)}`);
  out(`DEVMODEL=${JSON.stringify(summary.model)}`);
  out(`DEVPERM=${JSON.stringify(summary.permissions)}`);
  out(`DEVTOKENS=${JSON.stringify(summary.tokenUsage)}`);
  out(`DEVLOG=${logPath}`);
  for (const text of texts.slice(-tail)) { out("---"); out(text.slice(0, 2500)); }
  const last = texts.at(-1);
  out(`DEVRESULT=${last?.includes("DEVRESULT=FAIL") === true ? "FAIL" : last?.includes("DEVRESULT=OK") === true ? "OK" : "UNKNOWN"}`);
  if (row?.running === true) out("(会话还在跑：可以再跑一次 wait 继续等)");
  process.exit(0);
}

async function list_() {
  const registry = readRegistry();
  const entries = Object.values(registry.sessions ?? {});
  if (entries.length === 0) { out("没有记录到任何后台会话。"); process.exit(0); }
  const dsh = connect();
  const { items } = await fetchRow(dsh, "__none__");
  for (const info of entries) {
    const row = rowOf(items, info.sessionId);
    const running = row?.running === true ? "running" : "idle";
    out(`${info.sessionId}  ${running}  turns=${String(turnsOf(row))}  ${info.title ?? "(无标题)"}  cwd=${info.cwd}`);
  }
  process.exit(0);
}

const commands = {
  selfcheck: () => selfcheck(),
  preflight: () => preflight(),
  start: () => start(),
  send: () => send(),
  wait: () => wait_(),
  read: () => read(),
  list: () => list_(),
};

const run = commands[cmd];
if (run === undefined) {
  die(3, [
    `coder.mjs v${VERSION}：未知子命令 ${String(cmd ?? "")}`,
    "用法：selfcheck | preflight | start | send | wait | read | list",
  ].join("\n"));
}
try {
  await run();
} catch (error) {
  die(3, `[配置/通道错误] ${String(error?.message ?? error)}`);
}
