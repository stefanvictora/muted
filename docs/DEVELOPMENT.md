# Development

## Structure

`core/` contains domain rules, the state schema, message validation, and the filtering decision.
`services/coordinator.js` owns the loaded state and serializes changes. Tab reconciliation runs
outside this queue so a sleeping tab cannot block the popup or new pages.
`background.js` connects browser events to the coordinator; `content/` applies the filter.
The popup and settings page share small helpers in `ui/`. There is no framework or build step.

All interface messages live in `_locales/de/messages.json` and `_locales/en/messages.json`.
`chrome.i18n` selects the browser's interface language, including regional variants;
`default_locale: "en"` makes English the fallback. `ui/i18n.js` translates text, placeholders,
and screen-reader labels through `data-i18n` attributes and formats times using the browser locale.
Validation errors use stable `error_…` identifiers and are translated in the UI or when the worker
responds. Original browser API diagnostics are preserved. Add new messages to both catalogs.

The product name is Muted. The internal identifiers `local-grayscale`, `local-grayscale-pause`,
`local-grayscale-v1-active`, and `__localGrayscaleV1` remain stable for existing script registrations,
pauses, and previously injected controllers. New exports use `muted.json`; new packages use `muted-…`.

## When work runs

| Trigger | Work |
|---|---|
| Worker wakes | Read state and global access once; reconcile the alarm and registration |
| Registration is unchanged | No re-registration or global tab query |
| Registration is new/changed or a pause has expired | Reconcile existing tabs |
| Status request / new document | Evaluate loaded state; handle an expired pause if necessary |
| Tab loads or wakes | Reconcile only that tab |
| A known tab is activated | No reinjection if its state is already confirmed |
| Tab closes | Remove its temporary status |
| Settings / pause / permissions change | Reconcile registration and open tabs |
| Reconciliation finishes | Notify open interfaces; no periodic polling |

Global access is checked at worker startup, on permission events, and after an explicit permission
button click. Individual domain grants are no longer managed. A field from older permission
transitions is converted into the intended lists and mode only when reading old settings;
the new runtime no longer creates those transitions.

Revisions protect against delayed responses, including across worker restarts. Tab operations
have a deadline and run in groups of at most four. Activations already sent to a tab recheck
the current state when they actually run. Known sleeping/discarded tabs are skipped.
Permission loss or unconfirmed filter removal can trigger a reload message.

## Formatting and verification

Use Node.js 22.12 or newer and run `npm ci` to install the development tools from
`package-lock.json`. Oxfmt is pinned as a development-only dependency and is not included
in the installable extension.

- `npm run format` formats code in `.github/`, `extension/`, `tests/`, and `tools/`, plus `package.json`
  and `.oxfmtrc.json`.
- `npm run format:check` checks the same files without changing them.
- `npm run check` checks formatting and then runs the behavior tests.

The workflow in `.github/workflows/ci.yml` runs `npm ci` and `npm run check` on every
push and pull request, using Node.js 24 on Ubuntu. It uses read-only repository permissions
and pins the checkout/setup actions to specific release commits.

The configuration uses two spaces, single quotes in JavaScript, semicolons, a 100-character
print width, and LF line endings. It does not sort imports or package fields. Generated test
artifacts, release snapshots, and historical evidence reports are excluded.
After formatting runtime files, `npm run package` refreshes `release-manifest.txt` as part
of creating a new verified package.

`npm test` runs behavior tests with Node. Coverage includes pure logic, public worker commands,
browser events using an API double, and the controller at the DOM boundary.
For behavior changes, first add an appropriate failing test. Keep existing regression coverage;
expectations for the intentionally removed permission management were updated to the new model.

Run browser checks only for relevant changes, always with a separate test profile and local debug port:

- `node tools/browser-check.mjs <port> <name>`: options UI, actual file import, and export.
- `node tools/browser-i18n-check.mjs <port> <de|en>`: translations, screen-reader labels,
  validation errors, and layout. Start the isolated profile with `--lang=de`, `--lang=en-US`,
  or, to check the English fallback, for example `--lang=fr`.
- `node tools/browser-render-check.mjs <port> <name>`: controller/CSS with temporary `activeTab` access.
- `node tools/browser-responsiveness-check.mjs <port> --frozen`: sleeping tab, on/off and pause,
  selected mode with global access, and UI notifications.

The first three use the extension in `extension/`. The last uses a separate test copy with fixed
host permissions and does not replace testing the native consent dialog. These DevTools checks
require `--enable-unsafe-extension-debugging`; use only dedicated test profiles and close them
afterward. Results are written to `.test-artifacts/`.

After a change, a short manual check of the affected flow is sufficient. Do not repeat full
acceptance testing in both browsers; check special cases when relevant changes or failures warrant it.

## Optional packages

`npm run package` runs the tests and creates a new versioned folder containing the runtime,
short guides, and an automatically verified hash manifest. `--zip` also creates an archive
and requires Windows PowerShell. Packaging does not install the extension.
`node tools/verify.mjs <package-folder>` remains available as an optional comparison tool.
Historical verification records are not included in new packages.

`.gitattributes` keeps text files on LF line endings across platforms so the checked-in
runtime hashes also match a fresh checkout. PNG files remain binary.
