# dsh-dev-mode · 开发者模式

> 一个 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai) 插件：给 DSH 加一个「开发者模式」。
> 新手用几句大白话讲想要什么，AI 自己走完 **写计划 → 审计划 → 后台写代码并编译 → 系统测试 → 修 bug → 复测 → 交付** 全流程。

**你不需要懂编程，也不需要懂 AI —— 把想要的东西用大白话讲出来就行。** 说不清也没关系：它会先给你三个具体例子让你挑，像点菜一样。

`dsh-plugin` ｜ `dsh` ｜ `deepseek-harness` ｜ `agent-preset`

---

## 它解决什么问题

普通人想做个小工具，卡住的从来不是"不会写代码"，而是：

- 不知道怎么把一句模糊的需求讲成可执行的任务；
- 不知道做完的东西该验收什么；
- 不知道"看起来能跑"和"真的能用"之间差着一遍系统测试。

这个模式把一套固定的开发流水线**写进 DSH 的 Agent 人格**里，用户只负责讲需求、回答最多一次选择题，其余全部由 AI 带着子代理和后台会话完成。

## 开工体检 + 六步流水线

| 步骤 | 谁在做 | 产物 |
| --- | --- | --- |
| **0 开工体检** | 主会话（本模式） | 先验：后台通道通不通、模型名可不可用、权限档位是多少、"新条款有没有生效"。不通就当场改成本会话自己做，不让用户白等 |
| 1 问清楚 + 写计划 | 主会话（本模式） | `<工程目录>\.dsh-dev\plan.md`：用户原话逐字 / 我的理解 / 需求→验收标准映射 / 技术方案 / 文件清单 / 运行方式 |
| 2 子代理审计划 | 子代理（只读） | `review-1.md`：`[必须改] / [建议改] / [通过]` + 按用户原话逐句核对 |
| 3 后台开工 | 新建的**极简模式**会话，思考强度 **max（界面上的"完全"）** | 真正写代码、构建、自测三连（产物存在 / 构建或启动成功 / 端到端跑一次） |
| 4 系统测试 | 子代理（QA） | `qa\qa-<轮>.md`：本轮新发现 / 上轮缺陷回归 / 计划偏差检查 / 未覆盖项 + 截图 |
| 5 Debug | 第 3 步那个**同一个**会话 | 逐条修 + 重新编译自测 |
| 6 复测与交付 | 主会话 | 最多 3 轮复测；通过后 `present` 交付 + 一段白话总结 |

出问题时 AI 会**如实报告**，不会假装测试通过；3 轮仍不过就交付当前最好版本，并用白话给出三条出路（再修一轮 / 先这样用 / 换思路重做）。

## 流程分级：快线 / 全线

- **快线**（四条全满足）：只改 1 个程序文件或新建 ≤2 个文件、验收标准 ≤3 条、不需要联网装东西、预计后台 1 轮做完 → 技术方案 ≤10 行、审计划只查两件事、修复上限 2 轮。
- **全线**（默认）：走完整流程，修复上限 3 轮。
- 两条线都不许省：QA 报告四块必须齐、每条缺陷必须有复现步骤、交付前必须给验收表。

## 小白体验六条

1. **不讲术语**：编译→打包、命令行→黑窗口、依赖→要用到的东西、部署→放到网上。
2. **说不清就先给例子**：给 3 个具体例子让你挑；问题最多一轮、一次问完，每题都写"效果 + 代价"。
3. **每次只说三件事**：现在第几步 / 你要不要做什么（通常是"不用"）/ 还要多久。
4. **交付三件套**：双击就能打开的东西 + 中文说明书 + 桌面快捷方式，并告诉你数据存在哪、怎么备份。
5. **你自己怎么验**：给你一份 3–5 步的自验清单，每步都是"点哪里 → 看到什么"。
6. **出错只说三句话**：哪一步没成 / 我打算怎么修 / 你要不要做什么 —— 不甩英文报错。

## 用起来是什么样

一个真实跑完的例子——用户只说了一句话：

> 帮我做个命令行记账小工具，就放在这个目录里。要求：记一笔／看明细／看结余／数据关掉再打开还在／双击就能开始记账。我自己完全不懂编程，怎么做你定。

47 分钟后交付：`记账本.exe` + 中文《使用说明.txt》+ 双击启动脚本 + 桌面快捷方式，账目存本机 JSON 文件（"记两笔 → 关掉 → 重开 → 明细和结余都在"是它自己实测过的）。
它同时主动报告了一个不影响使用的小瑕疵（数据文件被人工改坏时提示语夹英文），并说明旧数据会自动备份。

生成的东西长这样：

```
记账小工具/
├── 记账本.exe            ← 双击就能用
├── _internal/            ← 运行库（整个文件夹一起搬）
├── 使用说明.txt           ← 中文说明书
├── 记账本.cmd            ← 从源码直接跑
└── .dsh-dev/             ← 过程记录：计划、审核报告、测试报告、截图（可删）
```

## 安装

> ⚠️ 桌面应用管着的那份配置（profile 名为 `desktop`）**不能用命令行装/卸**，会被直接拒绝；那种情况请用界面里的「设置 → 插件」安装。下面的命令行方式适用于你自己管的那份配置。

**方式一：直接从 GitHub 装**（推荐）

```powershell
dsh plugin --profile <你的profile名> add github:lingyingaojue/dsh-dev-mode
```

**方式二：克隆下来从本地目录装**

```powershell
git clone https://github.com/lingyingaojue/dsh-dev-mode.git
dsh plugin --profile <你的profile名> add "<克隆下来的目录绝对路径>"
```

**方式三：界面里装**

DSH 的 **设置 → 插件 → 安装**，输入框里填 `github:lingyingaojue/dsh-dev-mode` 或本机目录路径，点安装。

> ⚠️ 装完要**新建会话**才会看到「开发者模式」卡片；已经开着的会话保持它原来的组成，这是 DSH 的设计。

**卸载**

```powershell
dsh plugin --profile <你的profile名> remove dsh-dev-mode
```

（用界面装的话，也可以直接在 设置 → 插件 里关掉或卸载。）

## 组成

这个模式**沿用 DSH 标准模式**（`standard` preset）的全部插件清单，只改两处：

1. **persona** 换成开发者模式人格：六步流水线 + 新手白话规则 + 提问纪律（最多一轮、一次问完）+ 等待协议 + 失败出口 + 边界。
2. **skill-filesystem** 追加 `customSkillDirs`，把随插件分发的 `dev-pipeline` 技能挂进来（追加语义：其它技能根不受影响，别的模式也看不到这个技能）。

所以你在这个模式里拿到的是标准模式的全部能力（`pwsh`、文件读写、子代理、workflow、plan mode、todo、web、`present`……）**加上**这套流水线纪律。

## 附带的技能与脚本

`skills/dev-pipeline/` 里有一个人格会主动加载的技能，和唯一一个脚本 `coder.mjs`——它负责驱动第 3／5 步那个后台极简会话：

```powershell
node "<技能目录>\scripts\coder.mjs" start --cwd "<工程目录>" --plan-file "<plan.md>" --deadline-sec 540
node "<技能目录>\scripts\coder.mjs" send  --session <会话id> --issues-file "<qa 报告>"
node "<技能目录>\scripts\coder.mjs" read  --session <会话id> --tail 3
```

它通过本机 `/api` 通道调用 DSH（认证密钥在运行时从你本机的 `$DSH_HOME/.credentials.yaml` 里读，**不写死任何密钥**，也不要把这套脚本用到不属于你的 DSH 实例上）。

退出码约定：`0` 完成 ｜ `2` 还在跑（继续 `wait`，不是失败）｜ `3` 配置/认证/参数错 ｜ `4` 后台会话自报失败 ｜ `5` 长时间无进展（脚本会打印 `DEVHINT=`：按运行时权限档位判断是"在等批准"还是"真卡住"）。

## 你会被问到什么

最多**一轮**提问，而且一次问完，给 2–4 个通俗选项、每个都写清"效果 + 代价"、并标出推荐项。技术选型（用什么语言、要不要数据库、界面怎么做）不会问你——AI 自己定，并用一句白话告诉你它定了什么。

## 已知限制

- **需要 DSH 0.2.0 及以上**（实测于 `0.2.0-rc.1` / `0.2.0-rc.2`）。
- **权限由部署方决定**：默认权限可能是"要问"，也可能已经是完全放开。插件不预设任何一种——开工体检会报出实际档位，卡住时按实际档位给下一步；受限权限下后台会话的 shell 可能直接起不来（被沙箱挡住），此时脚本会**自动用完全放开权限重开一次**并打印 `DEVPERMFALLBACK=1`，不需要你手动处理。
- **成本**：上面那个例子里的一次小需求约 47 分钟、几十万 token（含多个子代理与后台会话）。程序越大越久，但卡住时它会问你，不会闷头烧。
- 模式 id 是 `dev`，比较通用；如果你的 profile 里已有同名 preset，会报 `Duplicate agent preset`，改 `cordis.patch.yml` 里的 id 即可。
- 界面文案与提问都是中文优先；用英文提问时 AI 会用英文回答。
- **实测环境**：目前的脚本与行为主要在 Windows 上实测过（发给后台的"黑窗口"指令会按系统自动生成）；其它系统尚未实测。

## 改这个插件

- **只改技能或脚本** → 直接改 `skills/dev-pipeline/` 下的文件，技能是实时读取的。
- **改完怎么确认真的生效**：读回真实生效内容（`agentPresets/read`，`selfcheck` 已自动比对 13 个必需标记）；不重启也能用 `dsh --profile <名> --dump-config` 验证加载器能否正确组合。**改动只对新开的会话生效。**
- **改人格或组成** → 改 `cordis.patch.yml`，然后重装。注意：对已安装的本地链接插件直接重装会报 `ambiguous-install`，正确做法是
  **先移除、再安装**（`remove_bundle` → `install_bundle`，或 `dsh plugin remove` → `dsh plugin add`）。
- `cordis.patch.yml` 里那句 `!!js … createRequire(baseUrl).resolve('dsh-dev-mode/package.json')` 负责定位本插件的技能目录；
  它是**懒求值**的（要到新建会话时才求值），改坏不会有诊断，所以改完一定要新建一个会话说一句、看 `skill` 能不能加载 `dev-pipeline`。
- persona 的 `prefix`/`suffix` 是模板，除已注册变量（如 `{{cwd}}`）外**不能出现其它 `{{...}}`**，否则预设渲染失败。

## English

**dsh-dev-mode** is a [DeepSeek Harness](https://github.com/deepseek-ai) plugin that adds a "Developer mode" agent preset.
A beginner describes what they want in a few plain sentences; the agent then runs a fixed six-step pipeline —
write a plan → have a subagent review it → spawn a minimal-mode background session (max reasoning effort) that writes and builds the code →
have a QA subagent actually run and test it → send the findings back to the same session to fix → re-test → deliver —
and asks the user at most one round of plain-language questions along the way.
The user does **not** need to know programming or AI: they describe what they want in plain language, and if they cannot, the mode offers three concrete examples to pick from first.

Install: `dsh plugin --profile <profile> add github:lingyingaojue/dsh-dev-mode` (then start a **new** session).
Requires DSH 0.2.0+. Persona and prompts are Chinese-first.

## License

MIT © 2026 LingYingAoJue
