# Permissions and limitations

The extension uses local JavaScript, HTML, CSS, and image files. It has no automatic updater,
remote configuration, network requests, or runtime dependencies. Its Content Security Policy
(CSP) allows only local scripts and blocks outgoing connections from extension pages and the
background worker.

## Shared website access

Both modes require a one-time grant of the optional host permissions `http://*/*` and `https://*/*`.
The lists control where the filter applies, not the extension's technical access. Even in selected
mode, modified extension code could access other websites covered by the grant.

The fixed API permissions are `storage`, `scripting`, `activeTab`, and `alarms`. There are no cookie,
history, debugger, or download permissions. To revoke access, use the browser's extension manager.
Turning the filter off, pausing it, switching modes, or editing website lists does not revoke access.

## Data handling

The extension saves the mode, on/off setting, website lists, pause end time, schema version,
and state revision. It uses tab IDs and current addresses temporarily to decide where to apply
the filter. It does not save page contents, form data, or browsing history.

Only trusted extension contexts can access saved settings. The background worker accepts
state changes only from Muted's popup and settings page.
The content script may only request its current filtering decision.

The content script runs in an isolated JavaScript context in the top-level document.
Its observer watches only the filter's class on the root element. If the root element does not
yet exist, the script waits for it for a limited time.

## Limitations

- Browser pages, extension stores, private windows, local files, and PDF viewers are not supported.
- The CSS filter can affect page layout and existing page filters. Filtering may not work in
  Picture-in-Picture or fullscreen video.
- A page may briefly appear in color while loading.
- Pauses use a fixed end time. System clock changes affect how much time remains.
- After you revoke access, a filter may remain visible until you reload the page.

Another application with write access can modify the local files. Hash manifests help compare
files, but a manifest in the same writable folder does not provide tamper protection.

Technical references: [Permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions),
[Scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting),
[Storage](https://developer.chrome.com/docs/extensions/reference/api/storage),
[Alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms).
