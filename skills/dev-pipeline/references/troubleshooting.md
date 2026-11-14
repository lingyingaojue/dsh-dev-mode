# 原生子代理模式 · 排错

本版本不再使用 `coder.mjs`、本地 `/api`、cookie、端口、退出码或 540 秒轮询。遇到问题按下面分岔。

## 1. 先确认插件的两个预设生效

- 界面：**设置 → 插件** 或首页模式列表，应看到「开发者模式」和「开发者模式·执行器」。
- Agent 侧：`plugin_manager list_plugins` 里应有 `preset-dev`、`preset-dev-worker`，且 `fiberPhase=active`。
- 只在**新会话**生效；已打开的会话保持原组成。

## 2. 执行器启动失败

现象：`subagent` 调用返回错误，或子代理没出现。

- `agentPreset` 引用的 `dev-worker` 不存在/加载失败：重装插件，确认 `preset-dev-worker` 为 active。
- `ACTIVATION_LIMIT_REACHED`：同时活着的子代理太多；等一个结束，或减少并发。
- `DUPLICATE_AGENT_NAME` / `INVALID_AGENT_NAME`：换 `builder-2`/`tester-2` 这类名字。
- 模型路由被拒：不要硬指定模型；省略 `provider`/`model`/`reasoning_effort`，继承父会话。
- 以上都排除后仍失败：协调者降级自己实现，告诉用户一句，不要反复重试。

## 3. 权限 / 沙箱拦截

- 现象：写文件、启动进程、创建快捷方式、访问数据目录时报 `EPERM`/`拒绝访问`/沙箱拦截。
- 处理：一句白话说明；给两个选择：用户在界面把权限档位调宽，或把工程放到可写的工作目录。不要自动提权，不要用同一权限反复试。
- 子代理继承父会话的权限根；工程目录必须在可写范围内。项目不要建在 `Program Files`。
- 需要写 `%LOCALAPPDATA%` 做数据测试时，若被拦，改用 `APP_DATA_DIR` 指向工程内临时目录做验证，并在报告里标 BLOCKED 说明真实数据目录未验证。

## 4. 子代理卡住 / 没动静

- 不要轮询。先 `list_agents` 看状态：`running` 是在跑，`inactive` 可能是已结束或没开始。
- 常见卡点：执行器跑了需要键盘输入的交互命令（如 `rm` 的确认、`pause`、等待 stdin 的脚本），命令挂起，执行器整轮不动。处置：`interrupt_agent` 停掉，接手或重派；任务单里写明「所有命令必须非交互，用 `--yes` 等参数」。
- 用 `send_message` 发一条具体纠偏：卡在哪、下一步做什么、报告要什么格式。
- 仍无进展：`interrupt_agent` 停当前轮，拆小任务重开；或协调者自己接手。
- 用户叫停：`interrupt_agent` 所有子代理，保存 `status.md`；不要归档会话来停止。

## 5. 构建 / 依赖失败

- 读完整错误日志，不猜；把确切命令和报错写进下一轮任务单。
- 先判断是「缺运行时」「缺打包工具」还是「代码错」：缺运行时换方案或让用户装；缺工具先装项目内 `.venv`；代码错回传执行器修。
- 只安装计划里列出的依赖；装之前一句话说明；不执行 `curl | iex`、不装来路不明的包。
- 网络不可用：换无外网依赖的方案，或在报告里写 BLOCKED 及原因。

## 6. QA 不通过

- 把 `qa/qa-N.md` 原路径 `send_message` 给同一个 builder，要求逐条修；不要重新开一个执行器。
- 修复后必须新开 tester 复测，并回归上一轮所有问题。
- 轮数上限：L1 两轮、L2 三轮。到上限仍未全过：如实交付最好版本，两栏写「能用什么/哪里不行」，给三条出路，附最后一轮 QA 报告路径。

## 7. 数据 / 迁移问题

- 任何数据结构改动：先备份数据、用副本测试迁移、成功后再切；失败回滚。
- 数据损坏：优先从 `backups/` 恢复；不要自动删库。
- 用户说「删掉」：只删你创建的程序文件；数据要单独确认。

## 8. 上下文压缩 / 新会话

- `plan.md`、`status.md`、`qa/`、`reports/` 是唯一事实来源；压缩后先读它们。
- 不要凭记忆说「已经测过」；以证据文件为准。
- 新会话继续：读 `status.md` 的「下一步」，从当前阶段接着做。

## 9. DSH 升级后预设漂移

- 本插件的 `preset-dev` 以 DSH 安装目录的 `@deepseek-ai/dsh-web-app/presets/standard.patch.yml` 为基线。
- 升级 DSH 后：对照新 standard 的插件行，补上新增行、删掉已移除行；改完重装插件，新建会话验证。
- 不要凭旧版本的字段写配置；以当前安装包的 README/源码为准。

## 10. 重新安装

1. 先移除：`plugin_manager` `remove_bundle` → `dsh-dev-mode`。
2. 再安装：`plugin_manager` `install_bundle` → 仓库目录（本地目录会以 link 方式安装）。
3. 确认 `application: applied`；若 `restart-required`，按提示重启应用。
4. 只对新会话生效；用「开发者模式」新建会话验证。
