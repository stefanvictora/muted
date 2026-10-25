# Installation and usage

## Load and update

Follow the [README installation steps](../README.md#install) to load the extension.

After updating the files in the loaded extension folder:

1. Open `chrome://extensions` or `edge://extensions`.
2. Click **Reload** on Muted's card.
3. Reopen the popup or settings page.
4. If a website still uses the old filter, reload that website.

Edge and Chrome store their settings independently.

## Website rules

Open **Settings** from the popup. Select a mode under **Apply grayscale**, then click **Apply**:

- **All websites with exceptions:** the **Keep in color** list contains the exceptions.
- **Selected websites only:** the **Make gray** list contains the websites to filter.

Switching modes keeps both lists. Both modes require access to all websites.
Website rules include subdomains; IP addresses and `localhost` match exactly.

To add a rule, enter a hostname such as `example.com` and click **Add**.
Use a hostname without a URL scheme, path, port, or wildcard.

See [Permissions and limitations](SECURITY.md) for unsupported pages and rendering limitations.

## On/off and pauses

Use the **Grayscale** switch in the popup to turn the filter on or off. This setting is saved.
Turning the filter off also ends an active pause.

To pause the filter, click **5 min**, **15 min**, or **30 min**. A new pause starts from the
time of the click and replaces any previous pause. Click **End pause** to resume filtering
according to your website rules.

## Import and export

In **Settings**, expand **Import & export**. Click **Export as JSON** to save the mode and
both website lists to `muted.json`.

To import settings:

1. Select a JSON file under **Import JSON**.
2. Review the preview. Importing replaces the current mode and both website lists.
3. Click **Import** to apply the settings, or **Cancel** to keep the current settings.

Importing keeps the current on/off setting, active pause, and browser permissions.
Export your settings before uninstalling if you want to keep your website lists.

## Updates from 0.1.x

Updating from 0.1.x preserves lists, the on/off setting, and pauses. Older JSON exports remain
usable. If you previously allowed access only to individual websites, click **Allow access**
to grant access to all websites. If you already granted that access, no new grant is needed.

## Troubleshooting

- **Missing website access:** click **Allow access** in the popup or settings page to grant access.
- **Reload message:** reload the affected website.
- **Corrupted settings:** in **Settings**, click **Reset** under **Reset settings**.
  This clears both lists, ends any pause, selects **Selected websites only**, and turns the
  filter off. Browser permissions remain unchanged. Reload affected websites afterward.

To prepare for a rollback, keep a copy of the working extension folder before updating.
To restore that copy:

1. Replace the files at the loaded path with the saved copy.
2. Click **Reload** on Muted's card in the extension manager.
3. Reload affected websites.
