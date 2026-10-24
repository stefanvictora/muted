# Muted

**Less distraction, more focus.**

Muted is a browser extension for Chrome and Edge that turns websites grayscale to help
reduce visual distractions and keep your attention on what matters. Choose where you want
less color, and bring it back whenever you need it.

## Features

- Apply grayscale everywhere with exceptions, or only on selected websites.
- Keep websites in color when color is useful, such as maps or design tools.
- Pause for 5, 15, or 30 minutes, or turn grayscale off entirely.
- Manage website lists with subdomain support and JSON import/export.
- Use English or German automatically based on your browser's interface language.
  Other languages fall back to English.

## Install

No build step is needed. Load the extension directly from this repository:

1. Clone the repository or download and extract its ZIP archive.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the repository's `extension` folder.
5. Pin Muted to the toolbar, open its popup, and click **Allow access**.

If you are using a packaged copy, select the `extension` folder inside that package.
Disable other copies of Muted to avoid running multiple instances.

## Use

Open **Settings** from the popup to choose a mode:

- **All websites with exceptions:** websites turn gray unless they are on the **Keep in color** list.
- **Selected websites only:** only websites on the **Make gray** list turn gray.

Both lists are preserved when you switch modes. Website rules include subdomains.
The popup lets you change the current website's rule, pause grayscale, or turn it off.

JSON exports contain your mode and both website lists. Importing previews the settings before
you apply them and preserves the on/off setting and any active pause.

Browser pages, extension stores, local files, and PDF viewers are not supported.
Chrome and Edge store their settings separately.

## Privacy and permissions

Muted runs entirely in your browser, with no runtime dependencies or network requests.
The source is available here for you to inspect and load yourself.

Both modes require a one-time grant of access to all HTTP and HTTPS websites so Muted can
apply and remove the filter. Your website lists determine where grayscale is active;
they do not restrict the extension's browser permissions. You can revoke access in your
browser's extension settings.

## Update

After updating the files in the loaded folder, click **Reload** on Muted's card in the browser's
extension manager. Reopen the popup or settings page, and reload affected websites if needed.
There is no need to rebuild or repackage the extension for each change.

## Development

Node.js is only required for tests and optional packaging. There are no npm dependencies to install.

```powershell
npm test
npm run package             # Create a versioned folder under releases/
npm run package -- --zip    # Also create a ZIP archive and checksum (Windows PowerShell)
```

Packaging runs the tests and verifies the runtime files against a generated SHA-256 manifest.
It creates a new snapshot without overwriting older packages or changing your active installation.

Translations live in `extension/_locales/en/messages.json` and
`extension/_locales/de/messages.json`. Add new messages to both catalogs.

## Further documentation

- [Installation and usage](docs/INSTALLATION.md)
- [Permissions and limitations](docs/SECURITY.md)
- [Development notes](docs/DEVELOPMENT.md)
- [Verification record](docs/VERIFICATION.md)
