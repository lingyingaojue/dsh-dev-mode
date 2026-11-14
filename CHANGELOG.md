# 变更记录

本文件记录各版本的用户可见变化。安装与升级方式见 [README](README.md)。

## 2.0.0

- 发布日期：2026-11-14
- 兼容性：需要 **DSH 0.2.2+**（实测 `0.2.2-rc.3`）；`dev` 预设 id 与「开发者模式」名称保留；已有会话保持旧组成，新会话生效。

### 破坏性变更

- 移除 `coder.mjs`、`lib.mjs` 及 `selfcheck`/`preflight`/`start`/`send`/`wait`/`read`/`list` 命令；不再依赖本机 `/api`、浏览器 cookie、端口探测、Node 或 540 秒轮询。
- 实现与测试改由 DSH 原生子代理承担：协调者 `dev` 通过 `subagent` 调用执行器预设 `dev-worker`；用完成通知等待、用 `interrupt_agent` 停止。
- 权限被拦时不再自动用 `danger-full-access` 重开；改为说明原因并给用户选项。

### 新增

- 执行器预设 `dev-worker`：文件、搜索、shell、后台作业、压缩；精简、无用户交互、低 token。
- 七阶段流程：接单分级、环境选型、规格计划、垂直切片、分批实现、独立验收、打包交付；六道质量门 G0–G6。
- 三档：L0 快修（直接改）、L1 标准（执行器 + 独立测试）、L2 完整（评审 + 切片 + 干净环境安装）。
- 垂直切片：先做「能启动 + 一个核心动作 + 数据能存能读」，再补功能。
- 打包与干净环境验收：最终产物、安装到最终位置、快捷方式、从最终位置启动、关掉重开数据还在。
- 数据安全：用户数据目录、原子写/事务、启动备份、迁移前备份、卸载不删数据。
- 工件契约：`plan.md`、`review-N.md`、`reports/build-N.md`、`qa/qa-N.md`、`delivery.md`、`status.md`；机器可判标记 `BUILD=`/`QARESULT=`。
- 起步模板：Python 桌面（tkinter + SQLite + PyInstaller + `--selftest`）、本地网页（localStorage + 导出/导入）、工件模板、`AGENTS.md` 模板。
- 插件显示资源：`docs/DETAIL.md`、`locale/{zh,en}.json`、`icon.svg`。
- 兼容范围声明：`engines.dsh: ">=0.2.2-rc.3"`。

### 变更

- `preset-dev` 以 DSH 0.2.2-rc.3 的 standard 预设为基线重建，补上 `time-context`、`tool-schedule`、`tool-office`、新的 `modelSelection/modelDiscovery` 与 plugin-manager 条件；移除旧版本残留行。
- 人格改为「协调者宪法」：用户沟通、最高原则、七阶段、三档、子代理用法、质量门、出口表、边界；详细步骤移到技能，减少每轮 token。
- 技能重写为七阶段 SOP + 四份按需参考 + 模板；执行器/测试员/评审员任务单模板内置。
- 权限、卡住、构建失败、QA 不通过、用户叫停、上下文压缩、DSH 升级漂移都有明确出口。

### 移除

- 旧 `skills/dev-pipeline/scripts/`、HTTP 排错文档、对 `minimal` 后台会话的依赖。

### 兼容性

- 旧 `.dsh-dev/plan.md`、`qa/` 记录仍可读；新版本新增 `reports/`、`delivery.md`、`status.md`，不再产出 `status.json`/`logs/coder-*.json`。
- 旧会话不自动升级；需要新能力请新建会话。

---

## English

### 2.0.0

- Release: 2026-11-14
- Compatibility: requires **DSH 0.2.2+** (tested with `0.2.2-rc.3`); the `dev` preset id and the "Developer Mode" name are kept; existing sessions keep their composition, new sessions get v2.

#### Breaking changes

- Removed `coder.mjs`, `lib.mjs`, and the `selfcheck`/`preflight`/`start`/`send`/`wait`/`read`/`list` commands. No local `/api`, browser cookie, port probing, Node, or 540-second polling.
- Implementation and testing now use DSH-native subagents: the `dev` coordinator calls the `dev-worker` executor preset through `subagent`, waits on completion notices, and stops with `interrupt_agent`.
- When permissions block work, the mode explains and offers options instead of auto-reopening with `danger-full-access`.

#### Added

- Lean `dev-worker` executor preset: file, search, shell, jobs, compaction; no user interaction.
- Seven stages and six quality gates: intake, recon & stack choice, spec & plan, vertical slice, incremental build, independent acceptance, packaging & delivery.
- Three lanes: L0 quick fix (direct), L1 standard (executor + independent tester), L2 full (review + slice + clean-state install).
- Vertical slice first: launch + one core action + data persistence, then features.
- Packaging and clean-state acceptance: final artifact, final location, shortcut, launch from final location, data survives restart.
- Data safety: user data dir, atomic writes/transactions, startup backups, backup before migration, uninstall keeps data.
- Artifact contracts and machine-readable markers (`BUILD=`, `QARESULT=`).
- Starters: Python desktop (tkinter + SQLite + PyInstaller + `--selftest`), local web (localStorage + export/import), artifact templates, `AGENTS.md` template.
- Plugin display resources: `docs/DETAIL.md`, `locale/{zh,en}.json`, `icon.svg`.
- Compatibility declaration: `engines.dsh: ">=0.2.2-rc.3"`.

#### Changed

- `preset-dev` rebuilt from the DSH 0.2.2-rc.3 standard preset, adding `time-context`, `tool-schedule`, `tool-office`, the new `modelSelection/modelDiscovery` config, and the current plugin-manager condition; obsolete rows removed.
- Persona is now a coordinator constitution; the detailed procedure moved into the skill to reduce per-turn tokens.
- Skill rewritten as a seven-stage SOP plus four on-demand references and templates.
- Explicit exits for permissions, stalls, build failures, failed QA, user cancellation, compaction, and DSH upgrade drift.

#### Removed

- The old `skills/dev-pipeline/scripts/`, HTTP troubleshooting, and the `minimal` background-session dependency.

### 1.1.1

- Fixed probe command, stall threshold, turn-scoped results, `wait`/`read` output, lock release, address source, clause validation, preflight cache, timezone, plan-file resolution, and log truncation.
- Persona contradictions removed; docs unified; desktop-managed profile note added.

### 1.1.0

- Added step-0 health check, flow tiers, delivery acceptance table, model adaptation, one-shot permission escalation, beginner rules, and changelog.
- Changed the failure-exit table, testing skill discovery, address probing, and selfcheck.

### 1.0.0

- Initial release: Developer Mode (six-step pipeline).
