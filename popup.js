const $ = (id) => document.getElementById(id);
let state = { off: false, enabled: {}, custom: [] };

const isOn = (r) => (r.id in state.enabled ? state.enabled[r.id] : r.def);
const save = () => chrome.storage.sync.set({ cud: state });

function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}

function render() {
  $('master').checked = !state.off;
  const list = $('list');
  list.replaceChildren();

  for (const group of CUD_GROUPS) {
    const rules = CUD_RULES.filter((r) => r.group === group);
    const allOn = rules.every(isOn);
    const toggleAll = el('button', { textContent: allOn ? 'none' : 'all' });
    toggleAll.onclick = () => { rules.forEach((r) => (state.enabled[r.id] = !allOn)); save(); render(); };
    list.append(el('h2', {}, group, toggleAll));

    for (const r of rules) {
      const cb = el('input', { type: 'checkbox', checked: isOn(r) });
      cb.onchange = () => { state.enabled[r.id] = cb.checked; save(); };
      list.append(el('label', {}, cb, r.label));
    }
  }

  list.append(el('h2', {}, 'Picked elements'));
  if (!state.custom.length) list.append(el('div', { className: 'empty', textContent: 'Nothing yet. Use "Pick element".' }));
  state.custom.forEach((sel, i) => {
    const rm = el('button', { textContent: '×', title: 'Show again' });
    rm.onclick = () => { state.custom.splice(i, 1); save(); render(); };
    list.append(el('div', { className: 'custom' }, el('span', { textContent: sel }), rm));
  });
}

$('master').onchange = (e) => { state.off = !e.target.checked; save(); };

$('reset').onclick = () => { state = { off: false, enabled: {}, custom: [] }; save(); render(); };

$('pick').onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/app\.clickup\.com\//.test(tab.url || '')) {
    $('msg').textContent = 'Open a ClickUp tab first.';
    return;
  }
  try {
    await chrome.tabs.sendMessage(tab.id, 'cud-pick');
    window.close();
  } catch {
    $('msg').textContent = 'Reload the ClickUp tab once, then try again.';
  }
};

chrome.storage.sync.get('cud', ({ cud }) => { if (cud) state = { ...state, ...cud }; render(); });
