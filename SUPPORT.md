# Support

Need help with **Developer Mode** (`dsh-dev-mode`)? This page explains where to look first and what to include when you ask.

## 1. Read the docs first

Most setup and usage questions are already answered:

| Document | What it covers |
| --- | --- |
| [docs/FAQ.md](docs/FAQ.md) | Install, permissions, data, SmartScreen, uninstall, missing mode, costs |
| [README.md](README.md) | Quick start, install, what you get, requirements |
| [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) | DSH versions, platforms, preset ids, v1 migration |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the presets, subagents, stages, and gates fit together |
| [docs/MAINTAINING.md](docs/MAINTAINING.md) | Local install, activation checks, smoke tests, releases |
| [docs/TRANSLATIONS.md](docs/TRANSLATIONS.md) | Language policy and translation status |

Then search the [existing issues](https://github.com/lingyingaojue/dsh-dev-mode/issues) — including closed ones — for your symptom, error text, or preset name.

## 2. Ask in an issue

If the docs and existing issues do not help, open a new issue using the templates:

- **Bug report** — something is broken or behaves unexpectedly.
- **Feature request** — an improvement or a new capability.

Both templates are available on the [new issue page](https://github.com/lingyingaojue/dsh-dev-mode/issues/new/choose). Please include:

1. **DSH version** — the output of `dsh --version`.
2. **Operating system** — Windows edition and version (for example, Windows 11 24H2), or macOS/Linux distribution.
3. **Preset** — `dev` (coordinator) or `dev-worker` (executor), and whether you started a new session.
4. **What happened** — expected behavior vs. actual behavior, in plain language.
5. **Reproduction steps** — the smallest numbered sequence that shows the problem, including the exact prompt you used if the agent is involved.
6. **Evidence paths** — which files under your workspace's `.dsh-dev/` folder are relevant (for example `plan.md`, `status.md`, `reports/build-N.md`, `qa/qa-N.md`, or `qa/evidence/`). Paste short text excerpts instead of giant logs.

## 3. Before you post: redact

Public issues are permanent and world-readable. Remove:

- Tokens, cookies, API keys, passwords, and any `Authorization` headers.
- DSH session URLs that contain credentials, and session/account identifiers that are not yours to share.
- Personal file paths, usernames, email addresses, and private document contents.
- Screenshots that show any of the above — crop or blur, or paste the text with placeholders such as `<workspace>`, `<profile>`, `<redacted>`.

**Never post secrets, private data, or exploitable vulnerability details in a public issue.** For security issues, follow [SECURITY.md](SECURITY.md) and report privately instead.

## 4. What we can and cannot help with

**In scope:** installing/updating the bundle, preset selection and activation, pipeline behavior, `.dsh-dev/` artifacts, documentation errors, translation issues, and reproducible bugs in this repository.

**Out of scope:** DeepSeek Harness engine bugs (report [upstream](https://github.com/deepseek-ai/deepseek-harness)), general programming lessons, debugging arbitrary third-party software, or recovery of data that a generated program lost outside the documented backup flow.

## 5. Response expectations

This project is maintained by a volunteer, so replies are **best effort** and no SLA is promised. Issues with a clear reproduction, environment details, and redacted evidence are much faster to diagnose. Security reports go through the private advisory flow described in [SECURITY.md](SECURITY.md).
