# Security Policy

## Supported versions
Only the latest version published on the Chrome Web Store, and the `main` branch of this repository, get security fixes.

## Reporting a vulnerability
Please **don't open a public issue** for security problems. Report them privately through GitHub's [private vulnerability reporting](https://github.com/netnis22work/clickup-declutter/security/advisories/new).

Include:
- what the issue is and its impact
- steps to reproduce (extension version, Chrome version)
- a proof of concept if you have one

You'll get an acknowledgement within 7 days. Confirmed issues are fixed and released as quickly as possible, and reporters are credited in the changelog unless they prefer not to be.

## Security model
The extension is deliberately small so it's easy to audit:

| Area | Design |
| --- | --- |
| Permissions | `storage` only, plus host access to `https://app.clickup.com/*`. No `tabs`, `scripting`, `cookies`, `webRequest`, or `<all_urls>`. |
| Network | None. The extension makes no `fetch`/XHR/WebSocket requests. |
| Remote code | None. No CDN scripts, no `eval`, no `new Function`. Everything runs from the packaged files. |
| Page interaction | Content scripts run in Chrome's isolated world. They only add CSS and toggle a class that hides elements, and they never read or change workspace data. |
| Custom selectors | Selectors saved with "Pick element" are only used inside CSS `display:none` rules. They're validated before use, and a bad selector is skipped. |
| Service worker | `background.js` only handles the toggle shortcut. It runs no network code. |
| CSS cache | The generated hide CSS (selectors only) is cached in `app.clickup.com`'s `localStorage` so it can be applied synchronously at page start. It's read back only as CSS text for the extension's own `<style>` element, and then replaced with freshly built CSS once settings load. |
| Settings import | Imported text must be Declutter's own format. Only known rule ids with boolean values and syntactically valid selectors (max 200, under 500 characters each) are kept, and everything else is dropped. Selectors are only ever used inside `display:none` CSS rules. |
| Loading placeholders | ClickUp draws its loading-screen rail and top bar from JSON lists in its own `localStorage` (`placeholder-sidebar-icons`, `placeholder-topbar-icons`). At `document_start`, only entries whose `id` maps to an enabled rule are removed. Nothing is added or changed, and ClickUp rewrites the lists after it loads. |
| Theme colors | ClickUp color tokens copied into `storage.local` are only applied to the popup after `CSS.supports('color', value)` accepts them, so nothing but a valid color reaches its styles. |
| Messages | The content script accepts one message (`cud-pick`) from its own popup. It ignores messages from web pages. |
| Dependencies | None. No npm packages and no build step. |

## Out of scope
- ClickUp's own security. Report that to ClickUp.
- Issues that need a compromised browser or machine.
