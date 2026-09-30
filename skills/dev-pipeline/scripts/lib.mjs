// DSH 本机 /api 客户端：铸造 GUI 用的 browser-session cookie，然后说 Typert RPC。
//
// 认证说明：Web 端每个 /api 请求都要一个由 ~/.dsh/.credentials.yaml 里 HMAC 密钥签名的
// cookie。本模块在运行时读那个本机密钥，绝不硬编码。这只适用于"本机、单用户"的 DSH
// 部署，等价于复用浏览器标签页已有的信任；不要拿它去打不属于你的实例。
//
// 地址解析：显式参数 → $DSH_WEB_URL → 默认地址。默认地址不通时，会按常见端口各试一次
// （只在真的失败之后才试，平时不花时间），所以部署换了端口也不会当场卡死。
import { createHmac, createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const base64url = (buf) => buf.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

/** 没给地址、也没有环境变量时用的默认地址（DSH 的常规默认）。 */
export const DEFAULT_BASE_URL = "http://127.0.0.1:3080";

/** 默认地址不通时依次试的常见端口；只是候选，不代表"正确答案"。 */
export const PROBE_PORTS = [3080, 3000, 4173, 5173, 8000, 8080, 8888];

const PROBE_TIMEOUT_MS = 400;

/** DSH home 目录；优先 $DSH_HOME。 */
export function dshHome() {
  return process.env.DSH_HOME ?? join(homedir(), ".dsh");
}

/** 读出 browser-session 的签名密钥，按它存储的 32 个原始字节返回。 */
export function browserSecret(home = dshHome()) {
  const yaml = readFileSync(join(home, ".credentials.yaml"), "utf8");
  const text = /^\s*secret:\s*(\S+)\s*$/m.exec(yaml)?.[1];
  if (text === undefined) throw new Error("no client-connection/browser-session secret in .credentials.yaml");
  const bytes = Buffer.from(text.replaceAll("-", "+").replaceAll("_", "/"), "base64");
  if (bytes.byteLength !== 32) throw new Error(`browser-session secret is ${String(bytes.byteLength)} bytes, expected 32`);
  return bytes;
}

/** 铸造绑定 authority 的 cookie。 */
export function sessionCookie(authority, secret, maxAgeDays = 30) {
  const name = "dsh-auth-" + base64url(createHash("sha256").update(authority).digest());
  const issuedAt = Date.now();
  const payload = base64url(Buffer.from(JSON.stringify({
    version: 1,
    authority,
    issuedAt,
    expiresAt: issuedAt + maxAgeDays * 24 * 60 * 60 * 1000,
  }), "utf8"));
  return `${name}=v1.${payload}.${base64url(createHmac("sha256", secret).update(payload).digest())}`;
}

/**
 * 连接本机正在运行的 `dsh web`。
 *
 * 地址来源（`source`）：`argument` 显式传入 ｜ `DSH_WEB_URL` 环境变量 ｜ `default` 兜底 ｜
 * `probe` 兜底地址不通后探测到的。只有前两种之外的兜底地址才可能在失败后触发探测。
 *
 * @param options.baseUrl - Web 应用地址
 * @param options.home - DSH home 目录（存放凭据）
 */
export function connect(options = {}) {
  const fromEnv = options.baseUrl === undefined && process.env.DSH_WEB_URL !== undefined;
  const fixed = options.baseUrl !== undefined || fromEnv;
  const home = options.home ?? dshHome();
  // source 会随探测结果变化：探测命中后就是 "probe"，报错信息才不会说谎
  let source = options.baseUrl !== undefined ? "argument" : fromEnv ? "DSH_WEB_URL" : "default";

  let baseUrl = options.baseUrl ?? process.env.DSH_WEB_URL ?? DEFAULT_BASE_URL;
  let authority = new URL(baseUrl).host;
  let cookie = sessionCookie(authority, browserSecret(home));
  /** 探测过的候选地址（给报错信息用）。 */
  const tried = [];

  function use(next, nextSource) {
    baseUrl = next;
    authority = new URL(next).host;
    cookie = sessionCookie(authority, browserSecret(home));
    if (nextSource !== undefined) source = nextSource;
  }

  /**
   * 调一个 Remote 端点。
   * @param endpoint - namespace/method，例如 "session/create"
   * @param args - 精确 wire 参数；多一个或少一个字段都会被网关拒
   * @returns `{ status, ok, value, error }`
   */
  async function call(endpoint, args, signal) {
    let response;
    try {
      response = await fetch(`${baseUrl}/api/${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json", host: authority, cookie },
        body: JSON.stringify({ type: "client-request", rpcId: randomUUID(), method: endpoint, payload: { args } }),
        signal,
      });
    } catch (error) {
      return { status: 0, ok: false, error: { code: "unreachable", message: String(error?.message ?? error) } };
    }
    const text = await response.text();
    let message;
    try { message = JSON.parse(text); } catch { return { status: response.status, ok: false, error: { code: "transport", message: text.slice(0, 400) } }; }
    const result = message?.result ?? {};
    return { status: response.status, ok: result.ok === true, value: result.value, error: result.error };
  }

  /** 用当前地址探一次活；命中返回 true。 */
  async function reachable() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const out = await call("agentPresets/list", {}, controller.signal);
      return out.ok === true;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 连不上时按常见端口找一遍（只在失败后调用，最多试 PROBE_PORTS 个）。
   * @returns 找到可用地址返回 true；否则回到兜底地址并返回 false。
   */
  async function discover() {
    if (fixed) return false;
    const back = baseUrl;
    for (const port of PROBE_PORTS) {
      const candidate = `http://127.0.0.1:${port}`;
      if (candidate === baseUrl || tried.includes(candidate)) continue;
      tried.push(candidate);
      use(candidate);
      if (await reachable()) { source = "probe"; return true; }
    }
    use(back, source);
    return false;
  }

  /** 调一个端点；连接类失败时先探测一次候选地址再重试同一条请求。 */
  async function callAuto(endpoint, args) {
    const out = await call(endpoint, args);
    if (out.ok) return out;
    const unreachable = out.status === 0 || out.error?.code === "unreachable" || out.error?.code === "transport";
    if (!unreachable) return out;
    if (!(await discover())) return out;
    return call(endpoint, args);
  }

  /** 调一个端点并在被拒时抛错。 */
  async function callOk(endpoint, args) {
    const out = await callAuto(endpoint, args);
    if (!out.ok) throw new Error(`${endpoint} failed: ${JSON.stringify(out.error)}`);
    return out.value;
  }

  /** 侧栏行。 */
  const listSessions = () => callOk("session/list", { _request: {} }).then((value) => value.items ?? []);

  /** 按 id 取一行侧栏行。 */
  const findSession = (sessionId) => listSessions().then((items) => items.find((item) => item.sessionId === sessionId));

  return {
    get baseUrl() { return baseUrl; },
    get authority() { return authority; },
    get cookie() { return cookie; },
    get source() { return source; },
    tried,
    candidates: PROBE_PORTS.map((port) => `http://127.0.0.1:${port}`),
    home,
    call: callAuto,
    callRaw: call,
    callOk,
    listSessions,
    findSession,
  };
}
