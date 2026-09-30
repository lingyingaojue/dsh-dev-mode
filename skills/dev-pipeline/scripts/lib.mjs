// DSH 本机 /api 客户端：铸造 GUI 用的 browser-session cookie，然后说 Typert RPC。
//
// 认证说明：Web 端每个 /api 请求都要一个由 ~/.dsh/.credentials.yaml 里 HMAC 密钥签名的
// cookie。本模块在运行时读那个本机密钥，绝不硬编码。这只适用于"本机、单用户"的 DSH
// 部署，等价于复用浏览器标签页已有的信任；不要拿它去打不属于你的实例。
import { createHmac, createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const base64url = (buf) => buf.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

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
 * @param options.baseUrl - Web 应用地址；默认 $DSH_WEB_URL，再默认 http://127.0.0.1:3080
 * @param options.home - DSH home 目录（存放凭据）
 */
export function connect(options = {}) {
  const baseUrl = options.baseUrl ?? process.env.DSH_WEB_URL ?? "http://127.0.0.1:3080";
  const authority = new URL(baseUrl).host;
  const home = options.home ?? dshHome();
  const cookie = sessionCookie(authority, browserSecret(home));

  /**
   * 调一个 Remote 端点。
   * @param endpoint - namespace/method，例如 "session/create"
   * @param args - 精确 wire 参数；多一个或少一个字段都会被网关拒
   * @returns `{ status, ok, value, error }`
   */
  async function call(endpoint, args) {
    let response;
    try {
      response = await fetch(`${baseUrl}/api/${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json", host: authority, cookie },
        body: JSON.stringify({ type: "client-request", rpcId: randomUUID(), method: endpoint, payload: { args } }),
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

  /** 调一个端点并在被拒时抛错。 */
  async function callOk(endpoint, args) {
    const out = await call(endpoint, args);
    if (!out.ok) throw new Error(`${endpoint} failed: ${JSON.stringify(out.error)}`);
    return out.value;
  }

  /** 侧栏行。 */
  const listSessions = () => callOk("session/list", { _request: {} }).then((value) => value.items ?? []);

  /** 按 id 取一行侧栏行。 */
  const findSession = (sessionId) => listSessions().then((items) => items.find((item) => item.sessionId === sessionId));

  return { baseUrl, authority, home, cookie, call, callOk, listSessions, findSession };
}
