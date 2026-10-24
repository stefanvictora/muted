# Verification record · October 24, 2026

> Historical record for 0.1.x. The release conditions and per-domain permission model below
> have been superseded; see [the 0.2.0 verification record](VERIFICATION.md).
> Historical UI labels are translated into English here for readability.

**Status at the time: test candidate 0.1.1. No final approval.** The user had started manual
acceptance testing in Edge. The blocker found in 0.1.0 was fixed in 0.1.1; the repeated consent
test with existing and new pages was subsequently confirmed as passing by the user.
Further manual checks remained open. Release copies were not automatically changed.

## Manual feedback and the 0.1.1 fix

Confirmed by the user in Edge 0.1.0: loading the unpacked extension, a page initially in color,
the correct host, the on/off switch enabled, and missing website access. After rejecting native
consent, the website stayed in color, the error/access message was correct, and no optional
website permissions were granted.

**Consent test failed:** after consent, neither existing nor new pages turned gray; the popup
remained at "Please wait". More than 30 tabs were open; no error button was visible.
This was a core defect, not a rendering limitation.

Reproduction in an isolated Edge profile: normal tabs worked, as did a slowly loading resource.
Exactly one tab frozen through DevTools caused the missing worker status in 0.1.0 (timeout after
2.5 seconds). The complete tab reconciliation blocked the state queue, including popup and
document handshakes.

0.1.1 separates tab reconciliation from the state queue, limits tab wait times, skips sleeping tabs,
and checks delayed activations against the current state. Regression tests failed first, then
passed. Rechecking with a frozen tab: Edge status 79 ms, Chrome status 48 ms; existing/new pages
turned gray. Turning off, waking without the old filter, turning on, and pausing/resuming also
passed. Only the isolated diagnostic copy's test manifest used fixed host permissions; this did
**not** verify native consent in the personal profile.

Automated status at that point: **27 tests passed** (23 original tests plus four regressions).
Diagnostic tool and evidence: `tools/browser-responsiveness-check.mjs`,
`docs/evidence/responsiveness-9336-frozen.json`, `docs/evidence/responsiveness-9337-frozen.json`.

**Manual recheck in Edge 0.1.1 passed (user feedback):** after switching to 0.1.1 and granting access
again, both the already open and newly opened test page turned gray. The popup showed "Grayscale
active". This resolved the previously failed consent/basic-function test in Edge; it did not
replace the pending permission-transition, pause, special-case, or Chrome acceptance checks.

**Rendering observation:** the user briefly saw the website in color before it quickly turned gray.
No duration was measured. The documented handshake requests the current worker state before
activation; completely flicker-free rendering was not guaranteed. The observation was recorded
without deriving further unmeasured timing claims.

**Color exceptions in Edge 0.1.1 passed (user feedback):** "Keep in color" restored color on the
current website without reloading; the popup showed "Color exception", and another website stayed
gray. A new tab for the excepted website also stayed in color. "Make gray" turned both already open
tabs gray again; the other website remained gray. Subdomain matching was not separately checked
in this step.

**On/off switch and manual pause controls in Edge 0.1.1 passed (user feedback):** turning off restored
color on existing and new test pages. After closing and reopening the popup, the switch stayed off
and the status read "Off". Turning on made the pages gray again. A 5-minute pause restored color on
existing and new pages and showed an appropriate end time. Clicking 15 minutes next replaced the
deadline with the current time plus 15 minutes. "End pause" restored grayscale and cleared the
pause status. Actual expiry, the 30-minute selection, browser restart, and sleep/wake were not yet
verified. Next manual step: global → selected with actual permission removal and an explicit
narrow grant.

**Global → selected in Edge 0.1.1 passed (user feedback):** website A was saved in "Grayscale
websites". After the mode switch, A and B were in color; A remained as a rule with missing access.
No website permissions remained among the actual optional grants. Only after a separate explicit
grant did A turn gray while B stayed in color; new tabs behaved the same way. The displayed grants
were limited to the selected domain. Next manual step: selected → global with rejection followed
by acceptance.

**Selected → global, initial observation in Edge 0.1.1:** according to the user, clicking "Apply mode"
did not show a new consent dialog. The screenshot showed global mode and `http://*/*` and `https://*/*`
alongside the narrower theverge.com grants. This matched documented Chromium behavior:
`permissions.remove()` removes active permissions but not remembered prior consent, so a subsequent
request may succeed without a dialog. The earlier test instruction requiring the user to reject
a dialog that would necessarily appear was incorrect and was corrected. Sources:
[Chrome permissions, Step 5](https://developer.chrome.com/docs/extensions/reference/api/permissions),
[Chromium optional permissions](https://chromium.googlesource.com/chromium/src/+/main/extensions/docs/permissions.md).
The rejection case for a mode switch had therefore neither failed nor passed manually; it required
a state without prior global consent. Still to confirm: both websites, including new tabs, turn
gray, and the selected list remains unchanged and marked as retained.

**Selected → global in Edge 0.1.1 functionally passed (user feedback):** both test websites turned
gray after the deliberate mode switch, including in new tabs. The selected domain remained in
"Grayscale websites", and the list was marked "retained". The browser fulfilled the permission
request without another dialog because of prior consent. The separate rejection case during
mode switching remained open. Next manual step: the 30-minute selection followed by automatic
expiry of a newly started 5-minute pause.

**Automatic pause expiry in Edge 0.1.1 passed (user feedback):** selecting 30 minutes showed an
appropriate end time. A subsequent 5-minute click shortened the deadline to the current time plus
five minutes. With the popup closed, the browser open, and the computer awake, the visible test
page automatically turned gray after expiry without reloading or reopening the popup. The popup
then showed "Grayscale active" with no active pause. Actual expiry of a 30-minute pause was not
awaited. Next manual step: check the disabled state and an active pause deadline across an extension
reload; a full browser restart and sleep/wake remained separate checks.

**Extension reload in Edge 0.1.1 passed (user feedback):** after manually turning off and reloading
through the extension manager, the switch and status remained off and the test page stayed in color.
After turning on, starting a 5-minute pause, and reloading again, the pause retained its original
end time. Ending it early restored grayscale. This verified an extension restart, not a full browser
or Windows restart or sleep/wake. Next manual step: let a pause expire while the computer sleeps
and check behavior after waking.

## Original 0.1.0 baseline checks

### Environment actually used

- Windows, Node.js **24.22.1**.
- Google Chrome **156.0.8078.47**, verified through the executable and the running DevTools protocol.
- Microsoft Edge **156.0.4314.42**, verified the same way.
- Dedicated profiles at `.test-artifacts/chrome-profile` and `.test-artifacts/edge-profile`,
  running without a visible window.

### Automated checks

`node --test`: **23 tests passed**, none skipped. Coverage included domain/IDN/IP rules, invalid
input, size limits, state and import, both modes, permission loss, serialized toggle sequences,
pauses and clock changes, worker restart, interrupted permission cleanup, rejection/errors,
separate lists, overlapping permissions, tab errors, navigation/revisions, controller idempotence,
early startup and deactivation, sender validation, synchronous worker event registration,
immediate permission requests, manifest/runtime auditing, and hash/file-list checks against
modified, missing, and additional files.

Browser API doubles verify application coordination. They do not verify native dialogs, real
persistent grants, or actual sleep/wake and browser lifecycles.

### Actual Chrome and Edge checks

The following passed in **both** versions listed above, except where stated otherwise:

| Check | Result |
|---|---|
| Load unpacked manifest, module worker, strict CSP, and options UI | Passed |
| Initially no host permissions or filter registration | Passed |
| Mode selection and adding a domain through the actual UI | Passed |
| Invalid host displays a visible error | Passed |
| Actual file import preview does not yet change state | Passed |
| Confirmed import normalizes and replaces lists | Passed |
| Local Blob export under unchanged CSP with exactly the intended fields | Passed |
| No HTTP/HTTPS requests from the options context during observed actions | Passed, limited to that context and interval |
| Options layout without horizontal overflow; Chrome screenshot visually checked | Passed |
| Toolbar action provides temporary `activeTab` access | Passed |
| Worker does not treat temporary access as persistent website permission | Passed |
| Actual isolated injection of controller and CSS into a local test page | Passed |
| Duplicate controller injection and overwriting the root class | Passed |
| Computed filter `grayscale(1)`; Chrome screenshot visually checked | Passed |
| Turning off restores the original page filter; observer stays off | Passed |
| Chrome API accepts exact IPv4/IPv6 patterns | Passed in Chrome; Edge pending |

The local rendering fixture contains sticky content and a cross-origin frame. Full visual
scroll/frame/fullscreen acceptance was not claimed. The rendering test invokes the controller
through temporary test access; it does not replace the complete consent/registration flow.

Machine-readable evidence in the working directory: `.test-artifacts/chrome-report.json`,
`edge-report.json`, `chrome-render-report.json`, and `edge-render-report.json`; screenshots:
`*-options.png` and `*-grayscale.png`. These development artifacts are not part of the runtime.

### Pending manual acceptance — historical release condition

Run in **Edge and Chrome** using the packaged candidate and record the results:

- [ ] Deliberately accept and reject native consent; no hosts before consent. The headless test
  triggered a pending native request; accepting/rejecting it was not verified.
- [ ] Global mode: new and existing pages turn gray; color exceptions include subdomains;
  actual popup status agrees with rendering.
- [ ] Global → selected with real broad grants: filter cleanup, complete permission removal,
  a second explicit click, and only permitted rules active.
- [ ] Selected → global; rejected permissions/browser policy; the UI does not report false success.
- [ ] Remove overlapping rules; change permissions externally; show a reload message when
  the controller cannot be reached.
- [ ] Turn off, pause for 5/15/30 minutes, and end pauses early on existing and new tabs.
- [ ] Close the browser, stop the worker, and test real pauses across sleep/wake with worker DevTools closed.
- [ ] Reddit/old.reddit.com and YouTube, including SPA navigation and fullscreen; document
  scrolling/sticky behavior, cross-origin frames, and Picture-in-Picture.
- [ ] Private windows, local files, browser pages, stores, and built-in PDF viewers remain outside
  the promised scope.
- [ ] Actual action popup: keyboard/focus/screen reader, current host, confirmed rendering,
  and light/dark themes.
- [ ] Export/import between browsers during an active pause and while disabled;
  pauses/permissions are not transferred.
- [ ] Check network traffic from all extension contexts during all UI actions, separately from
  normal page traffic.
- [ ] Installed release files match the hash manifest; check update/rollback at the stable path.

Under these historical conditions, the archive remained a **test candidate** without this evidence.
Unverified core flows were not to be approved as mere rendering limitations.
