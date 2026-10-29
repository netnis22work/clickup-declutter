# Chrome Web Store listing: copy-paste sheet

Everything the Developer Dashboard asks for, in the order it asks. Upload `dist/declutter-for-clickup-<version>.zip`, which you build with `scripts/package.ps1` or `scripts/package.sh`.

---

## Store listing tab

**Name** (comes from the manifest)
```
Declutter for ClickUp
```

**Summary** (comes from the manifest description, max 132 chars)
```
Hide the AI, chat, upsell and popup clutter in ClickUp. Toggle each item, or pick any element to hide.
```

**Description**
```
ClickUp keeps adding things you never asked for: AI buttons everywhere, a built-in chat app, "What's new" video popups, upgrade nags and a left rail full of features your team doesn't use.

Declutter for ClickUp hides them so you can get back to your tasks.

WHAT IT HIDES (each one can be toggled)
• AI: the AI rail item, Brain² button, AI Chats, Skills, Artifacts and AI automation buttons
• Chat: the Chat rail item, Channels, Direct Messages, Replies, Posts and the "Add Channel" chip on list views
• Left rail: Planner, Teams, Whiteboards, Forms, Clips, Install and Upgrade (Goals, Timesheets, Dashboards and Docs are optional)
• Top bar: SyncUp call, record clip, talk to text and notepad buttons
• Popups: "What's new" cards, product tours and upgrade banners

PICK ANYTHING ELSE
Click "Pick element", hover over anything in ClickUp and click it to hide it. Use the ↑/↓ arrow keys to select a bigger or smaller area. Picked items are listed in the popup, and you can bring any of them back with one click.

FAST AND INVISIBLE
Rules are applied as CSS before the page renders, so hidden items never flash on screen. ClickUp itself keeps working normally: nothing is deleted or changed in your workspace, and turning the extension off brings everything back instantly.

PRIVATE BY DESIGN
• No data collection, no analytics, no network requests
• Only runs on app.clickup.com
• Only the "storage" permission, used to save your settings
• Open source: https://github.com/netnis22work/clickup-declutter

Declutter for ClickUp is an independent project and is not affiliated with, endorsed by, or sponsored by ClickUp.
```

**Category:** `Productivity` → `Workflow & Planning`
**Language:** English

**Graphic assets** (all in `store/`)
| Field | File | Size |
| --- | --- | --- |
| Store icon | `icons/128.png` | 128×128 |
| Screenshot 1 | `store/screenshot-1-before-after.png` | 1280×800 |
| Screenshot 2 | `store/screenshot-2-after.png` | 1280×800 |
| Screenshot 3 | `store/screenshot-3-before.png` | 1280×800 |
| Screenshot 4 | `store/screenshot-4-popup.png` | 1280×800 |
| Small promo tile | `store/promo-small-440x280.png` | 440×280 |
| Marquee promo tile | `store/promo-marquee-1400x560.png` | 1400×560 |

**Additional fields**
- Official URL: leave this empty, or use a site you've verified in Search Console.
- Homepage URL: `https://github.com/netnis22work/clickup-declutter`
- Support URL: `https://github.com/netnis22work/clickup-declutter/issues`
- Mature content: No

---

## Privacy practices tab

**Single purpose**
```
Declutter for ClickUp has a single purpose: hiding unwanted interface elements (AI features, chat, promotional popups and unused navigation items) on the ClickUp web app, with user-controlled toggles.
```

**Permission justification: storage**
```
Saves the user's settings: which hide rules are on or off, and the CSS selectors of elements the user chose to hide with "Pick element". Nothing else is stored.
```

**Permission justification: host permission (https://app.clickup.com/*)**
```
The extension's only function is changing how the ClickUp web app looks. It injects a content script and stylesheet on app.clickup.com to hide interface elements. It doesn't run on any other site.
```

**Remote code**
```
No, I am not using remote code.
```

**Data usage**: leave **every** data-type box unchecked (Personally identifiable info, Health, Financial, Authentication, Personal communications, Location, Web history, User activity, Website content). The extension reads page structure locally to hide elements but never collects or transmits it.

Tick all three certifications:
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**
```
https://github.com/netnis22work/clickup-declutter/blob/main/PRIVACY.md
```

---

## Distribution tab
- Visibility: **Public**. Or pick **Unlisted** for a team-only link that people can still install from the store.
- Regions: All regions
- Pricing: Free

---

## Before you submit
1. Register a Chrome Web Store developer account (one-time $5 fee) at https://chrome.google.com/webstore/devconsole and verify the contact email.
2. Build the zip: `scripts/package.ps1` on Windows, or `scripts/package.sh` on Linux/macOS/WSL.
3. Load `dist/` unpacked once more and check that it works.
4. Upload the zip, paste the fields above, upload the images and submit. Narrow-permission extensions like this one are usually reviewed within a few days.
