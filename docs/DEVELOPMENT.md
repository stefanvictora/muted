# Development

## Local workflow

Use Node.js 22.12 or newer. The extension runs directly from `extension/`, without a build
step or runtime dependencies. Oxfmt is a pinned development-only dependency.

```powershell
npm ci
npm run format              # Format code and workflow files
npm run check               # Check formatting and run all tests
npm test                    # Run tests only
```

GitHub Actions runs `npm ci` and `npm run check` on every push and pull request, using Node.js 24
on Ubuntu. Formatting covers `.github/`, `extension/`, `tests/`, `tools/`, `package.json`, and
`.oxfmtrc.json`. Text files use LF line endings; PNGs remain binary.

## Architecture

Paths below are relative to `extension/`:

- `core/` contains domain rules, state schema, message validation, and filtering decisions.
- `services/coordinator.js` owns loaded state and serializes changes. It reconciles tabs by
  updating their filters to match the current settings and permissions. This work runs outside
  the state queue so a sleeping tab cannot block the popup or new pages.
- `background.js` connects browser events to the coordinator; `content/` applies the filter.
- `popup/` and `options/` share interface helpers in `ui/`.

State and global access are loaded at worker startup. Status requests use that loaded state;
permission events and explicit access requests refresh permissions. An unchanged script
registration does not trigger re-registration or a global tab query.

Changes to settings or permissions, new script registrations, and expired pauses trigger
reconciliation of existing tabs. Tab load/wake events affect only that tab; a confirmed tab
is not reinjected on activation.
Closing a tab removes its temporary status. Interfaces receive change notifications after
reconciliation, without polling or triggering further notifications when reading status.

Revisions protect against delayed responses across worker restarts. Tab operations have a
deadline and run in groups of at most four; known sleeping/discarded tabs are skipped.
Delayed activations recheck the current state. Permission loss or unconfirmed filter removal
can require a page reload.

## Translations and compatibility

Messages live in `_locales/en/messages.json` and `_locales/de/messages.json`; add new messages
to both catalogs. `chrome.i18n` follows the browser language, with English as the fallback.
`ui/i18n.js` translates `data-i18n` attributes and formats times using the browser locale.
Validation errors use stable `error_…` identifiers; original browser API diagnostics are preserved.

Keep `local-grayscale`, `local-grayscale-pause`, `local-grayscale-v1-active`, and
`__localGrayscaleV1` stable: existing registrations, alarms, and injected controllers use them.
Older settings and exports are migrated when read, including interrupted permission transitions.
New exports use `muted.json`; packages use `muted-…`.

## Verification

Node tests cover pure logic, worker commands and browser events through an API double, the
controller at the DOM boundary, translations, and package integrity. For behavior changes,
first add an appropriate failing test and retain existing regression coverage.

For relevant browser changes, use a separate test profile with a local debug port and
`--enable-unsafe-extension-debugging`. Close the test browser afterward.

| Command | Scope |
| --- | --- |
| `node tools/browser-check.mjs <port> <name>` | Settings, actual file import, export |
| `node tools/browser-i18n-check.mjs <port> <de\|en>` | Translations, accessible labels, validation, layout |
| `node tools/browser-render-check.mjs <port> <name>` | Controller/CSS with temporary `activeTab` access |
| `node tools/browser-responsiveness-check.mjs <port> --frozen` | Sleeping tabs, on/off, pauses, selected mode, notifications |

Start language checks with `--lang=de`, `--lang=en-US`, or `--lang=fr` for the English fallback.
The responsiveness check uses a separate extension copy with fixed host permissions; it does
not test the native consent dialog. API doubles also cannot verify real permission dialogs,
sleep/wake lifecycles, or fullscreen rendering. Check those manually when the change affects them.
Reports and test screenshots belong in ignored `.test-artifacts/`, not in the maintained docs.

## Packaging and documentation

`npm run package` runs tests and creates a new versioned folder under `releases/`, with runtime
files, current guides, the README screenshot, and a verified SHA-256 manifest. It refreshes
`release-manifest.txt` without overwriting older packages or changing your loaded installation.
`npm run package -- --zip` also creates an archive and checksum using Windows PowerShell.
`node tools/verify.mjs <package-folder>` checks an existing package.

### Publish a GitHub release

Use Windows PowerShell and an authenticated GitHub CLI for these steps.

1. Set the same version in `extension/manifest.json` and `package.json`.
2. Update `CHANGELOG.txt` and write release notes in `docs/releases/<version>.md`.
3. Run `npm ci`.
4. Run `npm run check`.
5. Run `npm run package -- --zip`.
6. Commit the release changes, including `release-manifest.txt`, and push the commit.
7. Create a draft release with the ZIP and its `.sha256` file, using the pushed commit SHA:

   ```powershell
   gh release create v<version> <zip-path> <checksum-path> --repo stefanvictora/muted --target <commit-sha> --title "Muted <version>" --notes-file docs/releases/<version>.md --draft
   ```

8. Check the draft's version, notes, and both attached files.
9. Publish the draft:

   ```powershell
   gh release edit v<version> --repo stefanvictora/muted --draft=false --latest
   ```

Replace angle-bracket placeholders with the release's values. Keep existing tags and
published assets unchanged; use a new version for subsequent changes.

The README introduces the product; `INSTALLATION.md` covers usage and troubleshooting;
`SECURITY.md` explains permissions and limitations. Keep architecture and contributor commands
here. Release changes belong in `CHANGELOG.txt`; old plans and verification records remain in
Git history rather than serving as current requirements.

`docs/images/settings.png` is a Chrome capture of the English light-theme settings page at
920 × 800 CSS pixels (2× scale), with `maps.google.com` as a color exception. It uses the current
UI in an isolated fixture with fixed test host permissions, as in the responsiveness check.
Refresh it after visible settings changes; keep personal browser data out of documentation images.
