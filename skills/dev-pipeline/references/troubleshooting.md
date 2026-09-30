# 疑难排查（dev-pipeline）

SKILL.md 里那张表是快查版；这里是把机制讲透的版本，只有在快查版不够用时才读。

## 1. 认证与端口

- 通道：`POST http://127.0.0.1:3080/api/<namespace>/<method>`，请求体是 Connection RPC 信封
  `{ type:"client-request", rpcId, method, payload:{ args } }`；**业务失败也返回 HTTP 200**，必须看 `result.ok`。
- 认证：cookie 名 `dsh-auth-` + `base64url(sha256(authority))`，值 `v1.<payload>.<hmac>`，签名密钥在
  `~\.dsh\.credentials.yaml` 的 `records.client-connection/browser-session.payload.secret`，
  **base64url 文本解码出的 32 字节**才是 HMAC key（直接拿文本当 key 会 401）。`scripts\lib.mjs` 已经封装好。
- 端口不要写死：脚本优先读 `$DSH_WEB_URL`，其次 `http://127.0.0.1:3080`；cookie 的 authority 必须与之完全一致。
- 请求不能带 `Origin`，也不能带 `sec-fetch-site: cross-site`（有个信任围栏）；Node 的 fetch 从本机发天然满足。

## 2. 脚本行为与退出码

| 退出码 | 含义 | 下一步 |
| --- | --- | --- |
| 0 | 这一轮做完了，`DEVRESULT` 看结果 | 进 QA |
| 2 | 到了 `--deadline-sec` 还在跑 | 再 `wait --session <id>`，可无限续；**不是失败** |
| 3 | 配置/认证/参数错（stderr 有原因） | 按原因修；连不上就降级为本会话自己实现 |
| 4 | 后台会话自报 `DEVRESULT=FAIL` | 读 `DEVLOG` 末尾，补依赖/改计划后 `send` |
| 5 | 超过 `--stall-sec` 没动静 | 多半在等批准：提示用户点开那个会话 |

为什么是 540 秒：前台命令最长 600 秒就会被转成后台作业（不是被杀），留 60 秒余量让脚本自己收尾并打印结果。
后台会话本身跑在 DSH 服务端，与本地脚本进程无关，所以脚本中断不丢进度。

## 3. RPC 参数（多一个字段都会被拒）

```
session/create        { request: { cwd | workspaceId, sessionId?, agentPreset? } }   # cwd 与 workspaceId 互斥
session/selectModel   { request: { sessionId, provider, model, reasoningEffort? } } # deepseek-official / deepseek-flash / off|low|high|max
commands/execute      { agentId, line: "/permission <预设>", submittedAttachments: [] }
session/prompt        { request: { requestId, sessionId, mode: "queue"|"steer", content:[{type:"text",text}], clientTimeZone } }
session/list          { _request: {} }                                              # rows: running / updatedAt / projections.values.{agentPreset,permissions,modelSelection,sessionStats,turns,tokenUsage} / projections.asOfSeq
session/page          { request: { address:{kind:"session",sessionId}, throughSeq } } # throughSeq 必须 ≤ projections.asOfSeq，超了会报错并告诉你当前游标
workspace/archiveSession { request: { sessionId, stopActivity } }                    # stopActivity:true 会中断正在跑的轮次
agentPresets/list     {} ;  agentPresets/read { agentPreset }
session/modelCatalog  {}
```

## 4. 几个会咬人的硬约束

1. **模式只在空白会话可改**：跑过第一轮后就锁死，所以后台会话必须在 `session/create` 时就带 `agentPreset: "minimal"`。
2. **极简会话没有文件工具**：只有持久 pwsh。它靠 PowerShell 落盘，所以发给它的指令必须内联**绝对路径**。
3. **极简会话的 persona 没有运行时上下文**（`includeRuntimeContext: false`）：它不知道自己的 cwd，别指望它自己去猜。
4. **`customSkillDirs` 是追加语义**：本技能挂在 dev 模式自己的 preset 上，不影响其它模式的技能目录。
5. 每次新建会话都会出现在用户侧栏里（**不会自动切过去**），这是设计如此。

## 5. 尚未实测、遇到时按这里兜底

| 项 | 兜底做法 |
| --- | --- |
| 极简会话的真实联网/装包能力 | 依赖统一由开发者模式会话先装好，并把确切构建命令写进 plan.md |
| `coder.mjs wait` 在会话被删除后 | `session/list` 找不到会退 3 并说明；此时只能重新 `start` |
| 权限命令与首条消息的竞态 | 默认不发 `/permission`；需要时由使用者显式 `--permission <档位>` |
| 后台会话等批准导致长时间无动静 | 退 5 + 提示用户点开会话；不要反复重试 |

## 6. 实测记录：minimal 会话在 workspace-write 沙箱下能做什么（2026-09-30 冒烟）

一次真实冒烟（计划：写一个显示问候语和动态时间的单文件网页）的结果：

- 建会话 → `minimal` → `reasoningEffort: max` → 发指令 → 自测完成，**一轮**结束、28 次 `pwsh` 调用、`DEVRESULT=OK`。
  用量参考：未缓存输入 11.3k、输出 44k、缓存读 708k token（缓存读便宜，但不是免费）。
- **沙箱边界（重要）**：该会话继承 `workspace-write` + `ask`。在这种沙箱下，
  **派生外部浏览器进程会失败**（Edge 无头模式因 Mojo 命名管道"拒绝访问"崩溃），`Start-Process`／WMI／计划任务也会被拒；
  而 `pwsh` 直接跑命令、读写工程目录内的文件都正常。
  那次冒烟里，后台会话自己改用进程内的 MSHTML 引擎完成了 DOM 与时钟验证——可接受的兜底，但不等于真浏览器验证。
- 结论：测试需要真浏览器、命名管道或写工作目录以外的位置时，**不要用同一个受限权限反复重试**：
  把确切命令写进 plan.md，用 `coder.mjs start --permission danger-full-access` 重开一次（先跟用户说明一句"要放开一点权限"）。
  反过来，纯命令行、纯文件类的项目用默认权限就够，没必要提权。

