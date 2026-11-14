# dsh-dev-mode documentation

This directory is the English documentation center for **dsh-dev-mode**, the Developer Mode agent preset for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). The English pages are written for **contributors, maintainers, plugin reviewers, and international users** who want to understand how the mode works internally.

> [!NOTE]
> Chinese-speaking end users do not need these pages. Start with the Chinese project page **[README.zh-CN.md](../README.zh-CN.md)** and the Chinese plugin detail page **[DETAIL.md](DETAIL.md)**. The English docs describe the same behavior for people who contribute to or review the plugin; they are not a replacement for the Chinese README.

## Start by role

| I want to… | Read |
| --- | --- |
| Install the plugin and build something with it | [README.md](../README.md) (quick start), then [FAQ.md](FAQ.md) |
| Understand how the coordinator, worker, and subagents fit together | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Check whether my DSH version or operating system is supported | [COMPATIBILITY.md](COMPATIBILITY.md) |
| Fix a problem (missing mode, permissions, SmartScreen, data) | [FAQ.md](FAQ.md) |
| Maintain, verify, or release the plugin | [MAINTAINING.md](MAINTAINING.md) |
| Translate a README or review translations | [TRANSLATIONS.md](TRANSLATIONS.md) |
| Read the plugin-manager detail page | [DETAIL.en.md](DETAIL.en.md) (English) · [DETAIL.md](DETAIL.md) (简体中文) |

## Document index

| Document | Audience | What it covers |
| --- | --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Contributors, reviewers | The two presets (`dev`, `dev-worker`), the native-subagent data flow (`subagent`, `subagent_fork`, `interrupt_agent`), the difference from the v1 HTTP/script design, the seven stages, the seven quality gates (G0–G6), artifact contracts, and failure recovery. |
| [COMPATIBILITY.md](COMPATIBILITY.md) | Users, maintainers | DSH 0.2.2+ requirement and `engines.dsh`, the Windows-only tested platform, preset-id conflicts, the `standard`-preset baseline and its upgrade procedure, v1→v2 migration, generated-program runtime selection, and known limitations. |
| [FAQ.md](FAQ.md) | Users, support | Install and new-session rules, the desktop-managed profile, permissions and sandboxing, SmartScreen, where data lives, backup/restore, uninstall behavior, the removed v1 commands, missing runtimes, duplicate modes, time/cost, and privacy/logs. |
| [MAINTAINING.md](MAINTAINING.md) | Maintainers | Local install/reinstall, activation checks, L0/worker/E2E smoke tests, `npm pack --dry-run`, version consistency across `package.json`/`CHANGELOG.md`/tag, the release flow, CI checks, translation upkeep, standard-preset sync, rollback, and security reports. |
| [TRANSLATIONS.md](TRANSLATIONS.md) | Translators, maintainers | English as the canonical language, the three-language status table, how to add a language, language-bar rules, what must not be translated, the agent's current reply-language limits, and what CI does and does not validate. |
| [DETAIL.en.md](DETAIL.en.md) | Plugin-manager readers | The English plugin detail page: positioning, who it is for, how to use it, the seven stages, guarantees, environment requirements, and known limitations. |
| [DETAIL.md](DETAIL.md) | Plugin-manager readers (Chinese) | The Simplified Chinese plugin detail page; the counterpart of `DETAIL.en.md`. |
| [../README.md](../README.md) | Everyone | The canonical English project page: overview, install, quick start, generated layout, requirements, and status. |
| [../README.zh-CN.md](../README.zh-CN.md) | Chinese users | Simplified Chinese project page with the same structure as the English README. |
| [../README.zh-TW.md](../README.zh-TW.md) | Chinese users | Traditional Chinese project page with the same structure as the English README. |
| [../CHANGELOG.md](../CHANGELOG.md) | Everyone | User-visible changes per release, including the v1→v2 breaking changes. |
| [../skills/dev-pipeline/SKILL.md](../skills/dev-pipeline/SKILL.md) | Contributors | The seven-stage SOP the agent loads at the start of a task (written in Chinese, matching the coordinator's primary working language). |
| [../cordis.patch.yml](../cordis.patch.yml) | Contributors | The bundle patch that declares both presets and their plugin lists. |
| [../package.json](../package.json) | Contributors, maintainers | Plugin metadata, `engines.dsh`, bundle declaration, and the file list shipped in the package. |

## Documentation conventions

- **English is canonical.** `README.zh-CN.md`, `README.zh-TW.md`, and `DETAIL.md` are translations. When behavior changes, update the English text first, then the translations; see [TRANSLATIONS.md](TRANSLATIONS.md).
- **Verified vs. unverified.** "Tested" in these docs means maintainers actually ran the flow on Windows 10/11 with DSH `0.2.2-rc.3`. Anything else is labelled *untested* or *expected*; no undocumented platform or version claim is implied.
- **No fabricated evidence.** There are no mock screenshots or invented test results in this documentation. Where behavior cannot be observed automatically (for example complex GUI interactions), the docs say so.
- **Commands, paths, and identifiers are literal.** Preset ids (`dev`, `dev-worker`), artifact names (`plan.md`, `qa-N.md`), and machine markers (`BUILD=`, `QARESULT=`) keep their original spelling in every language.
- **Links are relative to this directory** and are checked by repository CI for resolution only; CI does not validate the semantics of what is written.
- **Scope.** These pages describe the plugin, not DeepSeek Harness itself. For engine-level behavior (profiles, sessions, plugin manager, permission modes), use the DSH documentation shipped with your installation.

## Status of this documentation set

This documentation matches plugin version **2.0.1** (`package.json`) and the repository layout introduced for that release. It intentionally does not claim that CI is green, that macOS/Linux has been tested, or that the plugin works on DSH versions newer than the ones listed in [COMPATIBILITY.md](COMPATIBILITY.md).
