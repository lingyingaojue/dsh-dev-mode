# dsh-dev-mode · 开发者模式

[![release](https://img.shields.io/github/v/release/lingyingaojue/dsh-dev-mode)](https://github.com/lingyingaojue/dsh-dev-mode/releases)
[![license](https://img.shields.io/github/license/lingyingaojue/dsh-dev-mode)](LICENSE)
![DSH](https://img.shields.io/badge/DSH-0.2.2%2B-blue)

> 一个 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai) 插件：为 DSH 增加「开发者模式」。
> 不懂编程的用户用几句话讲需求，代理按**接单分级 → 环境选型 → 规格计划 → 垂直切片 → 分批实现 → 独立验收 → 打包交付**七个阶段推进，
> 交付**真跑过、数据安全、带中文说明**的程序；小事走快线，大事走全线。

`dsh-plugin` ｜ `dsh` ｜ `deepseek-harness` ｜ `agent-preset` ｜ `subagent`

---

## 30 秒上手

1. 安装插件（见下方「安装」），**新建会话**，在模式列表选「开发者模式」。
2. 直接说你要什么，例如：

   > 帮我做个记账小工具，就放在当前目录。要求：记一笔／看明细／看结余／关掉再打开数据还在／双击就能开始用。我自己完全不懂编程，怎么做你定。

3. 代理最多问你一轮（通常一个问题都不用答），然后自己选做法、写计划、派后台执行器写代码、独立测试、打包，最后交给你成品、中文说明和自检清单。

设置里会看到「开发者模式·执行器」。它是自动调用的后台角色，**不用手动选**。

## 你会拿到什么

- 一个**能直接打开/运行**的成品（Windows 桌面程序、命令行工具或本地网页，按你的机器和需求选）。
- 一份**中文使用说明**：怎么打开、怎么用、数据存在哪、怎么备份/恢复、怎么卸载。
- 一张**验收表**：每条验收标准怎么验的、结果、证据路径；没验到的会明确写 `BLOCKED`，不糊弄。
- 一份**自验清单**：3–5 步「点哪里 → 看到什么」，你自己点一遍就能确认没被忽悠。
- 过程记录在工程目录的 `.dsh-dev/`，可删，不影响程序使用。

## 它是怎么工作的

模式由两个预设和一份技能组成：

| 角色 | 预设 | 职责 |
| --- | --- | --- |
| 协调者 | `dev` | 问清楚、定范围与验收、选型、派活、把关、独立复核、打包、交付、跟用户说话 |
| 执行器 | `dev-worker` | 按任务单写代码、构建、自测、写报告；不面向用户，不派子代理 |
| 流水线手册 | `dev-pipeline` 技能 | 七阶段 SOP、任务单模板、工件契约、质量门、失败出口 |

协调者通过 DSH **原生子代理**（`subagent`）把实现和测试交给执行器；通过 `subagent_fork` 在 L2 做计划评审。
执行器启动后，协调者结束本轮、等完成通知，**不轮询、不空转**；用户叫停时用 `interrupt_agent` 停止。
整个过程不需要本地 HTTP、cookie、端口或额外脚本——这是 v2 与 v1 最大的区别。

## 七个阶段

| 阶段 | 做什么 | 关卡 |
| --- | --- | --- |
| 0 接单分级 | 复述需求；最多一轮提问；定 L0/L1/L2 | G0 需求可懂 |
| 1 环境选型 | 检查工作目录/运行时/打包工具；读现有工程；改旧程序先备份；选技术栈 | G1 环境可行 |
| 2 规格计划 | MVP/非目标/验收标准/技术方案/文件清单/命令/风险回退；L2 独立评审 | G2 验收可判定 |
| 3 垂直切片 | 最小端到端：能启动 + 一个核心动作 + 数据能存能读 | G3 切片跑通 |
| 4 分批实现 | 小步实现、每批自测；协调者独立跑构建/自测并核对 diff | G4 功能齐全 |
| 5 独立验收 | 新测试员只读、真跑、逐条给证据；失败回传同一执行器；回归上一轮 | G5 验收通过 |
| 6 打包交付 | 最终产物、安装到最终位置、干净启动、快捷方式、中文说明、验收表 | G6 交付可用 |

**三个档位**：

- **L0 快修**：单文件、无新依赖、不改数据结构，≤3 条验收标准。协调者直接改，跑冒烟检查，不写完整计划、不派 QA。
- **L1 标准**（默认）：新小型程序或中等改动。简版计划 + 执行器实现 + 独立测试员；修复上限 2 轮。
- **L2 完整**：多文件、有数据、要打包、改现有程序、接外部依赖。完整计划 + 独立评审 + 垂直切片 + 干净环境安装测试；修复上限 3 轮。

## 交付硬标准

1. 从最终位置/最终产物能启动，不依赖开发命令。
2. 所有验收标准有「怎么验 + 结果 + 证据」，PASS 必须真跑过。
3. 有数据时证明「关掉再打开数据还在」，并给备份/恢复办法。
4. L1/L2 必须有独立测试员，不许只读代码推断。
5. 中文说明能让不懂编程的人照做；交付前协调者自己按说明走一遍。
6. 未验证/做不到的写 `BLOCKED` 及原因，不假装通过。

## 环境要求

- **DSH 0.2.2 及以上**（实测 `0.2.2-rc.3`）。
- 插件本身**不需要** Node/Python/.NET；它只用 DSH 原生工具。
- 生成的程序按你的机器选型：有 Python 3.10+ 时默认 Python 桌面（tkinter + SQLite + PyInstaller）；没有 Python 但有 Node 时用 Node/命令行/网页方案；都没有时会先告诉你需要装什么，不会硬撑。
- 当前主要在 **Windows 10/11** 实测；其它系统的 shell 行按平台生成，但未实测。

## 安装

**方式一：界面安装（推荐，桌面版）**

DSH 的 **设置 → 插件 → 安装**，填入 `github:lingyingaojue/dsh-dev-mode` 或本机目录路径。

**方式二：命令行（仅限自行管理的 profile）**

```powershell
dsh plugin --profile <你的 profile 名> add github:lingyingaojue/dsh-dev-mode
```

> 由桌面应用独占管理的 profile（名为 `desktop`）不能用命令行安装/卸载，会被直接拒绝；请使用界面安装。

安装后需要**新建会话**才能看到「开发者模式」；已打开的会话保持原有组成，这是 DSH 的设计。

**升级到 v2**：按原方式重新安装（本地目录安装建议先移除再安装，避免 `ambiguous-install`）。已有会话保持旧组成，新会话生效。

**卸载**：

```powershell
dsh plugin --profile <你的 profile 名> remove dsh-dev-mode
```

## 使用建议

- 说清「给谁用、做到什么算成功、数据重要不重要」就够了；技术选择交给代理。
- 有旧程序要改：直接说「把 <程序> 改成 <要求>」；它会先备份再改，改完做回归。
- 需求很大（登录、支付、多端同步）：它会先做最小可用的一块，等你确认再分阶段，不会闷头做半个系统。
- 你在等待期间发的消息会作为追加要求处理；说「算了别做了」会停止后台执行器并保留进度。

## 生成的目录

```
<工程目录>/
├─ 程序/<名称>/                ← 新建项目；改旧程序则原地改
│  ├─ 源码、构建脚本、README.md、AGENTS.md、dist/…
│  └─ （Python 桌面）core.py / ui.py / app.py / build.ps1 / 启动.bat
└─ .dsh-dev/                   ← 过程记录，可删，不影响程序使用
   ├─ plan.md                  计划（用户原话、验收标准、技术方案、命令、风险）
   ├─ status.md                阶段/迭代/子代理/下一步/证据
   ├─ review-1.md              计划评审（仅 L2）
   ├─ reports/build-N.md       每轮执行器报告
   ├─ qa/qa-N.md               每轮独立测试报告
   ├─ qa/evidence/             日志、截图、命令输出
   ├─ delivery.md              交付说明 + 验收表
   └─ backup-<时间戳>/          改已有程序前的备份
```

## 数据安全

- 生成的程序默认把数据放在 `%LOCALAPPDATA%\<应用名>`，不写 Program Files；便携/绿色版可以放在程序目录的 `data/`，但打包时必须排除数据目录，并在手册里说明「升级覆盖会保留/覆盖什么」；测试用 `APP_DATA_DIR` 等环境变量覆盖。
- 启动自动备份、保留最近 10 份；改数据结构前先备份、用副本测试迁移。
- 卸载只删程序文件，默认保留数据；手册里写清恢复步骤。
- 代理不会删除你的数据；说「删掉」时只删它自己创建的程序文件。

## 已知限制

- **权限由部署方决定**：受限权限下后台执行器可能无法启动命令或写工作目录以外的位置；模式会说明并给选项，不会自动提权。
- **未签名 exe 会触发 SmartScreen**：手册里会写「更多信息 → 仍要运行」；这是签名证书问题，不是病毒。
- **GUI 自动化有限**：测试员能跑自测、检查进程/窗口、截图；复杂的鼠标点击可能需要人工按自检清单确认，报告会标 `BLOCKED`。
- **大系统不一次做完**：登录/支付/服务器类需求会先做最小可用版本，再分阶段。
- **视觉细节**：插件详情页的渲染、非 Windows 平台未实测；交付报告会如实标注。
- **模式 id 冲突**：`dev` / `dev-worker` 若与你的 profile 中已有预设同名，会报 `Duplicate agent preset`，可改 `cordis.patch.yml` 中的 id。

## 排错

先看：

1. **设置 → 插件** 或模式列表里有没有「开发者模式」和「开发者模式·执行器」。
2. 是否**新建**了会话（旧会话不会自动换组成）。
3. `.dsh-dev/status.md`、`qa/`、`reports/` 里的进度与报错。

详细的分岔与处置见 [`skills/dev-pipeline/references/troubleshooting.md`](skills/dev-pipeline/references/troubleshooting.md)。

## 维护者：验证改动真的生效

1. 重装插件后，`plugin_manager` 的 `list_plugins` 里 `preset-dev`、`preset-dev-worker` 都应为 `fiberPhase=active`；`list_bundles` 版本为 2.0.0。
2. `agentPresets/list` 应同时出现 `dev`（新描述）与 `dev-worker`；`standard` 仍是默认。
3. 新建「开发者模式」会话，说一句「用一句话说明你开工第一件事做什么」；应提到加载 `dev-pipeline` 技能、检查环境。
4. 跑一次端到端：让它做一个带 `--selftest` 的小工具，检查 `.dsh-dev/` 下计划、执行报告、QA 报告、`delivery.md` 是否齐全，`QARESULT` 是否为 PASS。
5. 安全检查：仓库里不应再有 `coder.mjs`、`lib.mjs`、`selfcheck`、`DEVPERM`、退出码 2/5 等旧运行时内容。

### 维护者：同步 standard 预设

`preset-dev` 以 DSH 安装目录的 `@deepseek-ai/dsh-web-app/presets/standard.patch.yml` 为基线（**逐行复制**，只改 persona、skill-filesystem、tool-subagent-control、tool-subagent 四处）。DSH 升级后：

1. 读新版本的 `standard.patch.yml`。
2. 对照 `cordis.patch.yml` 的 `preset-dev`：补新增行、删已移除行、改字段名。
3. 重装插件，新建会话验证；不要凭旧版本字段写配置。

## 项目结构

```
cordis.patch.yml                     预设声明（preset-dev + preset-dev-worker）
package.json                         插件元数据（含 DSH bundle 声明、兼容范围、显示资源）
CHANGELOG.md                         变更记录
README.md                            本文件
LICENSE                              MIT
docs/DETAIL.md                       插件详情页说明
locale/{zh,en}.json                  插件显示文案
icon.svg                             插件图标
skills/dev-pipeline/SKILL.md         七阶段手册（技能）
skills/dev-pipeline/references/      详细 SOP、选型、工件、排错
skills/dev-pipeline/templates/       工件模板 + Python 桌面/本地网页起步模板
```

## 开发与发版

- 只改技能/模板：修改 `skills/dev-pipeline/` 后，新会话即读取新内容（技能按需加载）。
- 改人格/预设：修改 `cordis.patch.yml`，**重装插件**后新会话生效；旧会话保持原组成。
- 版本号三处一致：`package.json`、`CHANGELOG.md` 顶部、git tag。
- 发布：`git tag -a vX.Y.Z -m "…"` → `git push origin main --tags` → `gh release create vX.Y.Z --notes-file <说明>`。

> 本地链接安装重装时可能报 `ambiguous-install`；正确做法是**先移除、再安装**（`plugin_manager` 的 `remove_bundle` → `install_bundle`）。

## 许可

MIT © 2026 LingYingAoJue

---

## English

**dsh-dev-mode** adds a "Developer Mode" agent preset to [DeepSeek Harness](https://github.com/deepseek-ai). Users describe what they want in plain language; the agent runs a seven-stage pipeline — **intake → recon & stack choice → spec & plan → vertical slice → incremental build → independent acceptance → packaging & delivery** — and delivers a program that was actually run, with data safety, a Chinese manual, and an acceptance table.

v2 uses DSH-native subagents: a coordinator preset (`dev`) delegates implementation and testing to a lean executor preset (`dev-worker`) via `subagent`, with completion notices and `interrupt_agent` instead of local HTTP, cookies, ports, or scripts. Three lanes (quick fix / standard / full) keep small tasks fast while preserving independent testing, packaging, and clean-state acceptance for real projects.

Requires DSH 0.2.2+ (tested with 0.2.2-rc.3). The plugin itself needs no extra runtime; generated programs are chosen from what the machine actually has. Windows is the tested platform.

Install via **Settings → Plugins → Install** with `github:lingyingaojue/dsh-dev-mode`, or `dsh plugin --profile <profile> add …` for non-desktop profiles. A new session is required.

MIT © 2026 LingYingAoJue
