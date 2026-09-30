# dsh-dev-mode · 开发者模式

[![release](https://img.shields.io/github/v/release/lingyingaojue/dsh-dev-mode)](https://github.com/lingyingaojue/dsh-dev-mode/releases)
[![license](https://img.shields.io/github/license/lingyingaojue/dsh-dev-mode)](LICENSE)
![DSH](https://img.shields.io/badge/DSH-0.2.0%2B-blue)

> 一个 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai) 插件：为 DSH 增加「开发者模式」预设。
> 用户用自然语言描述需求，代理自动完成**开工体检 → 写计划 → 独立评审 → 后台实现与自测 → 独立测试 → 修复 → 复测 → 交付**整条流水线。

**不写代码的用户**：直接在会话里说明想要什么即可；如果说不清，模式会先给出三个具体示例供选择，全程最多问一轮问题。

`dsh-plugin` ｜ `dsh` ｜ `deepseek-harness` ｜ `agent-preset`

---

## 概述

开发者模式面向不懂编程的普通用户：他们把需求讲清楚，代理负责把它变成**经过实际测试**的程序。

模式本身不直接写代码，而充当协调者，按固定流程驱动三类执行者：后台会话（实现与修复）、评审子代理（计划评审）、测试子代理（系统测试），并在关键节点向用户汇报进度。

## 特性

- **第 0 步开工体检**：开工前校验本机通道、模型可用性、权限档位，以及流程条款是否真正生效；任一不通过则降级为在当前会话完成，不阻塞用户。
- **流程分级**：按改动规模与验收条目数选择「快线」或「全线」；两条线都保留完整的测试报告、复现步骤与交付验收表。
- **独立评审与独立测试**：计划由评审子代理只读审查；实现完成后由测试子代理实际运行程序验证，而非只读代码推断。
- **交付验收表**：每条验收标准都需给出验证方式、结果与证据文件路径；未覆盖项必须标注原因。
- **失败出口**：每种失败都有明确下一步（通道不可用即降级、超时即继续等待、被权限拦截即提权重开），不会停在无出路的等待上。
- **可自证生效**：`selfcheck` 逐条校验真实生效的流程条款（13 个条款标题 + 12 个正文锚点），避免"改了文件但没生效"。
- **面向新手的表达约定**：术语替换表、先给示例再提问、每步只汇报三件事、交付三件套、自验清单、出错三句话。

## 工作原理

| 步骤 | 执行者 | 产物 |
| --- | --- | --- |
| **0 开工体检** | 主会话 | 通道、模型、权限档位与条款生效校验；不通过即降级 |
| **1 问清楚 + 写计划** | 主会话 | `plan.md`：用户原话、理解、需求→验收标准映射、技术方案、文件清单 |
| **2 评审计划** | 评审子代理（只读） | `review-*.md`：必须改 / 建议改 / 通过，并逐句核对用户原话 |
| **3 后台实现** | 后台极简会话（推理强度最高） | 代码、构建与自测三连（产物存在 / 能构建或启动 / 端到端跑通） |
| **4 系统测试** | 测试子代理 | `qa\qa-<轮>.md`：本轮发现、上轮回归、计划偏差、未覆盖项 |
| **5 修复** | 同一后台会话 | 逐条修复 + 重新自测 |
| **6 复测与交付** | 主会话 | 最多 3 轮复测；通过后交付可运行程序、中文说明、启动方式与自验清单 |

执行者分工：

| 角色 | 职责 | 对用户可见性 |
| --- | --- | --- |
| 主会话 | 定计划、把关、串流程、与用户沟通 | 用户的对话窗口 |
| 后台会话 | 写代码、构建、修缺陷（极简模式，仅持久 shell） | 侧栏中的独立会话，可随时查看 |
| 子代理 | 计划评审、系统测试（只读或独立运行） | 结论落盘为报告文件 |

## 环境要求

- **DSH 0.2.0 及以上**（实测于 `0.2.0-rc.1`）。
- **Node.js**：脚本仅使用内置模块与全局 `fetch`（Node 18+；实测 v24.20）。
- **本机 DSH 服务需在运行**：脚本通过本机 API 通道与其通信；认证密钥在运行时从 `$DSH_HOME/.credentials.yaml` 读取，不落盘、不硬编码。
- **实测平台**：Windows。发给后台会话的 shell 指令按系统自动生成，其它系统尚未实测。

## 安装

**方式一：从 GitHub 安装（推荐）**

```powershell
dsh plugin --profile <你的 profile 名> add github:lingyingaojue/dsh-dev-mode
```

**方式二：从本地目录安装**

```powershell
git clone https://github.com/lingyingaojue/dsh-dev-mode.git
dsh plugin --profile <你的 profile 名> add "<克隆下来的目录绝对路径>"
```

**方式三：在界面中安装**

DSH 的 **设置 → 插件 → 安装**，填入 `github:lingyingaojue/dsh-dev-mode` 或本机目录路径。

> **注意**：由桌面应用独占管理的 profile（名为 `desktop`）不能用命令行安装或卸载，会被直接拒绝；这种情况请使用界面安装。命令行方式适用于自行管理的 profile。

安装后需要**新建会话**才能看到「开发者模式」；已打开的会话保持其原有组成，这是 DSH 的设计。

**升级**：按原方式重新安装即可。**卸载**：

```powershell
dsh plugin --profile <你的 profile 名> remove dsh-dev-mode
```

## 使用

在开发者模式的会话中直接说明需求即可，例如：

> 帮我做个记账小工具，就放在这个目录里。要求：记一笔／看明细／看结余／数据关掉再打开还在／双击就能开始记账。我自己完全不懂编程，怎么做你定。

代理会自行决定技术选型，并在必要时提出**一轮**（一次问完）通俗选项式问题。随后在工程目录中生成：

```
<工程目录>/
├── （交付的程序：可双击运行的文件、中文说明书、启动脚本、桌面快捷方式）
└── .dsh-dev/            ← 过程记录，可删除，不影响程序使用
    ├── plan.md          计划（用户原话、验收标准映射、技术方案）
    ├── review-*.md      计划评审结论
    ├── qa/qa-*.md       测试报告与证据
    ├── logs/            后台会话事件流（排查用）
    ├── backup-*/        修改已有程序前的原文件备份
    └── status.json      流程进度
```

脚本在工程目录已有 `.gitignore` 时会追加一行 `.dsh-dev/`（只追加，不新建文件）。

## 命令速查

驱动后台会话的脚本位于 `skills/dev-pipeline/scripts/coder.mjs`（路径含空格时请加引号）：

| 命令 | 用途 |
| --- | --- |
| `node "<技能目录>\scripts\coder.mjs" selfcheck` | 只读体检：通道、模式名单、思考档位、模型路由、流程条款、权限档位 |
| `… preflight [--force]` | 深度自检：实际创建一个极简会话验证通道可用（结果带缓存） |
| `… start --cwd <工程目录> --plan-file <plan.md>` | 新建后台会话并把计划交给它 |
| `… send --session <id> --issues-file <报告>` | 将测试报告发回同一会话，要求逐条修复 |
| `… wait --session <id>` | 继续等待（超时后使用） |
| `… read --session <id> --tail 3` | 只读查看最近几轮汇报 |
| `… list` | 列出本机记录过的后台会话 |

退出码：`0` 完成 ｜ `2` 仍在运行（继续 `wait`，不是失败）｜ `3` 配置/认证/参数错误 ｜ `4` 后台会话自报失败 ｜ `5` 长时间无进展。

发生长时间无进展时，脚本会输出 `DEVHINT=`，按**运行时读到的权限档位**给出下一步，而不是预设「一定会出现批准提示」。

## 已知限制

- **权限由部署方决定**：默认权限可能是"需要批准"，也可能已经是完全放开；模式不预设任何默认值，按运行时实际档位处理。受限权限下后台会话可能无法启动命令（被沙箱拦截），此时脚本会自动改用完全放开权限重开一次并打印 `DEVPERMFALLBACK=1`。
- **打包成可执行文件、启动真实浏览器、写入工作目录以外的位置**这类动作可能被沙箱拦截；纯命令行、纯文件类程序通常不受影响。
- **自检脚本不保证存在**：测试阶段会先列出本机实际可用的技能；没有现成脚本时由测试子代理自行编写检查并说明覆盖范围。
- **成本与时长**：一次完整流程包含多个子代理与后台会话，程序越大耗时越长；模式会在卡住时询问用户，不会持续空转消耗。
- **模式 id 为 `dev`**：若你的 profile 中已存在同名 preset，会报 `Duplicate agent preset`，修改 `cordis.patch.yml` 中的 id 即可。
- 界面文案与提问以中文为主；用英文提问时以英文回答。

## 排错

常见问题的机制说明与处置方式见 [`skills/dev-pipeline/references/troubleshooting.md`](skills/dev-pipeline/references/troubleshooting.md)（RPC 参数、退出码、地址解析、条款生效验证）；速查版见 [`SKILL.md`](skills/dev-pipeline/SKILL.md)。

## 项目结构

```
cordis.patch.yml                     模式声明：preset 定义与 persona
package.json                         插件元数据（含 DSH bundle 声明）
CHANGELOG.md                         变更记录
LICENSE                              MIT
skills/dev-pipeline/SKILL.md         后台流水线手册（技能）
skills/dev-pipeline/references/      机制与排错参考
skills/dev-pipeline/scripts/         coder.mjs（驱动后台会话）、lib.mjs（本机 API 客户端）
```

模式组成 = DSH 标准预设的全部插件清单，只改两处：`persona` 替换为开发者模式人格；`skill-filesystem` 追加 `customSkillDirs` 挂载随插件分发的 `dev-pipeline` 技能（追加语义，不影响其它技能根）。

## 开发与发版

**修改内容**

- 只改技能或脚本：直接修改 `skills/dev-pipeline/` 下的文件，技能按会话实时读取。
- 改人格或组成：修改 `cordis.patch.yml`，随后需要**重装插件或重启应用**；已打开的会话保持原组成。

**验证改动的生效情况**

```powershell
node "<仓库>\skills\dev-pipeline\scripts\coder.mjs" selfcheck
```

`selfcheck` 会读回**真实生效**的 preset 内容并逐条校验流程条款（每个条款同时校验标题与正文锚点），失败时区分"条款未生效"（需重装或重启）与"内容被改坏"。

不重启时也可用 `dsh --profile <名> --dump-config` 验证加载器能否正确组合配置。

**发布新版本**

1. 更新 `package.json` 版本号、`CHANGELOG.md` 对应段落与 `coder.mjs` 中的 `VERSION`（三处保持一致）。
2. 提交、打标签并推送：`git tag -a vX.Y.Z -m "…"` → `git push origin main --tags`。
3. 创建发布页：`gh release create vX.Y.Z --notes-file <说明文件>`。

> 重新安装本地链接插件时可能报 `ambiguous-install`；正确做法是**先移除、再安装**（`dsh plugin remove` → `dsh plugin add`）。

## 许可

MIT © 2026 LingYingAoJue

---

## English

**dsh-dev-mode** is a [DeepSeek Harness](https://github.com/deepseek-ai) plugin that adds a "Developer Mode" agent preset. Users describe what they want in natural language; the agent then runs a fixed pipeline — **health check → plan → independent review → background implementation and self-test → independent testing → fixes → re-test → delivery** — and asks the user at most one round of plain-language questions.

**Non-technical users**: just describe what you want; if it is unclear, the mode offers three concrete examples to choose from.

### Highlights

- Step-0 health check (channel, model availability, permission tier, whether the flow clauses are actually in effect).
- Two flow tiers (fast lane / full lane); QA reports, reproduction steps, and the delivery acceptance table are never thinned.
- Independent plan review and independent, execution-based testing.
- Pre-delivery acceptance table: verification method, result, and evidence path for every criterion.
- Explicit failure exits instead of dead ends; permission handling follows the runtime tier rather than any assumed default.
- Self-verifying: `selfcheck` validates the live preset against required clauses and body anchors.

### Requirements

DSH 0.2.0+ (tested with `0.2.0-rc.1`), a running local DSH service, and Node.js 18+ (tested with v24.20). Tested on Windows; shell instructions are generated per platform, but other platforms are untested.

### Install

```powershell
dsh plugin --profile <profile> add github:lingyingaojue/dsh-dev-mode
```

Profiles managed by the desktop application cannot be installed or removed from the CLI; use the in-app plugin settings instead. A **new** session is required before the preset appears.

### License

MIT © 2026 LingYingAoJue
