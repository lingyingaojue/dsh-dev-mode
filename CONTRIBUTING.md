# Contributing to Developer Mode

Thanks for helping improve **Developer Mode** (`dsh-dev-mode`), a DeepSeek Harness agent preset that turns a plain-language request into a program that was actually run, tested, packaged, and documented.

This repository is mostly instructions and configuration: the presets live in `cordis.patch.yml`, the pipeline SOP and templates live in `skills/dev-pipeline/`, and the docs live in `docs/`. There is no build step, and the plugin itself has no runtime dependencies.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

- Read the [README](README.md) and search [existing issues](https://github.com/lingyingaojue/dsh-dev-mode/issues) before opening a new one.
- Read [docs/FAQ.md](docs/FAQ.md) for setup and troubleshooting questions.
- **Security issues must not be reported in public issues.** Follow [SECURITY.md](SECURITY.md).
- Open an issue to discuss large changes first: preset/runtime behavior, a new pipeline stage, a breaking docs restructure, or a new translation.

## Development environment

| Tool | Version | Notes |
| --- | --- | --- |
| DeepSeek Harness | **0.2.2+** (tested with `0.2.2-rc.3`) | Required to run the presets |
| Node.js | **22 LTS+** | Only for repo scripts (`scripts/ci-check.mjs`) and `node --check` |
| Python | **3.12+** | Optional; only for compiling the Python starter template |
| Git | Any recent version | |
| OS | **Windows 10/11 tested** | macOS/Linux are untested; CI runs on Ubuntu |

No `npm install` is needed — the check script uses Node.js built-in modules only.

## Clone

```powershell
git clone https://github.com/lingyingaojue/dsh-dev-mode.git
cd dsh-dev-mode
```

## Install the local bundle

Editing the checkout has no effect until the bundle is reinstalled into a DSH profile.

**CLI-managed profile** (a profile you manage yourself):

```powershell
# Remove first: this avoids `ambiguous-install` when switching between
# the GitHub package and your local checkout. If it reports that the
# plugin is not installed, just continue.
dsh plugin --profile <your-profile> remove dsh-dev-mode
dsh plugin --profile <your-profile> add "<absolute-path-to-your-checkout>"
```

**Desktop app-managed profile** (`desktop`): use **Settings → Plugins** in the app. Uninstall the old copy, then install again and enter the **absolute path** of your checkout. The CLI cannot install into or remove from a profile that the desktop app manages — see the README install section.

A local-directory install is linked, not copied, so the profile points at your checkout. If the installer reports `restart-required`, restart the app; if it reports `applied`, continue.

> [!IMPORTANT]
> **Start a new session after every install, update, or removal.** A session captures its plugin composition when it is created. Existing sessions keep the old composition and will not see your change.

To verify activation, check both levels:

- The plugin manager (or **Settings → Plugins**) lists the **`preset-dev`** and **`preset-dev-worker`** plugins as active, and the `dsh-dev-mode` bundle at the expected version.
- The new-session mode list contains **Developer Mode** (`dev`) and **Developer Mode · Executor** (`dev-worker`); `standard` remains the default for ordinary sessions.

If only one preset is active, suspect an id conflict or a second copy of the bundle; if behavior changes only in old sessions, you did not start a new session.

## Automated checks

Run these before opening a pull request (they mirror CI):

```powershell
node scripts/ci-check.mjs

node --check skills/dev-pipeline/templates/web-local/app.js

# Python template smoke compile (PowerShell), without leaving __pycache__ in the repo:
$tmp = Join-Path $env:TEMP "dsh-dev-pycompile"
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $tmp | Out-Null
Copy-Item skills\dev-pipeline\templates\python-desktop\*.py $tmp
py -3 -m py_compile $tmp\*.py
Remove-Item -Recurse -Force $tmp
# bash/macOS/Linux:
# tmp=$(mktemp -d); cp skills/dev-pipeline/templates/python-desktop/*.py "$tmp"/; python3 -m py_compile "$tmp"/*.py; rm -rf "$tmp"

npm pack --dry-run
```

`scripts/ci-check.mjs` must pass on both Windows and Ubuntu, so keep it free of platform-specific commands and third-party dependencies.

## Manual test checklist

Install your change into a clean profile, start a **new session**, and run through this checklist. Report exactly what you tested in the PR.

1. **Both presets active.** The new-session mode picker shows **Developer Mode**, and the executor preset **Developer Mode · Executor** is registered (it is normally selected automatically). The plugin manager lists `preset-dev` and `preset-dev-worker` as active, and the bundle version matches `package.json`.
2. **L0 quick fix.** In a scratch folder, ask for a one-file, no-dependency change (for example, "change the greeting in `hello.ps1` from 'Hi' to 'Hello'"). Expect: the coordinator edits directly, runs a smoke check, answers in plain language, and does not produce a full plan or independent QA cycle.
3. **Worker direct test.** Start a session with **Developer Mode · Executor** (for testing only; users normally never choose it). Give it one self-contained task with a workspace path and completion criteria. Expect: no user-facing questions, changes limited to the task, `.dsh-dev/reports/build-1.md` written, and the report ending with `BUILD=OK|FAIL|BLOCKED`. Interactive commands must be reported `BLOCKED`, not left hanging.
4. **E2E L2.** In a fresh folder, ask for a small program with persistent data (for example, bookkeeping: add an entry, list entries, see the balance; data survives closing and reopening). Expect a full L2 lane: plan and review, vertical slice first, build reports, independent QA with evidence, delivery from the final location, acceptance table, plain-language manual, self-check list, and a `.dsh-dev/` record. Confirm "close and reopen, data is still there" for real.
5. **Reinstall/upgrade.** Remove and reinstall the bundle. The new session shows the updated behavior; existing sessions are unaffected. Verify the plugin version shown by the manager matches `package.json`.

If a step fails, capture the evidence path under `.dsh-dev/` (redacted) and explain what you expected.

## Pull request conventions

- **One logical change per PR.** Link the related issue and explain the user-visible behavior change and its limits.
- **File style** follows [`.editorconfig`](.editorconfig): UTF-8, LF, final newline, no trailing whitespace; 2-space indentation in YAML/JSON/Markdown, 4 spaces in Python, CRLF for `.bat`.
- **Runtime files are the product.** `cordis.patch.yml` and `skills/**` change what users actually get.
  - Keep `cordis.patch.yml` aligned with the DSH standard-preset baseline described in its header; explain any added or removed tool mounts.
  - Keep `SKILL.md` and each `references/*.md` under **8192 characters**; CI enforces this.
  - Do not add hidden HTTP servers, ports, cookies, or background scripts — v2 deliberately uses DSH-native subagents only.
- **Docs:** update the README(s) and `docs/` when behavior changes; keep relative links resolving. `README.md` (English) is canonical.
- **Translations:** follow [docs/TRANSLATIONS.md](docs/TRANSLATIONS.md). One language per PR, structure parity with English, no machine-translation dumps; commands, paths, preset ids, and product names stay in English.
- **Version numbers and the changelog:** do **not** bump `package.json` `version`, change the README status version, or add/modify released `CHANGELOG.md` version headings and dates. Releases are cut by the maintainer. Describe the change in the PR and the maintainer will record it.
- **CI must be green.** Do not weaken or disable checks to make a PR pass; fix the underlying issue.
- **No secrets.** Do not commit tokens, cookies, API keys, DSH session ids or URLs, personal file paths, or unredacted `.dsh-dev` logs, screenshots, or QA evidence. Use placeholders such as `<your-profile>` and `<workspace>`.
- **No generated files.** Do not commit `dist/`, `node_modules/`, `__pycache__/`, `*.pyc`, or `.dsh-dev/` artifacts.
- **License:** contributions are accepted under the repository's MIT license (inbound = outbound).
- Be kind and specific in reviews; follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Translation workflow

The English README is the source of truth; translated READMEs are introductions, not UI translations.

1. Land the English text first (or keep the PR clearly marked as a translation of a specific commit).
2. Mirror the structure, headings, tables, badges, and Mermaid diagrams in `README.zh-CN.md` (Simplified Chinese) and/or `README.zh-TW.md` (Traditional Chinese, Taiwan/Hong Kong terminology: 專案、預設、驗收、資料、設定、外掛、偵錯). Do not translate line by line; write natural prose.
3. Keep the language bar at the **top and bottom** of the translated README: current language in bold, the others as relative links. Keep the navigation anchors (for example `<a id="why-developer-mode"></a>`) before translated headings so in-page navigation still works.
4. Keep the banner, badges, and links to `docs/README.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `LICENSE`.
5. Keep code blocks, commands, file paths, preset ids (`dev`, `dev-worker`), machine markers, and product names unchanged.
6. Update the language status table in [README.md](README.md) **and** the status table in [docs/TRANSLATIONS.md](docs/TRANSLATIONS.md); mark a translation *Out of date* rather than letting it silently drift.
7. For the plugin-manager detail page, keep [`docs/DETAIL.md`](docs/DETAIL.md) and [`docs/DETAIL.en.md`](docs/DETAIL.en.md) consistent with `locale/zh.json` and `locale/en.json` (`meta.detail`).
8. Add the new README file to `package.json` → `files` if it should ship with the plugin.
9. Run `node scripts/ci-check.mjs`; it checks the language cross-links and every relative link in the READMEs and `docs/*.md`. A fluent reviewer must check the meaning — CI cannot validate translation quality.

Note: the plugin UI and agent replies are currently Chinese/English only; the repository translations are documentation, not application localization.

## Reporting bugs and security issues

- **Bugs / feature requests:** use the GitHub issue templates and include your environment, reproduction steps, and redacted evidence. See [SUPPORT.md](SUPPORT.md).
- **Security:** report privately through [GitHub Security Advisories](https://github.com/lingyingaojue/dsh-dev-mode/security/advisories/new). Never open a public issue for an unpatched vulnerability.

## Releases

Only maintainers cut releases. The procedure (version bump, changelog, reinstall verification, tag) is in [docs/MAINTAINING.md](docs/MAINTAINING.md). Contributors should not include release metadata in feature PRs.
