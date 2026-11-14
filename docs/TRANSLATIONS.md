# Translations

This page describes the language policy for the repository and the plugin: which language is canonical, what is translated today, how to add or update a translation, what must never be translated, what the agent actually replies in, and what CI does and does not check. For the documentation index see [docs/README.md](README.md).

## Language policy

- **English is canonical.** All technical truth, contributor documentation, the plugin detail page source of record, install instructions, and version notes are written in English first. `README.md` and the pages in this directory are the reference; translations follow them.
- **Chinese is the primary end-user onboarding language.** `README.zh-CN.md` and `README.zh-TW.md` are full project pages for Chinese users, and `docs/DETAIL.md` is the Simplified Chinese plugin detail page routed by `locale/zh.json`. Chinese users are pointed at those files rather than at this English documentation center.
- **The plugin UI ships Simplified Chinese and English strings only.** `locale/zh.json` and `locale/en.json` provide the display title, description, and detail-page path. There is no Traditional Chinese locale file today.
- **Translations are documentation, not runtime localization.** Translating a README does not change the language the agent works in or the language of the user manual it hands over. See [The agent's language behavior](#the-agents-language-behavior).

## Status

| Language | Tag | Files | Status | Plugin UI |
| --- | --- | --- | --- | --- |
| English | `en` | [`README.md`](../README.md), this `docs/` center, [`DETAIL.en.md`](DETAIL.en.md) | **Canonical** | [`locale/en.json`](../locale/en.json) |
| 简体中文 | `zh-CN` | [`README.zh-CN.md`](../README.zh-CN.md), [`DETAIL.md`](DETAIL.md) | Up to date with v2.0.1 | [`locale/zh.json`](../locale/zh.json) |
| 繁體中文 | `zh-TW` | [`README.zh-TW.md`](../README.zh-TW.md) | Up to date with v2.0.1 (README only) | No `locale/zh-TW.json`; the plugin UI is only available in the shipped zh/en strings |
| Other languages | — | — | Welcome — see below | Would need a new `locale/<lang>.json` |

Status values have a precise meaning:

- **Canonical** — the source of truth; changes land here first.
- **Up to date** — checked against the current English version at the stated release. This is a human review statement, not an automated guarantee.
- **Out of date** — the English source has changed materially since the last translation review. Update it or mark it out of date; do not let it silently drift.

Only the README trio and the Chinese plugin detail page are translated today. The English `docs/` pages have no official translations; keeping several documentation centers in sync is a substantial maintenance commitment, so propose it before starting one. If accepted, a language subdirectory such as `docs/zh-CN/` with a link from this index is the least surprising layout, and English remains canonical.

## Adding a language

1. **Propose it first.** Open an issue (or comment on an existing translation issue) so two people do not translate the same language simultaneously and so the maintainer can confirm the effort is wanted. Translation PRs should be reviewed by someone fluent in the language.
2. **Copy [`README.md`](../README.md)** to `README.<BCP-47 tag>.md` (for example `README.ja.md`). Keep the structure, section order, tables, Mermaid diagrams, badges, and links. Translate prose, not layout.
3. **Keep the navigation anchors.** The top navigation uses fragment links such as `#why-developer-mode`. In translated files, add the same explicit anchors before the translated headings (the Simplified Chinese README uses lines like `<a id="why-developer-mode"></a>`) so the language-specific page still navigates correctly.
4. **Update the language bar in every README**, at the top and at the bottom: current language as bold text, all others as relative links, `·` separators, order English · 简体中文 · 繁體中文 · then new languages. Never update only one file.
5. **Register the file.** Add a row to the translations table in `README.md` and to the status table above. If the file should ship with the plugin, add it to `package.json` → `files`, and update the helper's expected file lists in `scripts/ci-check.mjs` (`README_FILES`, `REQUIRED_FILES`, and `PACKAGE_FILE_ENTRIES` where relevant); otherwise repository CI will not require or link-check the new file.
6. **Optional plugin UI localization.** A README translation alone does not add plugin UI strings. To localize the plugin-manager page you would add `locale/<lang>.json` with `meta.title`, `meta.description`, and `meta.detail` pointing at a translated detail page, and ship that page under `docs/`. This path is not currently exercised beyond Chinese; test it in a real DSH plugin-manager session before claiming support.
7. **Set the status** to *Up to date* only after a native/fluent review of the semantics, not just of the Markdown.

## Language-bar rules

- Present at the **top and bottom** of every README, in the same order, using relative links.
- The current language is **bold text, not a link**; other languages are links to their files: `<strong>English</strong> · <a href="README.zh-CN.md">简体中文</a> · …`.
- Language names are written in their own script (`English`, `简体中文`, `繁體中文`), not translated into the page language.
- Adding or removing a language updates every README in the same pull request. The bar is a navigation contract; a one-file update is a bug.
- Keep the bar outside translated prose sections so machine-translation edits cannot break it.

## What not to translate

Leave these exactly as they are, in every language:

- commands, flags, and code blocks: `dsh plugin --profile <profile> add …`, `<profile>`, `--profile`, `--yes`;
- paths and identifiers: `cordis.patch.yml`, `skills/dev-pipeline/`, `%LOCALAPPDATA%`, `APP_DATA_DIR`, `plan.md`, `qa/qa-N.md`;
- preset ids and bundle ids: `dev`, `dev-worker`, `preset-dev`, `preset-dev-worker`;
- machine markers and result values: `BUILD=OK|FAIL|BLOCKED`, `QARESULT=PASS|FAIL|BLOCKED`, `CHANGED=`, `REPORT=`;
- URLs, badge URLs, image paths, version numbers, license text, and Mermaid node/edge syntax (Mermaid *labels* may be translated, but keep the syntax intact);
- product and package names: DeepSeek Harness, DSH, `dsh-dev-mode`, MIT;
- links to English documentation pages that are not themselves translated.

Style guidance for the existing Chinese pages: Simplified Chinese uses mainland terminology; Traditional Chinese uses Taiwan/Hong Kong terminology (專案, 預設, 驗收, 資料, 設定, 外掛, 偵錯) and must not be a character-by-character conversion of the Simplified text.

## The agent's language behavior

The coordinator currently works primarily in **Chinese and English**. It speaks to the user in plain language and follows the language the user writes in; a user who writes in English gets English replies. The delivered user manual is written in plain language for the user and follows the coordinator's working language, and the manual template reflects that; there is no per-language manual system yet.

What this means for translators:

- A new README language is useful for discovery and onboarding, but it does not make the agent reply in that language, and it does not localize the manual, the error messages inside `.dsh-dev/` artifacts, or the plugin UI beyond the strings present in `locale/`.
- Do not promise full localization in a translated README. Say that the introduction is translated while the agent currently works in Chinese or English.
- If runtime localization is wanted, it is a separate feature: prompt/persona changes, artifact templates, and locale testing — not a documentation change.

## What CI checks

Repository CI runs static checks only: required files exist, package metadata and the expected package entries are present, relative links in Markdown resolve, the `package.json` version matches the first CHANGELOG version heading, preset markers and locale metadata are present, skill files respect a length limit, and `npm pack --dry-run` runs in the workflow. For translations this means:

- **Checked:** the file exists where the language bar and tables link to it (for the three READMEs the helper enumerates, and for `docs/*.md`); relative links inside a translated page point at real files; a shipped translation appears in the expected package entries.
- **Not checked:** translation quality, terminology, completeness, semantic equivalence, staleness versus the English source, heading-anchor parity, or whether the language bar was updated everywhere. CI does not machine-translate or diff translations.
- **Not scanned:** the helper's link check covers the three known READMEs and top-level `docs/*.md` only. Files in a new subdirectory (for example `docs/zh-CN/...`) are not link-checked until the helper is extended, so verify their links manually.

That gap is why the status column is maintained by humans and why reviewers are required. A link that resolves is not evidence that its text is correct.

## Translation review checklist

- [ ] Same section structure and order as the English source; no invented claims, screenshots, or test results.
- [ ] Language bar at top and bottom, current language bold, all other links working from the translated file's location.
- [ ] Commands, paths, ids, and machine markers copied verbatim.
- [ ] Install, upgrade, and troubleshooting steps match the canonical English text.
- [ ] Terminology consistent within the file and with the chosen regional variant.
- [ ] Status table updated in `README.md` and in this file.
- [ ] A fluent reviewer checked the meaning; the translator did not mark it *Up to date* alone.
