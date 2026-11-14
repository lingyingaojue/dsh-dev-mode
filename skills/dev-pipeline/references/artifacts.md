# 工件模板与证据规则

模板在 `templates/`，复制到工程目录后按实际情况填写。不要留 `<占位>` 给用户看。

| 文件 | 何时用 | 模板 |
| --- | --- | --- |
| `.dsh-dev/plan.md` | 阶段 2 起，所有 L1/L2；L0 可只在 status 记一句 | `templates/plan.md` |
| `.dsh-dev/review-1.md` | 仅 L2，评审员写 | `templates/review.md` |
| `.dsh-dev/reports/build-N.md` | 每轮执行器写 | `templates/build-report.md` |
| `.dsh-dev/qa/qa-N.md` | 每轮测试员写 | `templates/qa.md` |
| `.dsh-dev/delivery.md` | 阶段 6 交付 | `templates/delivery.md` |
| `.dsh-dev/status.md` | 开工即建，每阶段更新 | `templates/status.md` |
| 工程根 `AGENTS.md` | 生成项目时写；给后续 AI 看 | `templates/AGENTS.template.md`（复制后改名） |

## 证据规则

- 每条 PASS 必须有证据：命令输出、截图、数据库查询、日志文件、最终产物路径。
- 证据放 `.dsh-dev/qa/evidence/`，文件名带轮次与用途，例如 `qa-1-selftest.log`、`qa-1-main-window.png`。
- 只读代码不算测试；没跑起来就写 BLOCKED 及原因。
- 截图只截程序窗口/关键界面，不要截用户隐私内容；路径写进报告。
- 日志过大时只保留关键片段，并在报告里写完整日志路径。

## 机器可判标记

执行器报告末尾：

```
BUILD=OK|FAIL|BLOCKED
CHANGED=<相对路径，逗号分隔>
RUN=<启动命令>
SELFTEST=<自测命令及结果摘要>
EVIDENCE=<证据路径>
BLOCKERS=<无/具体原因>
REPORT=<报告绝对路径>
```

测试员报告末尾：

```
QARESULT=PASS|FAIL|BLOCKED
QA_REPORT=<报告绝对路径>
```

协调者只把这些标记用于自己判断，不贴给用户。

## 验收表

交付时 `delivery.md` 与最终消息里的验收表，列固定为：

| # | 验收标准 | 怎么验的 | 结果 | 证据 |
| --- | --- | --- | --- | --- |

- 结果只能是 PASS / FAIL / BLOCKED。
- BLOCKED 必须写原因和「用户可以怎么人工确认」。
- 不允许「基本通过」「应该没问题」这类模糊结论。

## 数据与备份证据

有数据时，必须留两类证据：

1. 写入后读回的日志/查询结果；
2. 关闭程序、重新打开后再读一次的结果（证明持久化）。

备份/恢复也要至少验证一次：备份文件存在、能放回、能读。

## 目录约定

```
<工程目录>/
  <源码与构建产物>
  README.md            # 中文用户手册
  AGENTS.md            # 工程事实（给后续 AI）
  .dsh-dev/
    plan.md
    status.md
    review-1.md        # 仅 L2
    reports/build-N.md
    qa/qa-N.md
    qa/evidence/
    delivery.md
    backup-<时间戳>/
```

`.dsh-dev/` 是过程记录，交付时告诉用户可以删、不影响程序使用。
