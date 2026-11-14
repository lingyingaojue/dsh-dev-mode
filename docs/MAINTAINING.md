# Maintaining dsh-dev-mode

This page is for maintainers working from a source checkout: installing and reinstalling the plugin locally, confirming that both presets are active, running smoke tests, checking the package before a release, cutting a version, keeping translations and the DSH `standard` baseline in sync, rolling back, and handling security reports. It describes the repository at plugin version **2.0.1**.

The most important rule: **the plugin is live runtime content.** [`cordis.patch.yml`](../cordis.patch.yml) and everything under [`skills/`](../skills/) change agent behavior, so treat changes to them like code changes and smoke-test them, not like documentation edits.

## Prerequisites

| Tool | Purpose |
| --- | --- |
| DeepSeek Harness, `0.2.2-rc.3` or newer | The tested engine; only new sessions pick up changes |
| Windows 10/11 | The only verified platform for the smoke tests below |
| Node.js and npm | `npm pack --dry-run` and the CI check helper |
| Git | Branching, tags, releases |
| PowerShell | The tested shell for local commands |

## Local install and reinstall

### Install from a checkout

Use any one of these, matching how the profile is managed:

- **Desktop app:** **Settings → Plugins → Install**, enter the absolute path of the checkout.
- **CLI-managed profile:** `dsh plugin --profile <profile> add "<absolute path>"`
- **Agent-side plugin manager:** `plugin_manager` action `install_bundle` with the checkout path as the target. A local-directory install is linked rather than copied.

### Reinstall after changing the bundle

Persona, plugin lists, and tool configuration are read when a session is composed. After editing `cordis.patch.yml`:

1. Reinstall the bundle (a bundle update alone does not recompose an open session).
2. If the install reports `restart-required`, restart the application; if it reports `applied`, continue.
3. Start a **new** session. Never validate a preset change in an existing session.

### Correct reinstall order

Local-directory installs can fail with `ambiguous-install` when the old copy still exists. The reliable sequence is **remove, then install**:

- **Desktop app:** uninstall the plugin in the plugin settings, then install it again.
- **Plugin manager:**

  1. `plugin_manager` action `list_bundles` — confirm the current `dsh-dev-mode` bundle and version.
  2. `plugin_manager` action `remove_bundle`, target `dsh-dev-mode`.
  3. `plugin_manager` action `install_bundle`, target the checkout path.
  4. `plugin_manager` action `list_bundles` — confirm the new version and that the application is `applied` (or follow `restart-required`).

- **CLI:** `dsh plugin --profile <profile> remove dsh-dev-mode`, then `dsh plugin --profile <profile> add "<absolute path>"`.

Do not install the same bundle twice (for example once from the UI and once from the CLI); that produces duplicate or conflicting presets. One copy per profile.

## Verify activation

After a reinstall and a new session, check all of the following:

1. `plugin_manager` action `list_plugins` shows **`preset-dev`** and **`preset-dev-worker`**, both with `fiberPhase=active`.
2. `plugin_manager` action `list_bundles` shows `dsh-dev-mode` at the expected version with the bundle applied.
3. The mode list (or agent-preset list) contains **Developer Mode** (`dev`) and **Developer Mode · Executor** (`dev-worker`); the DSH `standard` preset must remain the default for ordinary sessions.
4. The display names and descriptions come from `locale/{zh,en}.json`; the detail page path in `locale/en.json` is `docs/DETAIL.en.md` and in `locale/zh.json` is `docs/DETAIL.md`.

Failure modes at this step: only one preset active (check for an id conflict), a bundle version that did not change (a link install pointing at another checkout), or the mode visible only in old sessions (a sign that a new session was not created).

## Smoke tests

Run all three levels for a release. They use different paths through the preset and catch different regressions.

### 1. L0 quick-fix smoke

Purpose: the coordinator's direct-edit path works without spawning a worker.

1. Create an empty scratch directory and make it the session workspace; start a new **Developer Mode** session.
2. Ask for a single-file change with no dependency, data, or packaging impact, for example: "Create `notes.txt` in this folder containing the single line `hello from developer mode`, then confirm it exists. Do not build anything."
3. Observe: the coordinator should implement it directly, run a smoke check, and not spawn a `dev-worker` for something this small. No full `plan.md` and no independent QA are required at L0.
4. Pass criteria: `notes.txt` exists with the exact content; the final reply is plain language; no subagent was needed.

### 2. Executor (worker) smoke

Purpose: the coordinator → `dev-worker` → report → independent tester path works.

1. New **Developer Mode** session in a scratch workspace.
2. Ask for a small L1 tool, for example: "Create a command-line notes tool in `tool/` that stores notes in a local data file and supports `--selftest`; run the self-test and report the result."
3. Observe: the coordinator writes a brief plan, calls `subagent` (the executor preset is applied automatically), waits for the completion notice, then independently reruns the build/self-test rather than trusting the report. It should then spawn a fresh tester for acceptance.
4. Pass criteria:
   - `.dsh-dev/plan.md` and `.dsh-dev/status.md` exist;
   - `.dsh-dev/reports/build-1.md` exists and ends with `BUILD=OK` and the other machine markers (`CHANGED=`, `RUN=`, `SELFTEST=`, `EVIDENCE=`, `BLOCKERS=`, `REPORT=`);
   - `.dsh-dev/qa/qa-1.md` exists with `QARESULT=PASS` (or a justified `FAIL`/`BLOCKED`) and an acceptance checklist;
   - the data-persistence criterion was actually exercised (write, close, reopen, read);
   - the final reply is a plain-language summary, not pasted logs.

### 3. Full E2E smoke

Purpose: the complete L2 seven-stage pipeline, including packaging and clean-state delivery.

1. New **Developer Mode** session in a clean scratch workspace.
2. Ask for a small data-backed desktop tool, for example: "Build a small bookkeeping app in this folder. Add an entry, list entries, show the balance, keep data after closing and reopening, and give me a double-clickable result. I don't know programming."
3. Verify at minimum:
   - `plan.md` contains the user's exact words, MVP, non-goals, and acceptance criteria with verification methods;
   - `review-1.md` exists for L2 and contains must-fix/suggest/pass items;
   - `reports/build-N.md` exists for each build round and the machine markers are parseable;
   - `qa/qa-N.md` exists with a complete acceptance table, evidence list, and regression notes; `qa/evidence/` is populated;
   - `delivery.md` contains what it is, how to open/use it, data location, backup/restore, known limitations, uninstall, and the acceptance table;
   - the artifact is installed at a final location, launches from there (not from the source or build directory), survives a close-and-reopen data check, and the coordinator followed the manual itself;
   - the final message follows the delivery structure (what it is → how to open → how to use → data/backup → self-check → known limitations → how to request changes).
4. Record the result with the plugin version, DSH version, OS, and session id. Do not mark a criterion passed by inspecting code; run it.

### 4. Drift smoke after a DSH upgrade

After upgrading DSH, re-sync the coordinator preset first (see [Standard preset sync](#standard-preset-sync)), then repeat the L0 and executor smokes and at least one E2E build. A preset that loads but has lost tools is the drift failure mode; activation checks alone will not catch it.

## Static and packaging checks

### Run the CI helper locally

The repository's CI workflow lives at `.github/workflows/ci.yml` and the checks are implemented in `scripts/ci-check.mjs`. Before pushing, run the helper from the repository root:

```powershell
node scripts/ci-check.mjs
```

The helper is static, uses Node built-ins only, and checks:

- required repository files and the documentation set;
- `package.json` validity, the bundle patch path, and the expected `files` entries;
- `package.json` version against the **first** `## x.y.z` heading in `CHANGELOG.md`;
- required preset markers in `cordis.patch.yml` (`preset-dev`, `preset-dev-worker`, both ids, `agentPreset: dev-worker`, `interrupt: true`);
- an 8192-character limit on each skill file (`SKILL.md` plus the four references);
- `locale/*.json` metadata and the existence of the detail pages they route to;
- README content: banner, language-bar links, and the required `docs/README.md` / `CONTRIBUTING.md` / `SECURITY.md` / `LICENSE` links;
- relative Markdown links, with exact case, across the three READMEs and `docs/*.md`;
- SVG assets (an `<svg>` element, at most 256 KiB) and `skills/` hygiene (no `__pycache__` directories or `.pyc` files).

The workflow adds three steps on an Ubuntu runner (Node 22, Python 3.12): `python -m py_compile` on the Python starter template, `node --check` on the web starter's `app.js`, and `npm pack --dry-run`. Because CI runs on Linux, path case matters: a link that resolves on a case-insensitive Windows disk can still fail in CI.

Two practical notes: remove any local `__pycache__` before running the helper (it is gitignored, but the hygiene check still fails on it), and treat the helper as necessary but not sufficient — it does **not** test DSH runtime behavior, generated programs, translations' semantics, or the Windows GUI path. Never present a green CI run as evidence that the plugin behaves correctly; run the smoke tests.

### `npm pack --dry-run`

Run from the repository root before every release:

```powershell
npm pack --dry-run
```

Expected package contents (`package.json` → `files`): `cordis.patch.yml`, `skills/`, `docs/`, `locale/`, `assets/`, `icon.svg`, `README.md`, `README.zh-CN.md`, `README.zh-TW.md`, `CHANGELOG.md`, `LICENSE`, plus npm metadata. Check that:

- both plugin detail pages are present under `docs/` and are routed by `locale/*.json`;
- all three README files exist before packing — missing README translations are silently skipped rather than reported as errors;
- no `.dsh-dev/`, `.git/`, `node_modules/`, screenshots, local logs, build outputs, or personal paths are included;
- the tarball does not contain any file that is not meant to ship; `docs/` and `assets/` increase package size and must stay intentional;
- no tokens, private URLs, or local absolute paths appear in the file list or in the included text.

`npm pack --dry-run` does not run a build step; the package has no build scripts and ships text content only.

### Runtime leftovers and hygiene

- Confirm the v1 runtime is really gone from shipped content: no `coder.mjs`, `lib.mjs`, `selfcheck`, `preflight`, `status.json` writer, local `/api`, cookie, or 540-second polling logic under `skills/` or in `cordis.patch.yml`. The v2 package should contain preset configuration, skill text, templates, docs, locale, and icons only.
- Confirm `cordis.patch.yml` has no unregistered `{{...}}` template variables in the persona prefix/suffix, and that every referenced plugin package is provided by the supported DSH baseline.
- Do not commit `.dsh-dev/`, logs, generated artifacts, or `.plugin-manager/` state; the repository [`.gitignore`](../.gitignore) already covers most of these.
- Line endings are normalized by [`.gitattributes`](../.gitattributes) (`eol=lf`, with `.bat`/`.cmd` forced to CRLF). Do not fight it by committing mixed-endings files.

## Versioning and release

### Three places must agree

Every release updates all three, in this order:

1. **`package.json`** → `version`
2. **`CHANGELOG.md`** → a new entry for the same version (the file has a Chinese section and an English section; both need the entry, and the newest version must be the top entry in each)
3. **Git tag** → annotated `vX.Y.Z` on the release commit

If the CHANGELOG currently carries a version in only one language section, fix it before tagging. The CI helper compares `package.json` with the **first** `## x.y.z` heading in `CHANGELOG.md`, so the newest version must be the first top-level version heading in the file (the English entries currently sit below the Chinese entries as subsections of `## English`). The tag itself is not checked by CI; verify it during the release steps. Version mismatch is the most common cause of a release that installs as "same version" and does not update.

### Release steps

1. Create a branch from `main`; make the changes; update docs that name versions or behavior ([README.md](../README.md), [docs/README.md](README.md), [COMPATIBILITY.md](COMPATIBILITY.md), [CHANGELOG.md](../CHANGELOG.md)).
2. Update the CHANGELOG with user-visible changes, breaking changes, migration notes, and the tested DSH version.
3. Bump `package.json` to the same version.
4. Run `node scripts/ci-check.mjs` (or the equivalent checks described above) and `npm pack --dry-run`; fix everything before tagging.
5. Open a PR to `main`. CI must be reviewed on the actual run; do not claim it is green from memory. Merging requires a human review of the diff, including the final `cordis.patch.yml` diff.
6. From `main`, create an annotated tag and push it:

   ```powershell
   git tag -a v2.0.1 -m "dsh-dev-mode 2.0.1"
   git push origin main --tags
   ```

7. Publish the GitHub release with release notes derived from the CHANGELOG:

   ```powershell
   gh release create v2.0.1 --notes-file <release-notes-file>
   ```

8. Post-release verification: install the released version from a clean checkout of the tag as a **local directory** (the most reliable route), start a new session, confirm both presets are active, and run the L0 and executor smoke tests. Then reinstall the previous version and verify the rollback path if the release included preset changes.

The repository spec installs from the default branch (`github:lingyingaojue/dsh-dev-mode`); tags document and archive releases. If you point users at a tag, verify that the installation tooling accepts the tag spec before advertising it.

## CI checks

CI is intentionally static because spinning up DSH sessions and Windows GUI flows in CI is not currently part of the project. The workflow (`.github/workflows/ci.yml`, helper `scripts/ci-check.mjs`) runs on pushes to `main`, on pull requests, and on manual dispatch, on an Ubuntu runner with Node 22 and Python 3.12. Its steps are:

1. `node scripts/ci-check.mjs` — the repository checks listed under [Run the CI helper locally](#run-the-ci-helper-locally).
2. `python -m py_compile skills/dev-pipeline/templates/python-desktop/*.py` — the Python starter must compile.
3. `node --check skills/dev-pipeline/templates/web-local/app.js` — the web starter must parse.
4. `npm pack --dry-run` — the package must pack; review the reported file list, not just the exit code.

What CI cannot prove: that the presets activate on a real DSH, that subagents start, that generated programs build or run, that translations are accurate, or that the Windows delivery path works. It runs on Linux, not Windows, and it does not execute a DSH session. Those gaps require the smoke tests above. When changing CI itself, verify the workflow on a PR branch and review the actual run output for that commit; do not merge a workflow change that has never executed, and do not claim a run is green without looking at it.

## Translation maintenance

English is canonical. When behavior, install commands, or CLI output change:

1. Update [`README.md`](../README.md) first, then `README.zh-CN.md` and `README.zh-TW.md`, keeping the same structure and language bar.
2. Update `docs/DETAIL.md` (Simplified Chinese detail page) and, when the English detail page changed materially, `docs/DETAIL.en.md` (which is the English page routed from `locale/en.json`).
3. Keep commands, paths, preset ids, artifact names, and machine markers untranslated.
4. Update the language status table in `README.md` and [TRANSLATIONS.md](TRANSLATIONS.md). If a translation lags, mark it as out of date rather than silently shipping stale content.
5. Add the translation to `package.json` → `files` if it should ship with the plugin.

CI only validates that translation files exist and that their relative links resolve; it does not validate meaning, terminology, or completeness. A reviewer fluent in the target language must review semantic changes. See [TRANSLATIONS.md](TRANSLATIONS.md) for the full policy.

## Standard preset sync

The coordinator preset is a line-by-line copy of DSH's `standard` preset from the tested release, with four deliberate differences (persona, `skill-filesystem`, `tool-subagent-control`, `tool-subagent`). After a DSH upgrade:

1. Read the new `@deepseek-ai/dsh-web-app/presets/standard.patch.yml` inside the upgraded installation.
2. Diff it against `preset-dev` in `cordis.patch.yml` and port additions, removals, and field renames, preserving the four deliberate differences.
3. Check platform-conditional entries (`tool-bash`/`tool-pwsh`) and optional plugin package paths (for example the plugin-manager and plugin-market tool plugins); a package that no longer exists in the new DSH must not be referenced.
4. If the new baseline requires a newer DSH, raise `engines.dsh` and document the new floor; otherwise keep the declared floor installable.
5. Reinstall, create a new session, verify activation, and run the drift smoke tests.
6. Record the baseline sync in the CHANGELOG and update [COMPATIBILITY.md](COMPATIBILITY.md) (tested DSH version and baseline notes).

Do not copy a newer field into the preset without confirming the installed DSH understands it. The main risk of skipping this sync is a preset that activates but has silently lost a tool, not a loud crash.

## Rollback

- **Plugin rollback:** remove the current bundle, install the previous release from a checkout of its tag as a local directory, restart if required, and start a new session. Confirm `list_bundles` shows the old version and both presets are active. Existing sessions composed with the newer bundle are not downgraded; start a new session for the old version.
- **Preset rollback:** `cordis.patch.yml` is versioned. Revert the commit, reinstall the bundle, and start a new session. Keep the previous file content in git rather than editing in place during an incident.
- **Generated-program / data rollback:** use the program's own `backups/` folder and the manual's restore steps; use `.dsh-dev/backup-<timestamp>/` for source rollback. Never delete the current data before confirming the backup copy opens.
- **Bad release:** prefer a follow-up patch release. Do not rewrite tags or force-push `main`. If a release must be withdrawn, mark the GitHub release accordingly, point users at the previous version, and record the reason in the CHANGELOG.
- **DSH downgrade:** not tested. Sessions and profile state created under a newer DSH may not be usable in an older engine; use a separate profile if you must test an older DSH.

## Security reports

Do not open a public issue for a security problem. Use the private reporting channel described in [`SECURITY.md`](../SECURITY.md). Include the affected plugin version, DSH version and install type, reproduction steps, impact, and any relevant logs with secrets removed. Scope: the plugin's configuration, skill instructions, templates, and documentation. Problems in generated programs belong to the project that generated them, though template flaws are in scope and worth reporting.

Security expectations the project states:

- the plugin does not auto-escalate permissions, and v2 removed the v1 `danger-full-access` reopen behavior;
- the plugin does not add its own network service, cookie handling, or port;
- generated programs are not code-signed, and the project does not bypass SmartScreen.

Avoid putting tokens, credentials, personal paths, or user data into reports, issues, commits, or docs. If a report includes `.dsh-dev/` evidence, sanitize it first.

## Pre-release checklist

- [ ] `package.json` version, CHANGELOG entry (both language sections, newest first), and planned tag agree.
- [ ] `node scripts/ci-check.mjs` passes locally with no local `__pycache__`/`.pyc` under `skills/`, and the equivalent checks were run if the helper is unavailable.
- [ ] `npm pack --dry-run` lists exactly the intended files; no logs, `.dsh-dev`, or local paths.
- [ ] If the starter templates changed, `python -m py_compile skills/dev-pipeline/templates/python-desktop/*.py` and `node --check skills/dev-pipeline/templates/web-local/app.js` pass.
- [ ] Required files exist: three READMEs, `docs/` set, `DETAIL.md`, `DETAIL.en.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE`.
- [ ] `cordis.patch.yml` matches the current DSH `standard` baseline apart from the four deliberate differences.
- [ ] Reinstall (remove → install) leaves both presets active and `standard` still the default.
- [ ] L0, executor, and E2E smoke tests were run on Windows 10/11 and their results recorded.
- [ ] `docs/DETAIL.en.md` is routed by `locale/en.json`; `docs/DETAIL.md` by `locale/zh.json`.
- [ ] Translation status tables are accurate; outdated translations are marked.
- [ ] CI status was checked on the actual run; nothing is claimed that was not observed.
