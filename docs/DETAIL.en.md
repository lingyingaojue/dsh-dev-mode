# Developer Mode

**Developer Mode** is an agent preset added to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) by the `dsh-dev-mode` plugin. A user describes the program they want in plain language; the coordinator plans the work, delegates implementation and testing to DSH-native subagents, verifies the result independently, packages it, and hands over the artifact with a plain-language manual and an acceptance table.

It is a preset, not a separate application: it runs inside a normal DSH session and needs nothing beyond DSH itself.

## What it is

- **A coordinator plus an executor.** The `dev` preset talks to the user, chooses the stack, writes the plan, delegates, reviews, packages, and delivers. The lean `dev-worker` preset implements one task at a time, builds, self-tests, and reports. Users never select the executor manually; it is started automatically through the `subagent` tool.
- **A seven-stage pipeline.** Intake and classification, environment recon and stack choice, spec and plan, a vertical slice, incremental build, independent acceptance, and packaging/delivery. Each stage has a quality gate (G0–G6).
- **Evidence-based delivery.** Every acceptance criterion needs a verification method, a result, and an evidence path. Anything that could not be verified is reported as `BLOCKED` with a reason — not counted as a pass.
- **A process record.** The project folder keeps `.dsh-dev/` with the plan, status, build reports, QA reports, evidence, delivery notes, and source backups. It can be deleted after delivery without affecting the program.

## Who it is for

- People who do not write code and want a small tool, command-line utility, local web page, or Windows desktop app that actually runs.
- People who have an existing program and want a careful change: back up first, keep the current stack, run a regression, and protect existing data.
- Anyone who needs the result to be usable and verifiable — a double-clickable artifact, a manual a non-technical person can follow, and an acceptance table they can check — not just a code snippet.

Not a fit for login/payment/multi-user/server-hosted products in one pass (the mode reduces those to a local single-user MVP first), nor for teams looking for a code-review or deployment tool. It builds local programs; it is not a CI/CD system.

## How to use it

1. **Install the plugin**, then **start a new session** and choose **Developer Mode**. Existing sessions do not pick up new presets.
2. **Describe the outcome**, not the technology. Say who it is for, what must work, whether the data matters, and whether an existing program or its data must be preserved.
3. **Answer at most one round of questions** — often none. Technical decisions are made for the user and summarized in one sentence.
4. **Wait while the mode works.** Implementation and testing run in background subagents; the coordinator waits for completion notices instead of polling. Progress is reported as current stage, whether the user needs to do anything, and roughly how long remains.
5. **Receive the deliverable**: the runnable artifact, a plain-language manual (open it, use it, where data lives, backup/restore, uninstall), an acceptance table, a short self-check list, and the `.dsh-dev/` process record.

> The mode list also shows **Developer Mode · Executor** (`dev-worker`). It is the internal background role and is chosen automatically; it is not meant to be selected.

## The seven stages

| Stage | Outcome | Gate |
| --- | --- | --- |
| 0 · Intake and classify | Request restated; at most one question round; lane (L0/L1/L2) chosen | G0 request understood |
| 1 · Recon and stack choice | Workspace, runtime, and packaging tools checked; existing project read and backed up; stack chosen | G1 environment feasible |
| 2 · Spec and plan | MVP, non-goals, acceptance criteria with verification methods, commands, risks, packaging target | G2 criteria verifiable |
| 3 · Vertical slice | Smallest end-to-end path: launch + one core action + data stored and read back | G3 slice runs |
| 4 · Incremental build | Small batches, each self-tested; the coordinator reruns builds and checks the diff scope | G4 features complete |
| 5 · Independent acceptance | A fresh tester runs the artifact, checks every criterion with evidence, regresses the previous round | G5 acceptance passes |
| 6 · Package and deliver | Final artifact at its final location, clean-state launch, shortcut, manual, acceptance table | G6 deliverable usable |

Small work runs on the fast lane: **L0** is a single-file fix with no new dependency, no data/packaging change, and at most three acceptance criteria, implemented directly with a smoke check. **L1** (the default for a small program or moderate change) uses a brief plan, an executor, and an independent tester, with at most two fix rounds. **L2** covers multiple files, persistent data, packaging, existing programs, and external dependencies; it adds an independent plan review, the vertical-slice discipline, and a clean-state installation test, with at most three fix rounds. The coordinator upgrades the lane and tells the user if the work turns out larger than expected.

## What it guarantees

- **Real execution over claims.** Acceptance results come from running the artifact; source-code inspection alone is not a pass.
- **Data safety.** User data lives outside the program directory by default (a per-user data folder), writes are transactional or atomic, backups are taken before risky changes, and data-structure migrations are tested on a copy before being applied.
- **Persistence proof.** When the program stores data, closing and reopening it and reading the data back is actually tested, with evidence.
- **Independent verification at L1/L2.** A separate tester instance, not the implementer, performs acceptance.
- **Clean-state delivery.** The final artifact is launched from its final location — not from a development command — and the coordinator follows the user manual itself before delivery.
- **Honest limits.** Criteria that cannot be verified are reported as `BLOCKED`; known limitations are listed in the delivery notes and the final message.
- **No silent privilege escalation.** If permissions block work, the mode explains the block and offers options; it does not force a wider permission mode.
- **No data deletion.** The mode does not delete user data or files outside the project scope; "delete it" applies only to what it created.

## Environment requirements

| Requirement | Notes |
| --- | --- |
| DeepSeek Harness | **0.2.2+**; tested with `0.2.2-rc.3` |
| Operating system | **Windows 10/11 tested**; other platforms are untested |
| Plugin runtime | None beyond DSH itself; no Node, Python, or .NET needed by the plugin |
| Generated program | Chosen from what the machine actually has: Python 3.10+ (default for data-backed desktop tools), Node 18+, or a local web page with no runtime; .NET only when its SDK is already installed |
| Permissions | Decided by the DSH deployment; the mode never silently escalates them |
| Model | The configured model provider; subagents use the same route unless configured otherwise |

Details, including the unsupported older DSH versions, preset-id conflicts, and the runtime decision table, are in [COMPATIBILITY.md](COMPATIBILITY.md).

## Known limitations

- **GUI acceptance is partly manual.** Complex mouse interactions may not be automatable; those criteria are marked `BLOCKED` with self-check steps instead of being claimed as verified.
- **Unsigned executables.** Generated Windows executables are not code-signed and therefore trigger SmartScreen. The manual explains the normal "More info → Run anyway" path; the mode cannot and will not bypass an organizational policy.
- **Permissions are deployment-owned.** Restricted modes can prevent writes or process launches; the fix is a permission change or a writable workspace, not a plugin setting.
- **Large systems are staged.** Login, payment, multi-user, and server-hosted products are reduced to a local single-user MVP first and expanded in phases only if requested.
- **Platform coverage is narrow.** Only Windows 10/11 has been tested; macOS/Linux behavior and generated-project packaging are unverified.
- **Plugin-detail rendering is unverified everywhere.** This page is routed from `locale/en.json`; rendering across DSH versions and plugin-manager layouts has not been verified.
- **Language coverage.** The coordinator currently communicates primarily in Chinese or English, depending on how the user writes; other-language plugin interfaces are not provided. Translated READMEs are introductions, not runtime localization.
- **Quality depends on the model.** The pipeline enforces process and evidence; it cannot make a weak model produce a strong result.

## Learn more

- [README.md](../README.md) — install, quick start, generated layout, and project status
- [docs/README.md](README.md) — English documentation index
- [ARCHITECTURE.md](ARCHITECTURE.md) — presets, native-subagent flow, stages, gates, artifacts
- [COMPATIBILITY.md](COMPATIBILITY.md) — versions, platforms, preset conflicts, runtime selection, v1 migration
- [FAQ.md](FAQ.md) — installation, permissions, data, backup, uninstall, troubleshooting
- [CHANGELOG.md](../CHANGELOG.md) — release history and breaking changes
- [DETAIL.md](DETAIL.md) — the Simplified Chinese version of this page
