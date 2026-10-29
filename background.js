// Service worker: keyboard shortcut.
importScripts('rules.js');

// Alt+Shift+D (changeable at chrome://extensions/shortcuts) flips the master switch.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-declutter') return;
  const { cud } = await chrome.storage.sync.get('cud');
  const next = cudState(cud);
  next.off = !next.off;
  await chrome.storage.sync.set({ cud: next });
});
