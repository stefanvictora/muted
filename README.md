# Muted

**Less distraction, more focus.**

Muted is a browser extension for Chrome and Edge that turns websites grayscale to help
reduce visual distractions and keep your attention on what matters. Choose where you want
less color, and bring it back whenever you need it.

<img src="docs/images/settings.png" alt="Muted settings: grayscale on all websites, with maps.google.com kept in color" width="760">

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

For controls, updates, and troubleshooting, see [Installation and usage](docs/INSTALLATION.md).

## Privacy and permissions

Muted runs entirely in your browser, with no runtime dependencies or network requests.
The source is available here for you to inspect and load yourself.

Both modes require a one-time grant of access to all HTTP and HTTPS websites so Muted can
apply and remove the filter. Your website lists determine where grayscale is active;
they do not restrict the extension's browser permissions. You can revoke access in your
browser's extension settings.

Browser pages, extension stores, private windows, local files, and PDF viewers are not supported.
See [Permissions and limitations](docs/SECURITY.md) for details.

## Development

Use Node.js 22.12 or newer:

```powershell
npm ci
npm run check               # Check formatting and run tests
npm run package             # Optional: create a verified package under releases/
```

See [Development](docs/DEVELOPMENT.md) for architecture, translations, browser checks, and packaging.
Release history lives in [CHANGELOG.txt](CHANGELOG.txt).

## License

[MIT](LICENSE) © 2026 Stefan Victora.
