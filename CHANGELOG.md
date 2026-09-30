# 变更记录

## 1.1.1

### 修复
- 开工体检的"探活"命令在 Windows 上必错：改为不含转义字符的极简命令，并要求后台回一行机器可判的 `DEVPROBE_OK=1`，不再靠猜文字判断是否被权限挡住。
- "卡住"永远触发不了：卡住阈值原本比截止时间还长，导致 `退出码 5` 与 `DEVHINT=` 成了死代码；现改为阈值严格小于截止时间。
- "继续等"这条命令提前退出时不打印结果行，违反自己写的输出契约；现在照常给出结果、日志与汇报。
- "看最近几轮"打印的日志文件其实从未落盘：现在真的写。
- 结果判定可能取到**上一轮**的文字从而报出假的成功：现在只取本轮事件，取不到本轮文字就报 `UNKNOWN`。
- 锁在退出时从不释放（提前退出跳过了收尾步骤）：现在退出即释放。
- 人格自相矛盾：一处禁止让用户点批准、另一处又让用户去点批准；现在只在"权限档位不是完全放开"这一种情形下才请用户点一次。
- 地址来源在探测命中后仍显示 `default`；体检输出的地址行改到连接之后打印。
- 自检只看标题：现在每个条款再验一个正文锚点，失败提示也区分"没生效"与"内容被改坏"。
- `preflight` 缓存不带版本、会采信失败结论、坏缓存直接报错：现在只采信"版本一致且上次成功"的缓存。
- 排查手册与技能手册里"退出码 5 就去点批准"的旧说法统一为新口径；排查手册章节编号改为连续。
- 时区不再写死：改用本机时区。
- `--plan-file` 的相对路径改为按工程目录解析，并校验文件存在。
- 超限日志截断后保持合法 JSON（原来会写出坏文件）。
- README 补：桌面应用独占的配置不能用命令行装/卸，请用界面安装；并注明目前主要在 Windows 实测。

### 兼容性
- 命令、参数、退出码含义、生成文件位置不变。

## 1.1.0

### 新增

- **开工体检（第 0 步）**：开工前先验「通道通不通、模型名可不可用、新条款有没有生效」，不通就当场改成本会话自己做，不让用户白等。
- **流程分级：快线 / 全线**：小事快办、大事走全流程；验收、复现步骤、交付验收表一条都不省。
- **交付前的验收表**：每条验收标准都要有「怎么验的、结果、证据文件路径」，没验到的必须写清原因。
- **模型名自适应**：不再写死某个模型名；指定的模型在本机不可用时自动改用本机默认模型。
- **后台窗口起不来时自动提权重开一次**：遇到权限/沙箱类错误不再原地重试。
- **小白体验六条**：术语禁词与白话对照、说不清就先给三个例子、每次只说三件事、交付三件套、给你一份自验清单、出错只说三句话。
- `CHANGELOG.md`（本文件）。

### 修改

- 「出问题时的出口」改成**出口表**：卡住时先读运行时权限档位再分岔，不再预设「会被拦住、要去点批准」。
- 测试环节改成「先列出本机实际可用的技能」，不再假定某个技能存在。
- 通道地址解析加入通用候选探测，并在体检输出里标明地址来源。
- `selfcheck` 增加条款校验（逐条打印 `CHECK=…OK/MISSING`）与权限档位、模型可用性检查。
- README 补充小白向说明、流程分级与「改完怎么验证生效」。

### 兼容性

- 命令、参数、退出码、生成文件位置全部不变，老用户升级无需改用法。
- 新增自检项：若本机仍在用旧版本，`selfcheck` 会以退出码 3 提示按 README 重装本插件。

## 1.0.0

- 首个版本：开发者模式（六步流水线）。

---

## English

（英文版；为与中文版保持一致，版本标题同级。）

## 1.1.1

### Fixed
- The step-0 probe command was broken on Windows; it now uses a plain command and requires the machine-checkable marker `DEVPROBE_OK=1` instead of guessing from error text.
- The "stalled" state could never fire (its threshold exceeded the deadline), so `exit 5` and `DEVHINT=` were dead code; the threshold is now strictly below the deadline.
- `wait` no longer exits early without the documented result lines.
- `read` now actually writes the log file it prints.
- Turn results are taken from the current turn only; a missing turn report yields `UNKNOWN` instead of a stale OK.
- The project lock is now released on exit.
- Persona contradiction resolved: asking the user to approve is now allowed only when the runtime permission tier is not full access.
- Address `source` now updates after probing; the health check prints the address after connecting.
- Self-check verifies a body anchor per clause and distinguishes "not in effect" from "content damaged".
- `preflight` cache is versioned and only trusted when the previous run succeeded.
- Stale "exit 5 means waiting for approval" wording unified; docs renumbered; no hardcoded time zone; `--plan-file` resolved against the project directory and validated; truncated logs stay valid JSON.

## 1.1.0

### Added

- **Step 0 health check**: before starting, verify the local channel, model availability, and whether the updated flow rules are actually in effect; degrade to doing the work in the current session instead of waiting.
- **Flow tiers: fast lane / full lane** — small jobs skip the heavy path, but QA reports, reproduction steps, and the delivery acceptance table are never thinned.
- **Pre-delivery acceptance table**: every acceptance criterion needs "how it was verified, the result, and the evidence file path".
- **Model-name adaptation**: no hardcoded model id; falls back to the deployment default when the requested one is unavailable.
- **Automatic one-shot permission escalation** when the background session cannot start (permission/sandbox errors).
- **Six beginner-experience rules**: banned-jargon list, give three concrete examples first, report exactly three things, delivery triple, self-check list, and a three-sentence error report.
- `CHANGELOG.md`.

### Changed

- The failure-exit section became an **exit table**: on a stall, read the runtime permission tier first instead of assuming approval prompts will appear.
- Testing now starts by listing the skills actually available on this machine.
- Channel address resolution gained generic candidate probing, and the health check reports where the address came from.
- `selfcheck` now validates the flow clauses (`CHECK=…OK/MISSING`) plus permission tier and model availability.
- README updated with beginner-oriented notes, flow tiers, and "how to verify a change took effect".

### Compatibility

- Commands, flags, exit codes, and generated file locations are unchanged; upgrading requires no usage changes.
- New self-check: if an older version of this plugin is still in use, `selfcheck` exits 3 and points to the reinstall steps in the README.
