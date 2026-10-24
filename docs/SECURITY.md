# Permissions and limitations

The extension runs locally using bundled JS, HTML, CSS, and PNG files. It has no updater,
remote configuration, network functions, or external dependencies. Its CSP allows only local
scripts and prevents outgoing connections from its own extension contexts.

## Shared website access

Both modes require a one-time grant of the optional host permissions `http://*/*` and `https://*/*`.
The lists control where the filter applies, not the extension's technical access. Even in selected
mode, modified extension code could access other websites covered by the grant.
This deliberate simplification replaces the earlier management of individual domain permissions.

The fixed API permissions are `storage`, `scripting`, `activeTab`, and `alarms`. There are no cookie,
history, debugger, or download permissions. Access can be revoked in the browser's extension manager.
Turning grayscale off, pausing, switching modes, and editing lists retain browser access.

## Data handling

Only the mode, on/off setting, lists, pause deadline, and schema/revision are stored persistently.
Tab IDs and current addresses are used temporarily to make filtering decisions; page contents,
form data, and browsing history are not stored. Storage access is restricted to trusted extension
contexts. The worker accepts state changes only from its own popup and options pages.
The content script may only request its current filtering decision.

The filter runs in an isolated world in the top-level document. Its observer watches only its own
root class; on early startup, it waits for the root element for a limited time. Delayed activations
recheck the current state. Sleeping tabs cannot cause an indefinitely blocked queue.

## Limitations

Browser interfaces, extension stores, private windows, local files, and PDF viewers are excluded.
A root CSS filter can affect page layout and existing page filters. Picture-in-Picture and
fullscreen video are not guaranteed to work. A page may briefly appear in color while loading.
Pauses use an absolute end time; system clock changes affect their remaining duration.
After access is revoked, an existing filter may remain visible until the page is reloaded.

Another application with write access can modify the local files. Hash manifests help compare
files, but a manifest in the same writable folder does not provide tamper protection.

Technical references: [Permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions),
[Scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting),
[Storage](https://developer.chrome.com/docs/extensions/reference/api/storage),
[Alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms).
