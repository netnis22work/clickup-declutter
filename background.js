// Service worker: keyboard shortcut. Self-contained on purpose: importScripts() makes the
// worker fail to start if that fetch fails (e.g. while extension files are being
// rewritten), and all this needs is to flip one flag.

// Alt+Shift+D (changeable at chrome://extensions/shortcuts) flips the master switch.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-declutter') return;
  const { cud } = await chrome.storage.sync.get('cud');
  const current = cud && typeof cud === 'object' ? cud : {};
  await chrome.storage.sync.set({ cud: { ...current, off: !current.off } });
});
