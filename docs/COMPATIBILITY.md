# Compatibility

This page lists what dsh-dev-mode supports, how support is declared and verified, how to handle preset-id conflicts, how the coordinator preset relates to the DSH `standard` preset, what changes when moving from v1 to v2, and which runtimes the generated programs can use. It reflects plugin version **2.0.1**.

## Support at a glance

| Area | Requirement / status | Verified? |
| --- | --- | --- |
| DeepSeek Harness | **0.2.2+**; release notes and docs are verified against `0.2.2-rc.3` | Yes, on Windows 10/11 with `0.2.2-rc.3` |
| `engines.dsh` floor | `>=0.2.2-rc.3` (declared in [`package.json`](../package.json)) | Enforced by DSH's plugin-manager version check |
| Operating system | **Windows 10/11** | Yes |
| macOS / Linux | Not tested | No |
| Shell used by the presets | PowerShell on Windows; the bash tool is enabled on non-Windows platforms by the bundle's platform condition | Only the Windows path is tested |
| Plugin runtime dependencies | None beyond DSH itself | Yes, by design |
| Generated program runtimes | Python 3.10+, Node 18+, a local browser, or .NET when its SDK is already installed | Windows flows only |
| Desktop-managed profile | Cannot be installed or removed from the CLI; use in-app plugin settings | Verified behavior of DSH |
| Plugin-manager detail page | Shipped as `docs/DETAIL.md` / `docs/DETAIL.en.md` via `locale/{zh,en}.json` | Rendering across DSH versions/platforms not verified |

## What "tested" means here

"Tested" means a maintainer ran the flow on **Windows 10/11** with **DSH `0.2.2-rc.3`**, observed the result, and recorded it during the release work. It does not mean:

- that CI ran an operating-system matrix (CI validates repository files, links, versions, package contents, and skill length, not runtime behavior);
- that every model, DSH configuration, or permission mode behaves identically;
- that later DSH `0.2.2` builds, newer minor versions, or other operating systems work, even when the code is expected to.

The plugin itself makes no attempt to detect or patch DSH behavior differences. When in doubt, treat an untested combination as *expected but unverified* and report what you observe.

## DSH version and `engines.dsh`

`package.json` declares:

```json
"engines": { "dsh": ">=0.2.2-rc.3" }
```

The README's "DSH 0.2.2+" is the short form of the same statement. The floor is a prerelease tag because that is the version this release was actually tested on; a stable `0.2.2` or newer satisfies the semver range. Versions older than `0.2.2-rc.3` are unsupported: the preset uses plugin entries and fields that older DSH releases do not provide, so loading can fail or silently lose tools.

Notes:

- Do not bypass the engine check to force installation on an older DSH. The failure mode is a partially composed preset, which is harder to diagnose than a blocked install.
- There is deliberately no upper bound. A newer DSH is *expected but unverified* until the coordinator preset is re-synced with the new `standard` preset and smoke-tested (see [The standard preset baseline](#the-standard-preset-baseline)).
- If two version numbers disagree (`dsh --version`, the desktop app's about screen, `package.json` of an installed bundle), trust the running application and include all observed numbers in a bug report.

## Operating systems and shells

- **Windows 10/11** is the only tested platform. PowerShell is the shell preset; the bash tool is disabled there.
- On non-Windows platforms the bundle enables the bash tool and disables PowerShell through a platform condition, so composition can load. Behavior, packaging (PyInstaller output, `.exe` assumptions, shortcuts, SmartScreen), and paths are **not tested**; expect gaps. The generated-program defaults are Windows-oriented.
- Windows-specific assumptions that show up in generated projects include `%LOCALAPPDATA%` data locations, `.exe` artifacts, `启动.bat` fallback launchers, desktop shortcuts, and SmartScreen guidance.
- Paths with spaces or non-ASCII characters are expected to work when quoted, but edge cases are not exhaustively tested.

## Profiles and installation scope

- Presets belong to a **profile**. Installing the plugin in one profile does not make Developer Mode appear in another.
- Desktop app installs use **Settings → Plugins → Install** and support a repository spec (`github:lingyingaojue/dsh-dev-mode`) or a local directory.
- CLI installs use `dsh plugin --profile <profile> add github:lingyingaojue/dsh-dev-mode` and are only for profiles you manage yourself. A profile managed exclusively by the desktop app (named `desktop`) rejects CLI install/remove; use the in-app settings instead.
- Only **new sessions** see a newly installed or upgraded preset. Sessions are composed when they are created; an existing session keeps its composition even after a reinstall.

## Preset-id conflicts

The plugin declares two preset ids: `dev` and `dev-worker` (bundle ids `preset-dev` and `preset-dev-worker`). DSH requires agent-preset ids to be unique within a profile.

**Symptom:** installation or activation reports a duplicate/conflicting agent preset, or only one of the two modes appears.

**Likely causes:**

1. Another installed plugin declares a preset named `dev` or `dev-worker`.
2. Two copies of dsh-dev-mode are installed in the same profile (for example a CLI install and an in-app install), or a stale local-directory link survives a failed reinstall.
3. A profile-level override reuses one of the ids.

**Resolution:**

1. List installed bundles and remove the duplicate or conflicting copy first (`plugin_manager` `list_bundles`, then `remove_bundle` for the copy you do not want). Reinstall only one copy.
2. If the collision is genuine (another plugin owns the id), rename the ids in [`cordis.patch.yml`](../cordis.patch.yml): the `config.id` values of `preset-dev` and `preset-dev-worker`, **and** the executor reference `agentPreset: dev-worker` on the `tool-subagent` entry. Keep the display names if you like; only ids must change. Reinstall the bundle and start a new session.
3. Verify the result with `plugin_manager` `list_plugins`: `preset-dev` and `preset-dev-worker` should be active, and the mode list should show both entries.

Do not "fix" a conflict by editing DSH's own preset files. The plugin is a bundle patch and is meant to be reinstalled, not patched in place.

## The standard preset baseline

The coordinator preset (`preset-dev`, id `dev`) is a **line-by-line copy** of the DSH `standard` preset from the tested DSH release — `@deepseek-ai/dsh-web-app/presets/standard.patch.yml` inside the installed application. Only four locations intentionally differ:

1. `persona` — the coordinator constitution replaces the standard persona.
2. `skill-filesystem` — an extra `customSkillDirs` entry exposes the plugin's `skills/` directory, so `dev-pipeline` is discoverable.
3. `tool-subagent-control` — `interrupt: true` is enabled so the coordinator can stop children.
4. `tool-subagent` — `agentPreset: dev-worker` makes every `subagent` call use the lean executor preset automatically.

Everything else (tool plugins, `time-context`, `tool-schedule`, `tool-office`, goal/planning/compaction groups, platform-conditional shell tools, plugin-manager tools, workflow tools) is inherited from that baseline, including any changes DSH made in that release. The executor preset (`preset-dev-worker`) is intentionally small and is not a copy of `standard`.

**After upgrading DSH:**

1. Locate the new `standard.patch.yml` in the upgraded installation and read it.
2. Diff its plugin rows and config keys against `preset-dev` in `cordis.patch.yml`.
3. Port the changes: add new rows, remove deleted ones, rename changed fields or plugin packages. Keep the four deliberate differences above; do not overwrite them with the standard values.
4. If the new baseline requires a newer DSH, raise `engines.dsh` and document the change in the CHANGELOG. If it only adds optional tools, keep the floor and verify the new rows exist before adding them.
5. Reinstall the bundle, start a new session, confirm both presets are active, then run the smoke tests in [MAINTAINING.md](MAINTAINING.md).
6. If a needed plugin package is not available in the older DSH you support, either drop the row or raise the floor — do not reference a package the installation does not ship.

**Drift symptoms if this is skipped:** missing or renamed tools in the coordinator, a preset that fails to activate, silent loss of a newly added capability, or a generated prompt that references a plugin the current DSH does not have. The v2.0.0 release notes list the specific sync work done for `0.2.2-rc.3`; use them as the reference for how the baseline should look.

## Upgrading from v1

v2.0.0 replaced the v1 runtime. The user-visible breaking changes:

| Concern | v1 (≤ 1.1.x) | v2 (2.0.0+) |
| --- | --- | --- |
| Implementation/testing execution | A local background "minimal" DSH session driven by Node scripts (`coder.mjs`, `lib.mjs`) | Native `subagent` activations with the `dev-worker` preset |
| Transport and authentication | Local HTTP `/api`, browser cookie, port probing | Removed; no transport or authentication layer |
| Control commands | `selfcheck`, `preflight`, `start`, `send`, `wait`, `read`, `list` | Removed; replaced by `subagent`, `subagent_fork`, `send_message`, `list_agents`, `interrupt_agent` |
| Waiting for a worker | 540-second polling | Completion notices, no polling |
| Permission-denied behavior | `danger-full-access` auto-reopen on permission failure | Explains the block and offers options; no auto-escalation |
| Process state | `status.json`, `logs/coder-*.json` | `status.md`, `reports/build-N.md`, `qa/`, `delivery.md` |

**Migration steps:**

1. Upgrade the same way you installed: in-app **Plugins** settings, or `dsh plugin --profile <profile> add …`. For local-directory installs, remove the old bundle first and then add it again to avoid `ambiguous-install`.
2. Start a **new session** and choose Developer Mode. Existing sessions are not migrated and keep their old composition; the v1 command set no longer exists, so do not expect an old session to drive v2 workers.
3. Continue an in-flight project from its on-disk records: `.dsh-dev/plan.md`, `status.md` (v1 projects may not have one), `qa/`, and the existing source. v2 reads `.dsh-dev/plan.md` and QA records directly; there is no converter and none is needed.
4. Old `status.json` and `logs/coder-*.json` files are dead weight. They are not read or updated by v2 and can be deleted. Keep `plan.md`, `qa/`, and `backup-*` folders if you want the project history.
5. If a script or automation called the v1 commands, it must switch to DSH-native subagent tools; v2 provides no compatibility shim.

The full breaking-change list is in [CHANGELOG.md](../CHANGELOG.md).

## Generated-program runtime selection

The pipeline chooses what the machine can actually run, rather than making the user install a toolchain first. The decision table from `skills/dev-pipeline/references/archetypes.md` is summarized here:

| Situation | First choice | Where it runs |
| --- | --- | --- |
| Persistent data, long-term use, double-click launch | Python desktop (tkinter + SQLite + PyInstaller) | Python 3.10+, packaged as a Windows app |
| Small command-line or batch tool | Python CLI, or Node CLI when Python is absent | Python / Node on the same machine |
| Display, calculation, printing, no durable data | Single-file local web page | Any local browser, no runtime |
| Existing program | Edit in place with its current stack, after a backup | Whatever the program already needs |
| Native window requirements with a .NET SDK already installed | .NET WinForms | .NET SDK |
| Login, payment, multi-user, server-hosted product | Not attempted as one pass; reduce to a local single-user MVP first | — |

Detection and constraints worth knowing:

- Python must be real, not the Windows Store placeholder: the pipeline verifies `python -c "print(1)"` rather than trusting `python --version`. `py -3` is checked as an alternative.
- Node is used when present (roughly 18+ expected; no strict check is documented). Electron is not a default choice — packaging is large and slow.
- A local web page must not use external CDNs; data in `localStorage` must come with JSON export/import and a plain warning that clearing browser data loses it. It is not offered for important or account/payment data.
- Packaging is local to the chosen stack: PyInstaller is installed into a project `.venv`, one-folder output is preferred (faster startup, fewer antivirus false positives), and the whole folder is copied to the final location. Unsigned executables trigger SmartScreen; the plugin does not sign them.
- If no suitable runtime exists, the mode offers two or three viable alternatives and says what would need to be installed. It does not silently install system software, and it does not promise cross-compilation: the artifact is built on the user's machine.

## Version compatibility policy

Plugin versioning follows semver as far as the preset behavior allows:

- **MAJOR** — a changed runtime/execution model or removed behavior (v1→v2 removed the HTTP/script driver and its commands).
- **MINOR** — new stages, artifacts, lanes, templates, or supported DSH baselines.
- **PATCH** — documentation, wording, packaging, and fixes that do not change the contract.

Preset ids `dev` and `dev-worker` are treated as stable API. The DSH floor may rise in a major release when a new baseline requires it; minor releases aim to stay installable on the declared floor. The plugin does not pin a maximum DSH version, so a newer DSH is unverified rather than forbidden — sync and test before relying on it.

## Known limitations

- **Windows-only testing.** macOS and Linux are untested; generated-project conventions are Windows-oriented.
- **One DSH version verified.** `0.2.2-rc.3` was tested; later releases are unverified until the standard-preset sync is done.
- **GUI acceptance is partially manual.** Complex mouse interactions are reported as `BLOCKED` with manual self-check steps; they are not silently counted as passing.
- **Unsigned executables.** SmartScreen warnings are documented, not removed; there is no code-signing certificate.
- **Permissions are deployment-owned.** Restricted permission modes can prevent writes or process launches; the mode explains the block instead of escalating.
- **The `desktop` profile is CLI-off-limits.** Use the in-app plugin settings for it.
- **Preset ids can collide.** The fix is a manual id rename in `cordis.patch.yml`; see [Preset-id conflicts](#preset-id-conflicts).
- **Local-directory reinstalls can be ambiguous.** Remove before adding to avoid `ambiguous-install`.
- **Plugin detail pages are untested across DSH platforms.** The routing (`locale/*.json` → `docs/DETAIL*.md`) is part of the package, but rendering is not verified everywhere.
- **The agent speaks primarily Chinese and English.** Other-language READMEs describe the plugin; they do not make the agent localize its work. See [TRANSLATIONS.md](TRANSLATIONS.md).
- **No server-scale systems.** Login, payment, multi-user, and hosted products are reduced to a local MVP first, by design.
- **Quality depends on the model.** The pipeline enforces process and evidence, not model capability; a weak model may fail gates or need more fix rounds.

## Reporting an incompatibility

Include: plugin version (`package.json` / `plugin_manager` `list_bundles`), DSH version (`dsh --version`) and install type (desktop app or CLI profile), operating system and build, the exact install command or UI path, the observed error, and whether the session was newly created. Do not include tokens, profile secrets, or personal file paths. For security issues, follow the private reporting channel described in [`SECURITY.md`](../SECURITY.md); do not open a public issue.
