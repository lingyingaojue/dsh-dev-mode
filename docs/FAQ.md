# FAQ

Answers are written for people using the plugin, not for maintainers. Each answer is meant to be specific; where something has not been verified, it says so. For design details see [ARCHITECTURE.md](ARCHITECTURE.md); for version and platform boundaries see [COMPATIBILITY.md](COMPATIBILITY.md).

## Topics

[Installation and sessions](#installation-and-sessions) · [Using the mode](#using-the-mode) · [Permissions and security](#permissions-and-security) · [Data, backup, and uninstall](#data-backup-and-uninstall) · [v1 and runtimes](#v1-and-runtimes) · [Time, cost, and privacy](#time-cost-and-privacy) · [Platforms, limits, and support](#platforms-limits-and-support) · [Quick troubleshooting](#quick-troubleshooting)

## Installation and sessions

### How do I install the plugin?

**Desktop app (recommended):** open **Settings → Plugins → Install**, enter `github:lingyingaojue/dsh-dev-mode` (or the path to a local checkout), install, then **start a new session** and choose **Developer Mode**.

**CLI, for a profile you manage yourself:**

```powershell
dsh plugin --profile <your-profile> add github:lingyingaojue/dsh-dev-mode
```

Installing into one profile does not affect any other profile.

### Why must I start a new session?

DSH composes a session's presets, plugins, and tools when the session is created. An installed bundle becomes available to sessions created **after** activation; an already-open session keeps its original composition. Renaming the session, sending a new message, or reinstalling does not recompose it. This is DSH behavior, not a plugin limitation, and it is also why an upgrade only takes effect in a new session.

### Why can't I install it into the `desktop` profile from the CLI?

A profile managed exclusively by the desktop app (named `desktop`) rejects CLI install and remove commands. The app owns that profile's state; DSH protects it from out-of-band changes so the in-app plugin list stays consistent. Use **Settings → Plugins** for the desktop profile; use the CLI only for profiles you manage yourself.

### I installed it, but the mode is not in the list

Check in this order:

1. **Did you start a new session?** See above.
2. **Was it installed into the profile this session uses?** Presets are per profile.
3. **Is the bundle active?** Ask the agent to run `plugin_manager` `list_plugins`; `preset-dev` and `preset-dev-worker` should both be active. `list_bundles` should show `dsh-dev-mode` at the expected version with the application applied.
4. **Are you looking for the right names?** The entries are **Developer Mode** (`dev`) and **Developer Mode · Executor** (`dev-worker`). The second one is internal.
5. **Did DSH ask for a restart?** If the bundle reports `restart-required`, restart the app, then create a new session.
6. **Is DSH new enough?** The plugin requires DSH `0.2.2-rc.3` or newer (`engines.dsh: >=0.2.2-rc.3`). An older engine may refuse the install or fail to load the preset.
7. **Is there an id conflict?** An error mentioning a duplicate agent preset means another preset already uses `dev` or `dev-worker`. See [COMPATIBILITY.md](COMPATIBILITY.md#preset-id-conflicts).

### Why are there two Developer Mode entries?

`dev-worker` is the internal executor preset. The coordinator starts it automatically through the `subagent` tool; it is not meant to be selected manually. It is listed so that the composition is visible and inspectable. If you select it manually, you get a background worker with no user-facing workflow — use **Developer Mode** instead.

### Why do I see a duplicate preset after reinstalling?

Most often there are two copies of the bundle in the same profile (for example an in-app install plus a CLI install, or a stale local-directory link from a failed reinstall). Uninstall both, then install one copy again. If the duplicate comes from a different plugin that also uses the id `dev`, see [Preset-id conflicts](COMPATIBILITY.md#preset-id-conflicts).

### How do I upgrade or uninstall?

Upgrade by installing again the same way you installed. For **local-directory** installs, remove the old bundle first and then add it again, otherwise the install can fail with `ambiguous-install`. Existing sessions keep their composition; new sessions use the new version.

Uninstall with the in-app plugin settings or, for a non-desktop profile:

```powershell
dsh plugin --profile <your-profile> remove dsh-dev-mode
```

Uninstalling the plugin does **not** delete generated programs, their data, or `.dsh-dev/` records (see below).

## Using the mode

### What should I type?

Describe the outcome, not the technology. Useful details: who it is for, what must be possible, whether the data matters, whether an existing program must keep its old data, and where the program should live. For example:

> Build a small bookkeeping tool in this folder: add an entry, list entries, show the balance, and keep the data after closing and reopening. I don't know programming; choose the approach yourself.

The coordinator asks **at most one round** of questions, and only questions that you alone can answer (scope, data importance, location). Technical choices are made for you and summarized in one sentence.

### What exactly do I get?

- a runnable artifact (a Windows desktop app, a command-line tool, or a local web page, chosen from what the machine can run);
- a plain-language user manual: how to open it, how to use it, where data lives, how to back up and restore, how to uninstall;
- an acceptance table with one row per criterion: how it was verified, the result, and the evidence path;
- a short self-check list (typically 3–5 "click here → see this" steps) you can use to verify the result yourself;
- a `.dsh-dev/` process record in the project folder (plan, status, build reports, QA reports, evidence, delivery notes, backups).

### Can it change a program I already have?

Yes. Say "change `<program>` to `<requirement>`". The mode copies the original into `.dsh-dev/backup-<timestamp>/`, runs the existing build/tests as a baseline, makes the smallest change that satisfies you, and runs a regression check. Data-structure changes are backed up, tested on a copy, and applied only after success. It is instructed not to refactor beyond the request or to switch stacks.

### Can I stop it or change my mind?

To stop, tell the coordinator to stop (for example "stop, don't continue"). It interrupts every running child agent, saves `status.md`, and tells you what was preserved and what can continue later. If you close the app while children are running, those children cannot continue; the on-disk records remain and a new session can pick up from `status.md`. If you add a requirement while a round is running, it is recorded and passed to the next round instead of interrupting a file write.

### Does it commit or push anything?

Within a generated project that is already a git repository, the mode may commit green rounds locally (the skill allows it). It does not push, does not add remotes, and does not commit outside the project workspace. If the project is not a git repository, it uses `.dsh-dev/backup-*` folders and `status.md` instead. The plugin itself is not modified by normal use.

### How do I verify it is not just claiming success?

Read the acceptance table and open the evidence paths under `.dsh-dev/qa/evidence/`. Every `PASS` must have a method, a result, and evidence; anything that could not be verified is `BLOCKED` with a reason. You can also follow the self-check list yourself and rerun the self-test command from the manual. The mode is explicitly forbidden from inferring a pass from source code or from reporting untested behavior as working.

## Permissions and security

### What permissions does it need?

Whatever the DSH deployment grants the session. The plugin does not choose a permission mode and does not add its own sandbox. Subagents inherit the coordinator session's permission scope; the coordinator is instructed to stay inside the project workspace and the data directory. Important consequences:

- If the session is read-only, the executor cannot write files or launch programs. Pick a permission mode that allows workspace writes for the project.
- The path restrictions in the executor's task brief are instructions to the model, not an enforceable sandbox. The real boundary is DSH's permission system.
- Keep projects out of `Program Files` and other protected locations; choose a writable workspace.
- The mode does not auto-escalate. In v2 it never reopens work with `danger-full-access` after a denial; it explains the block and offers two options: widen the permission mode yourself, or move the project to a writable folder.

### Why did an operation fail with "access denied" or a sandbox error?

Common causes: the workspace is outside the writable scope, the target is a protected path (`Program Files`, another user's profile), a process launch is blocked, or a data directory such as `%LOCALAPPDATA%` is not writable under the current permission mode. The documented fallback is to test data code with `APP_DATA_DIR` pointed at a temporary folder inside the workspace and mark the real data-directory check `BLOCKED` — it must not be reported as verified. To actually fix it, change the permission mode or the workspace; repeating the same denied operation is not a fix.

### Will it install software without asking?

It installs only dependencies named in the approved plan, with a one-line explanation beforehand, and typically into a project-local `.venv` for Python. It is instructed not to install system-wide software silently, not to run `curl | iex`-style commands, and not to add unknown packages. If a runtime is missing, it offers alternatives instead of installing one on its own.

### SmartScreen says the program is unsafe. Is it malware?

The executable is built locally and is **not code-signed**, so Windows SmartScreen shows the "unrecognized app" warning. The manual explains the normal path: **More info → Run anyway**. This is a property of unsigned builds, not evidence of malicious behavior — but it is also not proof of safety. Review the source in the project folder if you care, and do not bypass an organizational policy that blocks unsigned executables; the mode cannot and will not do that for you. Some antivirus products also flag PyInstaller output; one-folder builds are chosen partly to reduce false positives.

## Data, backup, and uninstall

### Where is my data stored?

There are two separate things:

1. **Program data** produced by the generated program. The default convention is a per-user application data directory (`%LOCALAPPDATA%\<ASCII app name>` on Windows), containing the database, a `backups/` folder, and `logs/app.log` in the Python desktop starter. The exact layout is stated in the user manual and in the project's `AGENTS.md`. Test runs override it with `APP_DATA_DIR` so they never touch real data.
2. **Process records** produced by the mode: `<workspace>/程序/<name>/.dsh-dev/` with `plan.md`, `status.md`, `reports/`, `qa/`, `delivery.md`, and source backups.

The plugin itself adds no separate database. DSH manages profiles, installed plugins, and session history in its own data directory.

### How do I back up and restore?

For the generated program: close it, copy the program's data folder to a safe place. To restore, close the program, copy the backup database back over the current one, and reopen. The manual includes the exact paths and steps. The Python starter also keeps up to 10 automatic backups in `backups/backup-<timestamp>-<reason>.db`; restore is a file copy, not a deletion of the current database. Back up before changing anything important, and test the restore once instead of trusting the description.

For the project itself: copy the project folder, or rely on the `.dsh-dev/backup-<timestamp>/` copies made before modifying an existing program. `.dsh-dev/` is a process record, not a backup of your program data.

### Does uninstalling the plugin delete my programs or data?

No. Uninstalling the plugin removes the plugin from the DSH profile. Generated programs, their data folders, and `.dsh-dev/` records stay exactly where they are. Uninstalling a generated program (if it has its own uninstaller) is a separate action and is documented to keep user data by default. Deleting a project folder removes its `.dsh-dev/` records but not the program's data in the user data directory.

### Can I delete `.dsh-dev/`?

Yes. It is a process record — plan, build reports, QA reports, evidence, delivery notes, and source backups — and the delivered program does not need it. Keeping it is useful for later changes or for auditing how the result was verified. It is ignored by this repository's `.gitignore`, so it will not be committed to the plugin repository by accident.

## v1 and runtimes

### Where did the v1 scripts and commands go?

They were removed in v2.0.0. The Node scripts `coder.mjs` and `lib.mjs` and the commands `selfcheck`, `preflight`, `start`, `send`, `wait`, `read`, and `list` no longer exist, and there is no local HTTP driver, cookie, port, or 540-second polling. Implementation and testing use DSH-native `subagent` calls with the `dev-worker` preset, `subagent_fork` for L2 plan review, and `interrupt_agent` to stop work. Old `.dsh-dev/plan.md` and QA records remain readable; old `status.json` and `logs/coder-*.json` are no longer produced or updated and can be deleted. See [CHANGELOG.md](../CHANGELOG.md) for the complete list.

### What if I don't have Python or Node installed?

The plugin itself needs neither. For the generated program, the pipeline checks what the machine actually has and picks a stack: Python desktop/CLI if Python 3.10+ is really usable (the Windows Store placeholder is detected by actually running `python -c "print(1)"`), Node CLI/server if Node is available, a single-file local web page if only a browser is present and the task does not need durable data, or .NET when its SDK is already installed. If nothing suitable exists, it offers two or three alternatives and explains what would need to be installed — it does not silently install a system runtime. A local web page stores data in the browser and must provide JSON export/import, which is not a substitute for a real database.

### Which stack will it choose for my program?

The default for "has data, used long-term, double-click to open" is a Python desktop app (tkinter + SQLite, packaged with PyInstaller). Small command-line tools use Python or Node; display-only tools may be a single local web page; Electron is not a default because packaging is large and slow. If a program already exists, its current stack is kept with a backup first. The full decision table and packaging conventions are in [COMPATIBILITY.md](COMPATIBILITY.md#generated-program-runtime-selection).

## Time, cost, and privacy

### How long does it take?

There is no fixed promise; it depends on size, machine speed, and model speed. As a rough shape: an L0 quick fix is usually minutes rather than hours; an L1 small program takes longer because it includes a plan, a builder round, and an independent tester; an L2 project with data, packaging, review, and clean-state installation can take substantially longer, especially when builds or fix rounds are needed. The coordinator reports progress as "where we are / do you need to do anything / roughly how much longer", and it does not claim a completion time it cannot support. Waiting time can be idle from your side: once a builder starts, the coordinator ends its turn and resumes when the child reports.

### What does it cost?

The plugin is MIT-licensed and free. The cost is model usage, billed by your model provider under your DSH configuration; the plugin does not meter or charge anything. Developer Mode generally uses more tokens than a plain chat because it runs planning, implementation, independent testing, and possibly several fix rounds, and subagents run as separate model calls. Very large L2 tasks with packaging and repeated test cycles are the most expensive. You can reduce cost by keeping scope narrow, using L0 for small edits, and stopping early if the direction is wrong. L2 work may use a DSH goal that keeps the session working across turns; that continuation also consumes model usage until the goal is completed or paused.

### Is my data private? What is logged?

The plugin itself adds no telemetry and no network service of its own. It runs DSH tools inside your session, so whatever DSH sends to your configured model provider (prompts, tool results, file contents the agent reads) is handled under DSH's and your provider's policies — Developer Mode does not change that. DSH tools such as web search or fetch, when the agent uses them, follow your DSH configuration. Generated programs run locally and store data locally; they may write local logs such as `logs/app.log`. `.dsh-dev/qa/evidence/` can contain command output, logs, screenshots, and file paths, and the project record can contain paths and usernames; treat it as sensitive and do not publish it or commit it to a public repository. Do not put passwords, API keys, or personal data into prompts or project files unless you accept that they may be sent to the model provider and recorded in session history. The instructions tell the agent not to delete your data and to keep screenshots limited to program windows, but you should still review evidence before sharing it.

## Platforms, limits, and support

### Does it work on macOS or Linux?

It is **not tested** there. Windows 10/11 is the only platform with recorded verification, and generated-program defaults are Windows-oriented (`%LOCALAPPDATA%`, `.exe`, shortcuts, SmartScreen). The bundle switches the shell tool to bash on non-Windows so the composition can load, but behavior and packaging on macOS/Linux are unverified. Treat any such run as experimental and report what you find.

### What are the known limitations?

The short list: Windows-only testing; one DSH version verified; complex GUI interactions cannot always be automated and are marked `BLOCKED`; executables are unsigned and trigger SmartScreen; permissions are controlled by the deployment; preset-id conflicts are fixed manually; the `desktop` profile cannot be managed from the CLI; local-directory reinstalls need remove-then-add; plugin-detail rendering is not verified on every DSH platform; the agent currently works primarily in Chinese and English; and login/payment/multi-user/server-hosted systems are reduced to a local single-user MVP first. The maintained list with details is in [COMPATIBILITY.md](COMPATIBILITY.md#known-limitations).

### How do I report a bug or get help?

Include the plugin version (`plugin_manager` `list_bundles`), DSH version (`dsh --version`) and install type, operating system, the exact steps, the observed error, and whether the session was new. Do not include tokens, secrets, or personal paths. Bug reports and support questions go through the repository's issue tracker; read [CONTRIBUTING.md](../CONTRIBUTING.md) and the [project README](../README.md#contributing) first. Report security problems privately via [SECURITY.md](../SECURITY.md), not in a public issue.

## Quick troubleshooting

| Symptom | First checks |
| --- | --- |
| Mode not in the list | New session, correct profile, bundle active, both presets listed, DSH new enough, no id conflict |
| Mode appears twice | Duplicate bundle install or another plugin owns the preset id; remove one, or rename ids |
| Subagent does not start | Check `plugin_manager` state; retry once after reinstall; the coordinator can implement directly if the executor preset is unavailable |
| Nothing seems to happen | The coordinator waits for a completion notice by design; ask for status, which uses `list_agents` and `status.md`, instead of assuming it is stalled |
| Work hangs in a round | Most often a command waiting for keyboard input; the coordinator should interrupt and re-dispatch with non-interactive flags |
| Build or test fails | Read `.dsh-dev/reports/build-N.md` and the latest `qa/qa-N.md`; the fix goes back to the same builder, then a fresh tester re-tests |
| Access denied | Workspace not writable or protected path; change permission mode or move the project; do not repeat the same denial |
| SmartScreen warning | Expected for unsigned local builds; manual explains "More info → Run anyway"; do not bypass organization policy |
| Data seems missing | Check the data folder and `backups/` documented in the manual; restore by copying a backup while the program is closed |
| `.dsh-dev/` missing | It is created under the project folder during work; if it was deleted, the mode can reconstruct an approximation from the source and build artifacts, but the recorded history and evidence are gone |
