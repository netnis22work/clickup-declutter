# Privacy Policy: Declutter for ClickUp

_Last updated: October 29, 2026_

Declutter for ClickUp ("the extension") hides parts of the ClickUp web app's interface. This policy explains what the extension does and does not do with your data.

## Short version
The extension **does not collect, transmit, sell, or share any personal or usage data.** It has no servers, no analytics, no tracking, and no third-party code.

## What the extension accesses
- **ClickUp pages (`https://app.clickup.com/*`).** The extension injects CSS and a small script that hides interface elements. It reads the page structure (element tags, classes, attributes and short labels) only to decide what to hide. It does not collect or send your tasks, comments, documents, names, or any other workspace content.
- **ClickUp's theme colors.** So the popup matches ClickUp, the extension copies ClickUp's current interface color values (for example its background and theme color, such as `#6347ea`) into `chrome.storage.local` on your device. These are design values only, not workspace content, and they never leave your browser.
- **Instant-hide cache.** So hidden items don't flash while settings load, the extension keeps a copy of its generated hide rules (CSS selectors only, no workspace content) in `app.clickup.com`'s own browser storage (`localStorage`) on your device. ClickUp's page can technically read that storage. It contains only the same selectors you'd see in this extension's source and your picked-element selectors.
- **Rule health.** To notice when a ClickUp update breaks a rule, the extension stores, in `chrome.storage.local`, the last date each rule found its element and the dates you used ClickUp (the last 14 at most). That's dates and rule names only, kept on your device.
- **Your settings.** Your on/off choices and any elements you hid with "Pick element" are saved with `chrome.storage.sync`. A picked element's default name is its visible label (for example a button's text), which you can rename. Chrome keeps this in your browser profile and, if you have Chrome Sync turned on, syncs it to your Google account under Google's own privacy policy. The developer never receives this data.
- **Sharing.** "Copy" and "Save file" in Settings put your settings into your clipboard or a file only when you click them. What you do with that text is up to you.
- **Report links.** "Report" in Settings opens a GitHub "new issue" page prefilled with the rule's name and the extension version. Nothing is sent unless you submit that issue yourself.

## What the extension does not do
- No network requests of any kind.
- No remote code: every script ships inside the extension package.
- No cookies, browsing history, or access to other websites.
- No data sold or transferred to third parties, and no data used for advertising, creditworthiness, or lending.

## Chrome Web Store Limited Use
The use of information received from Chrome APIs follows the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements.

## Changes
If this policy changes, the new version will be published at this URL and noted in the [changelog](CHANGELOG.md). Any change that adds data collection would ship with an in-extension notice before it takes effect.

## Contact
Open an issue at https://github.com/netnis22work/clickup-declutter/issues.

_Declutter for ClickUp is an independent project and is not affiliated with, endorsed by, or sponsored by ClickUp. "ClickUp" is a trademark of its respective owner._
