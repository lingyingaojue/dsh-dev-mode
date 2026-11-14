## Summary

<!-- What does this PR change, and why? Link the related issue. -->

Closes #

## Type of change

- [ ] Bug fix
- [ ] Feature / preset or skill behavior
- [ ] Documentation
- [ ] Translation
- [ ] Template / starter project
- [ ] CI / repository tooling
- [ ] Other (describe below)

## How was this tested?

<!--
Commands you ran and what you observed. If the change affects runtime behavior,
describe the session you used (new session, preset dev or dev-worker, DSH version, OS)
and what you checked in `.dsh-dev/`.
-->

```text
node scripts/ci-check.mjs
```

- [ ] Ran in a **new session** after reinstalling the bundle (required for runtime changes).
- [ ] Checked **both presets**: `dev` and `dev-worker`.

## Documentation and translations

<!-- Which docs/README files need to change? Is a translation follow-up needed? -->

- [ ] Documentation updated for user-visible changes.
- [ ] Translation impact considered (see `docs/TRANSLATIONS.md`); no machine-translation dumps.

## Checklist

- [ ] I did **not** change the runtime (`cordis.patch.yml`, `skills/**`) — or the summary explains the behavior impact.
- [ ] `node scripts/ci-check.mjs` passes locally, and CI is green.
- [ ] No secrets, tokens, cookies, API keys, session URLs, personal paths, or unredacted `.dsh-dev` logs/screenshots are included.
- [ ] Every added or changed link resolves.
- [ ] Version numbers and released `CHANGELOG.md` headings are untouched (the maintainer cuts releases).
- [ ] I read the [contributing guidelines](https://github.com/lingyingaojue/dsh-dev-mode/blob/main/CONTRIBUTING.md) and follow the [Code of Conduct](https://github.com/lingyingaojue/dsh-dev-mode/blob/main/CODE_OF_CONDUCT.md).

## Screenshots and logs (redacted)

<!--
Optional. Crop or blur anything personal. Paste short text excerpts instead of whole logs.
Do not include tokens, cookies, API keys, private paths, or private data.
-->
