# ClickUp Declutter

A Chrome extension that hides ClickUp's AI entry points, Chat/Channels/DMs, the "What's new" cards, upgrade nags and unused rail items. Every item can be toggled, and **Pick element** lets you hide anything else in two clicks.

## Install (Chrome, Edge, Brave)
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Reload your ClickUp tab.

To share it with the team, zip this folder. Each person unzips it and does **Load unpacked**. Settings sync through your Chrome profile.

## Use
- Click the toolbar icon to toggle items by group. Changes apply instantly.
- **Pick element**: hover over anything, use ↑/↓ to select the parent or child, then click or press Enter to hide it. Esc cancels. Picked items appear in the popup, and × brings one back.
- Uncheck **On** to see vanilla ClickUp again.

## When ClickUp changes its UI
Selectors are in `rules.js` (one line per item). If something comes back after a ClickUp release, fix that line or just re-pick it.
