# AGENTS.md

## 项目

<应用名>：一个本机单用户记账小工具。数据存 SQLite，界面用 tkinter，可打包成 Windows exe。

## 技术栈

- Python 3.10+
- tkinter（标准库）
- SQLite（标准库 sqlite3）
- PyInstaller（打包，项目内 `.venv`）

## 常用命令

```powershell
# 运行（开发）
python app.py

# 自测（不打开界面，退出码 0 = 通过）
python app.py --selftest

# 打包（生成 dist\<应用名>\<应用名>.exe）
powershell -ExecutionPolicy Bypass -File build.ps1
```

## 数据位置

- 默认：`%LOCALAPPDATA%\<应用名>`；测试用 `APP_DATA_DIR` 指向临时目录。
- `core.py` 负责建库、备份（`backups/`，保留 10 份）、日志（`logs/app.log`）。
- 数据结构改动：先备份、写迁移、用数据副本测试，成功后再切。

## 结构

- `core.py`：数据层，不 import tkinter。
- `ui.py`：tkinter 界面，只调用 core。
- `app.py`：入口；`--selftest` 只加载 core。
- `build.ps1`：打包。

## 完成标准

- 从最终位置双击 exe 能启动；
- 记账、看明细、结余正确；
- 关掉再打开数据还在；
- 备份文件存在且能恢复；
- 中文说明能照着做；
- 已知限制写清楚。

## 注意

- 不要删除用户数据；不要写 Program Files。
- 不把密钥写进代码。
- 改完同步更新 README.md 和本文件。
