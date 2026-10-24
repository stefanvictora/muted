# Verification status 0.2.0 · October 24, 2026

A complete acceptance matrix is no longer mandatory for personal use. After a change, a short
check of the affected flow is sufficient. The earlier detailed record remains in the repository
as `VERIFICATION-0.1.x.md` for historical reference; its release conditions and the earlier model
of individual domain grants no longer apply. `REQUIREMENTS.txt` is also the original plan,
superseded where applicable by the simplifications agreed later.

## Automated checks

Node tests cover domain rules, import/export, both modes with shared access, migration of older
settings, pauses, sender validation, permission loss, the controller, and package integrity.
New behavior tests were run in a failing state first and then implemented.

Additional background-work checks:

- After initialization, status and document decisions do not query storage, permissions,
  registrations, alarms, or tabs while no pause has expired.
- Tab events affect only the relevant tab. A confirmed tab is not reinjected when activated.
  Closing a tab removes its status. Individual tab errors remain in the popup; the icon and
  tooltip continue to show on/off/pause. Missing permissions and fundamental errors retain
  the exclamation mark (verified automatically).
- A worker restart with unchanged registration does not query all tabs; a new registration
  does reach pages that are already open.
- Interfaces are notified after reconciliation completes. Reading status does not trigger
  further change notifications.
- Regressions for blocking sleeping tabs and delayed activations remain covered.

## Actual browsers

The following passed in isolated profiles of Edge 156.0.4314.42 and Chrome 156.0.8078.47:

- Manifest, worker, options UI, mode selection, and domain validation.
- Actual file import with preview and Blob export under the unchanged CSP.
- No external request in the observed options context.
- Responsive status with a frozen tab; existing and new websites turn gray.
- Turning off, waking without the old filter, turning on, pausing, and resuming.
- Selected mode filters only matching hosts despite global access. Removing a rule retains access.
- Settings show only the relevant list and no permission-management section.
- The popup receives changes from another window through messages; no periodic status queries
  were triggered during the observed idle interval.

Filter checks use an isolated test copy with fixed host permissions; they do not replace a native
permission dialog. The existing immediate permission request from a click has automated acceptance
and rejection coverage, but the native dialog was not manually retested for 0.2.0.
The user's normal browser installation was not operated through tools.

Evidence is stored under `.test-artifacts/`: `edge-simplification-report.json`,
`chrome-simplification-report.json`, `responsiveness-9346-frozen.json`, and
`responsiveness-9347-frozen.json`. The Edge options view was also visually checked in a screenshot.

Sleep/wake behavior, fullscreen video, Picture-in-Picture, and comprehensive screen-reader checks
were not repeated for this change. This does not create additional mandatory steps for the user.
