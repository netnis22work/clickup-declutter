// Service worker: keyboard shortcut and toolbar badge.
importScripts('rules.js');

// Alt+Shift+D (changeable at chrome://extensions/shortcuts) flips the master switch.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-declutter') return;
  const { cud } = await chrome.storage.sync.get('cud');
  const next = cudState(cud);
  next.off = !next.off;
  await chrome.storage.sync.set({ cud: next });
});

// Content scripts report how many rules matched on their page; show it per tab,
// in the user's ClickUp theme color.
const HEX = /^#[0-9a-f]{6}$/i;
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'cud-count' || !sender.tab || typeof msg.count !== 'number') return;
  const tabId = sender.tab.id;
  chrome.storage.local.get('cudTheme', ({ cudTheme }) => {
    const color = cudTheme && HEX.test(cudTheme['background-theme']) ? cudTheme['background-theme'] : '#6347ea';
    chrome.action.setBadgeBackgroundColor({ tabId, color });
    chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' });
    chrome.action.setBadgeText({ tabId, text: msg.count > 0 ? String(Math.min(msg.count, 99)) : '' });
  });
});
