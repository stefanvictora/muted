# Installation and usage

## Load and update

Follow the [README installation steps](../README.md#install) to load the extension.

If this folder is already loaded, click **Reload** in the extension manager after making changes.
Reopen any popup or settings page and reload affected websites if needed to replace older content
scripts. Local file changes may already take effect when an extension page is reopened.
Edge and Chrome store their settings independently.

## Controls

- **All websites with exceptions:** the **Keep in color** list contains the exceptions.
- **Selected websites only:** the **Make gray** list contains the websites to filter.
- The other list remains saved. Both modes use the same access to all websites.
- The on/off setting is saved. Turning grayscale off ends an active pause.
- A new pause replaces the previous deadline with the current time plus 5, 15, or 30 minutes.
  **End pause** resumes normal operation immediately.
- Domain rules include subdomains. IP addresses and localhost match exactly.
- Import/export transfers the mode and lists. It does not import the on/off setting, pause,
  or browser permissions. An import shows a preview and applies only after clicking **Import**.
- The interface follows the browser's interface language: German or English, with English
  as the fallback for other languages.

See [Permissions and limitations](SECURITY.md) for unsupported pages and rendering limitations.

## Existing settings

Updating from 0.1.x preserves lists, the on/off setting, and pauses. Older JSON exports remain
usable. If you previously granted access only to individual websites, allow the shared access
once. An existing global permission grant is reused.

## Troubleshooting

When access is missing, an **Allow access** button appears. You can revoke browser permissions
in the extension manager. If a reload message appears, reload the affected website.
Corrupted settings can be explicitly reset; this clears both lists and turns the filter off
while retaining browser access.

Before larger changes, keep a copy of the working extension folder and optionally a JSON export.
To roll back, restore the old copy at the same loaded path, then reload the extension and affected
websites. Export settings before uninstalling. A manual hash check or complete browser acceptance
test is not required for personal use.
