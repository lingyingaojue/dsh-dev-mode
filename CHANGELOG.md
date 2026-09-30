# 变更记录

本文件记录各版本的用户可见变化。安装与升级方式见 [README](README.md)。

## 1.1.1

- 发布日期：2026-09-30
- 兼容性：命令、参数、退出码含义、生成文件位置均无变化

### 修复

- 开工体检的探活命令包含反引号，在 Windows 上会被解释为转义符而无法执行；改用与 shell 无关的极简命令，并以机器可判标志 `DEVPROBE_OK=1` 判定结果，不再依赖对错误文本的匹配。
- "长时间无进展"分支不可达：卡住阈值（600 秒）大于截止时间（540 秒），退出码 `5` 与 `DEVHINT` 永不输出；阈值调整为 300 秒，确保其先于超时触发。
- 轮次结果可能取自上一轮：事件收集覆盖整段历史，当前轮未产生文本时会回退到上一轮结论，可能报出错误的成功；现仅取当前轮事件，缺失时返回 `UNKNOWN`。
- `wait` 提前返回时不输出结果行，与文档中的输出契约不符；现补齐结果、日志与汇报。
- `read` 打印的日志文件未实际写入；现按打印路径落盘。
- 项目锁在提前退出时未释放；现退出即释放。
- 地址来源在探测命中后仍显示 `default`；体检输出的地址行改为在连接之后打印。
- 自检仅比对条款标题；现每条条款同时校验正文锚点，并区分"条款未生效"与"内容被改坏"。
- `preflight` 缓存不记录版本、会采信失败结论、缓存损坏即致命；现仅采信"版本一致且上次执行成功"的缓存。
- 时区不再写死，改用本机时区；`--plan-file` 的相对路径按工程目录解析并校验存在性；超限日志截断后保持合法 JSON。

### 变更

- 人格：移除"是否请用户点击批准"的自相矛盾，现仅在运行时权限档位不是完全放开时请求一次；合并重复表述，长度由 6012 字符降至 5696 字符（-5.3%），条款未减少。

### 文档

- 统一"退出码 5 即前往点击批准"的过时表述（技能手册、README、排查手册），排查手册章节编号改为连续。
- README 补充：由桌面应用独占管理的 profile 不能用命令行安装或卸载，请在界面中操作；并注明当前主要在 Windows 实测。

## 1.1.0

### 新增

- **第 0 步「开工体检」**：开工前校验本机通道、模型可用性与流程条款是否生效；不通过时降级为在当前会话完成。
- **流程分级「快线 / 全线」**：按改动规模与验收条目数选择；两条线均保留完整的 QA 报告、复现步骤与交付验收表。
- **「交付前的验收表」**：每条验收标准需给出验证方式、结果与证据文件路径。
- **模型名自适应**：不再写死模型标识，指定模型不可用时回退到部署默认值。
- **后台会话无法启动时自动提权重开一次**：仅针对权限或沙箱类错误，不在同一权限下反复重试。
- **面向新手的六条约定**：术语替换表、先给出三个具体示例、每步只汇报三件事、交付三件套、自验清单、出错三句话。
- 新增本文件。

### 变更

- 「出问题时的出口」改为「出口表」：卡住时先读取运行时权限档位，不再预设会出现批准提示。
- 测试环节改为先列出本机实际可用的技能，不再假定某个技能存在。
- 通道地址解析加入通用候选探测，并在体检输出中标注地址来源。
- `selfcheck` 增加流程条款逐条校验、权限档位与模型可用性检查。
- README 补充新手向说明、流程分级与「改完如何验证生效」。

### 兼容性

- 命令、参数、退出码与生成文件位置不变，升级无需更改用法。
- 若本机仍在使用旧版本，`selfcheck` 以退出码 3 提示按 README 重装。

## 1.0.0

- 首个版本：开发者模式（六步流水线）。

---

## English

### 1.1.1

- Released: 2026-09-30
- Compatibility: no changes to commands, flags, exit-code semantics, or generated file locations

#### Fixed

- The step-0 probe command contained backticks, which PowerShell treats as escapes, so it could not run; replaced with a shell-neutral command and the machine-checkable marker `DEVPROBE_OK=1` instead of matching error text.
- The stalled branch was unreachable: its threshold (600s) exceeded the deadline (540s), so exit code `5` and `DEVHINT` were never emitted; the threshold is now 300s, strictly below the deadline.
- Turn results could be taken from a previous turn when the current turn produced no text, yielding a false success; collection is now scoped to the current turn and returns `UNKNOWN` when no report exists.
- `wait` returned early without the documented result lines; they are now always emitted.
- `read` printed a log path that was never written; it now writes the file.
- The project lock was not released on early exit; it is now released on exit.
- `source` still reported `default` after a successful port probe; the health check now prints the address after connecting.
- The health check compared clause headings only; each clause now also requires a body anchor, distinguishing "not in effect" from "content damaged".
- The `preflight` cache was unversioned, trusted failed runs, and failed hard on a corrupt file; it is now trusted only when the version matches and the previous run succeeded.
- The time zone is no longer hardcoded; `--plan-file` relative paths resolve against the project directory and are validated; truncated logs remain valid JSON.

#### Changed

- Persona: removed a self-contradiction about asking the user to approve; approval is requested only when the runtime permission tier is not full access. Duplicated wording consolidated (6012 → 5696 characters, -5.3%) with no rules removed.

#### Docs

- Unified the outdated "exit code 5 means waiting for approval" wording across the skill manual, README, and troubleshooting guide; troubleshooting sections renumbered.
- README: app-managed profiles cannot be installed or removed via the CLI; added a Windows-tested note.

### 1.1.0

#### Added

- **Step 0 health check**: before starting, verify the local channel, model availability, and whether the flow rules are actually in effect; degrade to the current session when it fails.
- **Flow tiers (fast lane / full lane)**: chosen by change size and acceptance-criteria count; both tiers keep full QA reports, reproduction steps, and the delivery acceptance table.
- **Pre-delivery acceptance table**: each criterion needs its verification method, result, and evidence file path.
- **Model-name adaptation**: no hardcoded model id; falls back to the deployment default when the requested one is unavailable.
- **Automatic one-shot permission escalation** when the background session cannot start (permission or sandbox errors only).
- **Six beginner-experience rules**: jargon replacement list, three concrete examples first, three-item progress reports, delivery triple, self-check list, and a three-sentence error report.
- This changelog.

#### Changed

- The failure-exit section became an **exit table**: on a stall, read the runtime permission tier first instead of assuming approval prompts will appear.
- Testing now starts by listing the skills actually available on this machine.
- Channel address resolution gained generic candidate probing, and the health check reports the address source.
- `selfcheck` now validates each flow clause and reports the permission tier and model availability.
- README updated with beginner-oriented notes, flow tiers, and "how to verify a change took effect".

#### Compatibility

- Commands, flags, exit codes, and generated file locations are unchanged; upgrading requires no usage changes.
- If an older version is still installed, `selfcheck` exits 3 and points to the reinstall steps in the README.

### 1.0.0

- Initial release: Developer Mode (six-step pipeline).
