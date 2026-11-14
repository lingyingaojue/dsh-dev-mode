# 技术选型与交付做法

原则：**选本机已经能跑、能打包、数据最安全的方案**；不为技术先进牺牲用户可用性。

## 1. 决策表

| 情况 | 首选 | 备选 | 不要选 |
| --- | --- | --- | --- |
| 有数据、要长期用、要双击打开 | Python 桌面（tkinter + SQLite + PyInstaller） | .NET WinForms（本机有 dotnet SDK） | 单文件网页存数据 |
| 没有 Python，但有 Node | Node CLI / 简单本地服务 + 启动脚本 | 单文件网页（数据可导出） | 让用户先去装 Python 才能用 |
| 只读展示/计算/打印，不存数据 | 单文件网页 | Python CLI | 引入服务器 |
| 命令行工具、批量处理 | Python CLI 或 Node CLI | 单文件网页（拖拽文件） | GUI 套壳 |
| 已有程序小改 | 原技术栈原地改 + 备份 | 重写（用户同意后） | 混用两套栈 |
| 多用户/登录/支付/联网服务 | 先缩成单机 MVP；确实要全量再分阶段 | — | 假装能一键做完 |

本机运行时探测顺序：`python --version` / `py -3 --version` → `node --version` → `dotnet --version`。Windows 上 `python` 可能只是应用商店占位符，必须真跑一次 `python -c "print(1)"` 确认。

## 2. Python 桌面（默认，P0）

结构：

```
core.py    # 数据层：SQLite、备份、导入导出；不 import tkinter
ui.py      # tkinter 界面
app.py     # 入口；--selftest 只 import core
build.ps1  # 打包
启动.bat   # 没打包时的回退启动（ASCII 内容）
README.md  # 中文用户手册
AGENTS.md  # 工程事实
```

数据：

- 默认 `%LOCALAPPDATA%\<ASCII 应用名>`；支持 `APP_DATA_DIR` 环境变量覆盖（测试用）。
- 便携/绿色版可以放程序目录的 `data/`，但必须：打包时排除 `data/`；手册写清「升级/覆盖解压时数据会怎样」；同样支持环境变量覆盖测试。
- SQLite 建表带 `schema_version`；升级前 `backup_db()` 到 `backups/`，保留最近 10 份。
- 所有写操作走事务；关键操作写 `logs/app.log`。
- 首次启动建表；损坏时提示用户从 `backups/` 恢复，不要自动删库。

自测（`app.py --selftest`）：

1. 用临时目录（`APP_DATA_DIR`）建库；
2. 写入一条记录；
3. 关闭连接，重新打开；
4. 读回并校验金额/备注；
5. 打印 `SELFTEST=PASS`（或写日志，frozen/windowed 下看退出码）；
6. 退出码 0/1。

打包（`build.ps1`）：

- 项目内 `.venv`；`python -m venv .venv`；`.venv\Scripts\python.exe -m pip install pyinstaller`；
- `python -m PyInstaller --noconfirm --clean --windowed --name <ASCII 名> --distpath dist --workpath build --specpath build app.py`；
- 用 one-folder（不是 one-file）：启动快、杀软误报少；
- 构建后校验 `dist\<名>\<名>.exe` 存在；把 `README.md` 复制进 `dist\<名>\`；
- 失败时打印确切命令与错误，不假装成功；`启动.bat` 作为回退。

安装/交付：

- 把 `dist\<名>\` 整个文件夹复制到最终位置（例如 `%LOCALAPPDATA%\Programs\<名>` 或用户指定目录）；不要只复制 exe。
- 用 WScript.Shell 创建桌面快捷方式；失败就说明原因，给 `启动.bat`。
- 从最终位置双击 exe 测试；不要从 `dist`/源码目录测试后就宣布通过。
- 未签名 exe 会触发 SmartScreen：手册里写「更多信息 → 仍要运行」；不要声称已签名。

## 3. Python CLI

- `cli.py` + `core.py`；`argparse` 子命令；`--selftest` 同上。
- 数据同样放 `%LOCALAPPDATA%\<App>`，支持 `APP_DATA_DIR`。
- 交付 zip：`<App>.zip` 含源码、`启动.bat`、`README.md`；需要双击运行时用 bat。
- 有 Python 的机器可直接 `python cli.py`；没有就看手册装 Python，或改用 Node。

## 4. 单文件网页（P1，适合无数据/可导出）

- 一个 `index.html` 或 `index.html + app.js + styles.css`；**不引外部 CDN**，离线可用。
- 数据用 localStorage 时，必须提供「导出 JSON / 导入 JSON」按钮，并明确告诉用户：清浏览器数据会丢，重要数据优先用桌面版。
- 不要假装 localStorage 等于数据库；不要用它存账号/支付类数据。
- 测试：用浏览器打开，走核心操作；能自动化的用 Node 静态检查 + 手工步骤；无法自动操作就写 BLOCKED。

## 5. .NET / Node 桌面

- 只有本机已有 SDK 且用户需要原生窗口时才选；否则 Python 桌面更省事。
- Node + Electron 体积大、打包慢，默认不选；只在用户明确要网页技术栈时考虑。
- 不管选什么，最终都要能双击/命令行启动，并给出数据位置与备份办法。

## 6. 改现有程序

1. 先读：入口、构建命令、数据文件、现有测试。
2. 备份源码到 `.dsh-dev/backup-<时间戳>/`；备份数据到数据目录 `backups/`。
3. 跑一次原有构建/测试，记录基线。
4. 只做用户要求的最小改动；不顺手重构、不换栈。
5. 改数据结构：写迁移脚本；用数据副本测试；成功后再切；失败回滚。
6. 回归：原有功能逐条验，不能只看新功能。
7. 交付时说明改了什么、数据怎么迁移、怎么回滚。

## 7. 数据安全规则

- 数据目录与程序目录分离；程序升级/重装不碰数据。
- 写文件用「临时文件 + 替换」或 SQLite 事务；不要直接覆盖正在用的文件。
- 启动时自动备份；保留最近 N 份；手册写清恢复步骤。
- 不删除用户数据；卸载只删程序文件，数据默认保留。
- 不把密钥/密码写进源码；需要时让用户填到本地配置文件，并说明风险。

## 8. 中文说明书要点

必须包含：这是什么、怎么打开、怎么用（3-5 步）、数据在哪、怎么备份/恢复、自验清单（3-5 步）、已知限制、怎么卸载、以后想改怎么说。语言生活化，不出现术语；路径写完整，不要让用户自己去猜。

## 9. 工程 AGENTS.md

生成项目时写一份 `AGENTS.md`（从 `templates/AGENTS.template.md` 复制改名），包含：技术栈、运行/自测/打包命令、数据位置、完成标准、注意事项。后续任何 AI 接手先读它。

## 10. 交付前测试清单

- [ ] 从最终位置启动成功（不是源码目录）。
- [ ] 核心操作一次成功。
- [ ] 关闭再打开，数据还在。
- [ ] 备份文件存在，能恢复。
- [ ] 错误输入不会崩（空金额、超大数、特殊字符）。
- [ ] 路径含空格/中文能跑。
- [ ] 手册步骤主会话自己走一遍。
- [ ] 已知限制写清楚，没验证的标 BLOCKED。

## 11. 常见坑

- Windows 应用商店的 `python.exe` 是占位符：必须真跑 `python -c "print(1)"`。
- `Program Files` 不可写：数据不要放程序目录；项目也不要建在无写权限目录。
- 中文路径/空格：命令加引号；打包用 ASCII 应用名，窗口标题用中文。
- `.bat` 用 ASCII 内容 + CRLF；中文说明放 README。
- PyInstaller one-file 启动慢、易被杀软误报：默认 one-folder。
- tkinter 可能缺：先 `python -c "import tkinter"` 确认；缺了换 CLI/网页方案，不要让用户装一堆东西。
- 没有 git 也能做：用 `.dsh-dev/backup-*` + `status.md` 代替版本控制。
- 交互式命令会挂起：`rm` 确认、`pause`、等待 stdin 的脚本不要在自动流程里跑；用 `--yes`/非交互参数，或把交互留给界面。执行器卡住时先怀疑这个。
- `.bat` 退出码：批处理最后一条命令决定退出码；要 `set "RC=%ERRORLEVEL%"`，只在双击/无参数时 `pause`，然后 `exit /b %RC%`，否则 `pause`/`echo` 会把真实退出码吞成 0。
- zip 中文文件名：Windows 自带 tar/Compress-Archive 可能按 GBK 写文件名；用 .NET `ZipArchive` 或显式 UTF-8 的打包方式，并用**另一种工具**（资源管理器解压 / Expand-Archive）解压到全新目录再验，不能只 `tar -tf` 自证。
