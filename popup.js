const $ = (id) => document.getElementById(id);
let state = { off: false, enabled: {}, custom: [] };

const isOn = (r) => (r.id in state.enabled ? state.enabled[r.id] : r.def);
const save = () => chrome.storage.sync.set({ cud: state });

// Groups start collapsed; which ones are open is a per-browser UI preference, not a synced setting.
let expanded = new Set();
try { expanded = new Set(JSON.parse(localStorage.getItem('cud-expanded') || '[]')); } catch {}
const saveExpanded = () => { try { localStorage.setItem('cud-expanded', JSON.stringify([...expanded])); } catch {} };

const SVG = (d) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  'AI': SVG('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  'Chat': SVG('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
  'Sidebar': SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'),
  'Left rail': SVG('<path d="M4 6h4M4 12h4M4 18h4"/><path d="M12 6h8M12 12h8M12 18h8"/>'),
  'Top bar': SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>'),
  'Popups & nags': SVG('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
  'Picked': SVG('<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
};
const CHEV = SVG('<path d="m6 9 6 6 6-6"/>');
const CLOSE = SVG('<path d="M18 6 6 18M6 6l12 12"/>');

function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}
const html = (tag, className, markup) => { const e = el(tag, { className }); e.innerHTML = markup; return e; };

function groupCard(name, count, body, groupSwitch) {
  const card = el('section', { className: 'group' + (expanded.has(name) ? '' : ' collapsed') });
  const toggle = el('button', { className: 'group-toggle', ariaExpanded: String(expanded.has(name)) },
    html('span', 'group-icon', ICONS[name] || ICONS.Picked),
    el('span', { className: 'group-name', textContent: name }),
    el('span', { className: 'count', textContent: count }),
    html('span', 'chev', CHEV));
  toggle.onclick = () => {
    const isCollapsed = card.classList.toggle('collapsed');
    isCollapsed ? expanded.delete(name) : expanded.add(name);
    toggle.ariaExpanded = String(!isCollapsed);
    saveExpanded();
  };
  const head = el('div', { className: 'group-head' }, toggle);
  if (groupSwitch) head.append(groupSwitch);
  card.append(head, body);
  return card;
}

function render() {
  const query = $('filter').value.trim().toLowerCase();
  const hiddenCount = CUD_RULES.filter(isOn).length + state.custom.length;
  $('master').checked = !state.off;
  document.body.classList.toggle('off', state.off);
  $('summary').textContent = state.off ? 'Paused, ClickUp is untouched' : `Hiding ${hiddenCount} item${hiddenCount === 1 ? '' : 's'}`;

  const list = $('list');
  const scroll = list.scrollTop;
  list.replaceChildren();

  for (const group of CUD_GROUPS) {
    const groupMatch = group.toLowerCase().includes(query);
    const rules = CUD_RULES.filter((r) => r.group === group && (groupMatch || r.label.toLowerCase().includes(query)));
    if (!rules.length) continue;
    const on = rules.filter(isOn).length;

    const all = el('input', { type: 'checkbox', className: 'switch', title: 'Toggle the whole group', ariaLabel: `Hide all ${group}` });
    all.checked = on === rules.length;
    all.indeterminate = on > 0 && on < rules.length;
    all.onchange = () => { rules.forEach((r) => (state.enabled[r.id] = all.checked)); save(); render(); };

    const items = el('div', { className: 'items' });
    for (const r of rules) {
      const sw = el('input', { type: 'checkbox', className: 'switch', checked: isOn(r), ariaLabel: `Hide ${r.label}` });
      sw.onchange = () => { state.enabled[r.id] = sw.checked; save(); render(); };
      items.append(el('label', { className: 'item' }, el('span', { textContent: r.label }), sw));
    }
    // Searching opens matching groups even if they were collapsed.
    const card = groupCard(group, `${on}/${rules.length}`, items, all);
    if (query) card.classList.remove('collapsed');
    list.append(card);
  }

  const custom = state.custom.filter((s) => !query || s.toLowerCase().includes(query));
  if (!query || custom.length) {
    const items = el('div', { className: 'items' });
    if (!state.custom.length) items.append(el('div', { className: 'empty', textContent: 'Nothing picked yet. Use Pick element to hide anything on the page.' }));
    custom.forEach((sel) => {
      const rm = html('button', 'icon-btn', CLOSE);
      rm.title = 'Show again';
      rm.onclick = () => { state.custom = state.custom.filter((s) => s !== sel); save(); render(); };
      items.append(el('div', { className: 'chip' }, el('code', { textContent: sel }), rm));
    });
    const card = groupCard('Picked', String(state.custom.length), items);
    card.classList.add('picked');
    list.append(card);
  }

  if (!list.children.length) list.append(el('div', { className: 'no-match', textContent: 'No items match.' }));
  list.scrollTop = scroll;
}

$('master').onchange = (e) => { state.off = !e.target.checked; save(); render(); };
$('filter').oninput = render;

// Reset asks for a second click instead of a native confirm() dialog.
let resetTimer;
$('reset').onclick = () => {
  const btn = $('reset');
  if (!btn.classList.contains('confirm')) {
    btn.classList.add('confirm');
    btn.textContent = 'Confirm';
    resetTimer = setTimeout(() => { btn.classList.remove('confirm'); btn.textContent = 'Reset'; }, 3000);
    return;
  }
  clearTimeout(resetTimer);
  btn.classList.remove('confirm');
  btn.textContent = 'Reset';
  state = { off: false, enabled: {}, custom: [] };
  save();
  render();
};

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

// Apply ClickUp's live design tokens (captured by content.js) so the popup matches
// the user's light/dark mode and workspace theme color.
const TOKEN_VARS = {
  'background-main': '--bg', 'background-main-hover': '--hover', 'background-subtle': '--surface',
  'background-on-subtle': '--surface-hover', 'border-default': '--line', 'border-low-contrast': '--line-soft',
  'border-high-contrast': '--track', 'content-primary': '--fg', 'content-secondary': '--muted',
  'content-tertiary': '--faint', 'content-placeholder': '--placeholder', 'background-theme': '--accent',
  'background-theme-hover': '--accent-hover', 'content-theme': '--accent-fg', 'background-danger': '--danger',
};
function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  for (const [token, cssVar] of Object.entries(TOKEN_VARS)) {
    const v = theme[token];
    if (v && CSS.supports('color', v)) root.style.setProperty(cssVar, v);
  }
  root.dataset.cu = '';
  // Native form controls and scrollbars follow the page brightness. Resolve the color
  // through the CSS engine so hex, rgb() and hsl() all come back as rgb().
  const probe = document.createElement('i');
  probe.style.color = getComputedStyle(root).getPropertyValue('--bg');
  document.body.append(probe);
  const [r, g, b] = (getComputedStyle(probe).color.match(/[\d.]+/g) || []).map(Number);
  probe.remove();
  if (r !== undefined) root.style.colorScheme = (r + g + b) / 3 > 128 ? 'light' : 'dark';
}

chrome.storage.local.get('cudTheme', ({ cudTheme }) => applyTheme(cudTheme));
chrome.storage.sync.get('cud', ({ cud }) => { if (cud) state = { ...state, ...cud }; render(); });
