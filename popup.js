const $ = (id) => document.getElementById(id);
const REPO = 'https://github.com/netnis22work/clickup-declutter';
let state = cudState();
let health = { days: {}, seen: {} };

const isOn = (r) => (r.id in state.enabled ? state.enabled[r.id] : r.def);
const save = () => chrome.storage.sync.set({ cud: state });

// Groups start collapsed; which ones are open is a per-browser UI preference, not a synced setting.
let expanded = new Set();
try { expanded = new Set(JSON.parse(localStorage.getItem('cud-expanded') || '[]')); } catch {}
const saveExpanded = () => { try { localStorage.setItem('cud-expanded', JSON.stringify([...expanded])); } catch {} };

const SVG = (d) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  'AI': SVG('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  'In tasks': SVG('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
  'Chat': SVG('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
  'Sidebar': SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'),
  'Left rail': SVG('<path d="M4 6h4M4 12h4M4 18h4"/><path d="M12 6h8M12 12h8M12 18h8"/>'),
  'Top bar': SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>'),
  'Popups & nags': SVG('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
  'Picked': SVG('<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
};
const CHEV = SVG('<path d="m6 9 6 6 6-6"/>');
const CLOSE = SVG('<path d="M18 6 6 18M6 6l12 12"/>');
const CHECK = SVG('<path d="M20 6 9 17l-5-5"/>');

function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}
const html = (tag, className, markup) => { const e = el(tag, { className }); e.innerHTML = markup; return e; };
const openTab = (url) => chrome.tabs.create({ url });

// ---------- Rule health ----------
// A rule needs updating when it's on, its scope has had 3+ days of use, and it hasn't
// found its element since the 3rd most recent of those days.
function needsUpdate() {
  if (state.off) return [];
  const out = [];
  const check = (id, label, scope) => {
    if (!scope || state.ignored.includes(id)) return;
    const days = (health.days && health.days[scope]) || [];
    if (days.length < 3) return;
    const seen = health.seen && health.seen[id];
    if (!seen || seen < days[days.length - 3]) out.push({ id, label, seen });
  };
  for (const r of CUD_RULES) if (isOn(r)) check(r.id, r.label, r.scope === undefined ? 'app' : r.scope);
  for (const c of state.custom) check(`c:${c.sel}`, c.name || c.sel, c.scope);
  return out;
}

// ---------- Main view ----------
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

// Click a picked item's name to rename it.
function nameEditor(entry) {
  const shown = el('b', { textContent: entry.name || 'Unnamed element', title: 'Click to rename' });
  const wrap = el('div', { className: 'chip-name' }, shown, el('code', { textContent: entry.sel }));
  shown.onclick = () => {
    const input = el('input', { value: entry.name, maxLength: 60, ariaLabel: 'Name' });
    const done = (keep) => {
      if (keep) { entry.name = input.value.trim().slice(0, 60); save(); }
      render();
    };
    input.onkeydown = (e) => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); };
    input.onblur = () => done(true);
    shown.replaceWith(input);
    input.focus();
    input.select();
  };
  return wrap;
}

function render() {
  const query = $('filter').value.trim().toLowerCase();
  const hiddenCount = CUD_RULES.filter(isOn).length + state.custom.length;
  const broken = new Set(needsUpdate().map((b) => b.id));
  $('master').checked = !state.off;
  document.body.classList.toggle('off', state.off);
  $('summary').textContent = state.off ? 'Paused, ClickUp is untouched' : `Hiding ${hiddenCount} item${hiddenCount === 1 ? '' : 's'}`;
  $('health-dot').hidden = !broken.size;
  $('open-settings').title = broken.size ? `Settings (${broken.size} rule${broken.size === 1 ? '' : 's'} need updating)` : 'Settings';

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
      const row = el('label', { className: 'item' }, el('span', { textContent: r.label }));
      if (broken.has(r.id)) row.append(el('i', { className: 'warn', title: 'Not found on ClickUp lately. See Settings.' }));
      row.append(sw);
      items.append(row);
    }
    // Searching opens matching groups even if they were collapsed.
    const card = groupCard(group, `${on}/${rules.length}`, items, all);
    if (query) card.classList.remove('collapsed');
    list.append(card);
  }

  const custom = state.custom.filter((c) => !query || `${c.name} ${c.sel}`.toLowerCase().includes(query));
  if (!query || custom.length) {
    const items = el('div', { className: 'items' });
    if (!state.custom.length) items.append(el('div', { className: 'empty', textContent: 'Nothing picked yet. Use Pick element to hide anything on the page.' }));
    custom.forEach((entry) => {
      const rm = html('button', 'icon-btn', CLOSE);
      rm.title = 'Show again';
      rm.onclick = () => { state.custom = state.custom.filter((c) => c !== entry); save(); render(); };
      items.append(el('div', { className: 'chip' }, nameEditor(entry), rm));
    });
    const card = groupCard('Picked', String(state.custom.length), items);
    if (query) card.classList.remove('collapsed');
    list.append(card);
  }

  if (!list.children.length) list.append(el('div', { className: 'no-match', textContent: 'No items match.' }));
  list.scrollTop = scroll;
  if (!$('view-settings').hidden) renderSettings();
}

$('master').onchange = (e) => { state.off = !e.target.checked; save(); render(); };
$('filter').oninput = render;

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

// ---------- Settings view ----------
function showSettings(open) {
  $('view-main').hidden = open;
  $('view-settings').hidden = !open;
  if (open) renderSettings();
}
$('open-settings').onclick = () => showSettings(true);
$('close-settings').onclick = () => showSettings(false);

const FLAG = SVG('<path d="M4 22V4a1 1 0 0 1 1-1h11l-2 4 2 4H5"/>');
const EYE_OFF = SVG('<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5M6.6 6.6C4.4 8 2.8 10.2 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.6 4.8-1.4"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>');
const CLOCK = SVG('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
const fmtDay = (d) => new Date(`${d}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function renderSettings() {
  // Presets: segmented control; none is selected when the setup is custom.
  const seg = $('presets');
  seg.replaceChildren();
  let currentPreset = null;
  for (const p of CUD_PRESETS) {
    const map = cudPresetMap(p);
    const current = CUD_RULES.every((r) => isOn(r) === map[r.id]);
    if (current) currentPreset = p;
    const b = el('button', { textContent: p.label, role: 'radio', ariaChecked: String(current), title: p.desc });
    b.onclick = () => { state.enabled = map; state.off = false; save(); render(); };
    seg.append(b);
  }
  $('preset-desc').textContent = currentPreset ? currentPreset.desc : 'Custom setup';

  // Rule health
  const box = $('health');
  box.replaceChildren();
  const broken = needsUpdate();
  const usedDays = ((health.days && health.days.app) || []).length;
  const status = (icon, iconClass, label, sub, trail) => {
    const row = el('div', { className: 'mrow' }, html('span', iconClass, icon), el('span', { className: 'label', textContent: label }, sub ? el('small', { textContent: sub }) : ''));
    if (trail) row.append(trail);
    return row;
  };
  if (broken.length) {
    for (const b of broken) {
      const report = html('button', 'ib', FLAG);
      report.title = 'Report on GitHub';
      report.onclick = () => openTab(`${REPO}/issues/new?${new URLSearchParams({
        title: `Rule needs updating: ${b.label}`,
        body: `Rule \`${b.id}\` hasn't matched anything lately.\n\nExtension version: ${chrome.runtime.getManifest().version}`,
      })}`);
      const ignore = html('button', 'ib', EYE_OFF);
      ignore.title = 'Ignore this rule';
      ignore.onclick = () => { state.ignored.push(b.id); save(); render(); };
      box.append(status('', 'warn-icon', b.label, b.seen ? `Not found since ${fmtDay(b.seen)}` : 'Not found yet', el('span', { className: 'trail' }, report, ignore)));
    }
    box.append(el('p', { className: 's-desc', textContent: 'ClickUp may have changed, or the item isn\'t in your plan.' }));
  } else if (usedDays < 3) {
    box.append(status(CLOCK, 'ok-muted', 'Checking rules', 'Verified as you use ClickUp over the next few days'));
  } else {
    box.append(status(CHECK, 'ok-icon', 'All rules working', `Checked over your last ${Math.min(usedDays, 14)} days of use`));
  }
  if (state.ignored.length) {
    const unignore = el('button', { className: 'link', textContent: `${state.ignored.length} ignored · Show again` });
    unignore.onclick = () => { state.ignored = []; save(); render(); };
    box.append(el('p', { className: 's-desc' }, unignore));
  }

  chrome.commands.getAll((cmds) => {
    const c = cmds.find((x) => x.name === 'toggle-declutter');
    $('shortcut').replaceChildren(...(c && c.shortcut ? c.shortcut.split('+').map((k) => el('kbd', { textContent: k })) : [el('span', { textContent: 'Not set' })]));
  });

  const v = chrome.runtime.getManifest().version;
  const gh = el('button', { className: 'link', textContent: 'GitHub' });
  gh.onclick = () => openTab(REPO);
  const privacy = el('button', { className: 'link', textContent: 'Privacy' });
  privacy.onclick = () => openTab(`${REPO}/blob/main/PRIVACY.md`);
  $('about').replaceChildren(`Declutter ${v} · `, gh, ' · ', privacy);
}

$('change-shortcut').onclick = () => openTab('chrome://extensions/shortcuts');

// ---------- Share (export / import) ----------
const note = (text, error) => { $('share-note').textContent = text; $('share-note').classList.toggle('error', !!error); };
const exportText = () => JSON.stringify({
  app: 'declutter-for-clickup', format: 1,
  off: state.off, enabled: state.enabled, custom: state.custom, ignored: state.ignored,
}, null, 2);

const validSelector = (s) => {
  try { document.createDocumentFragment().querySelector(s); return true; } catch { return false; }
};

// Only known rule ids, booleans and valid selectors get through.
function parseSettings(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("That isn't valid settings text."); }
  if (!data || data.app !== 'declutter-for-clickup') throw new Error("That doesn't look like Declutter settings.");
  const ids = new Set(CUD_RULES.map((r) => r.id));
  const enabled = {};
  for (const [k, v] of Object.entries(data.enabled || {})) if (ids.has(k) && typeof v === 'boolean') enabled[k] = v;
  const custom = (Array.isArray(data.custom) ? data.custom : []).map(cudEntry).filter((c) => c && c.sel.length < 500 && validSelector(c.sel)).slice(0, 200);
  const ignored = (Array.isArray(data.ignored) ? data.ignored : []).filter((x) => typeof x === 'string').slice(0, 200);
  return cudState({ off: data.off === true, enabled, custom, ignored });
}

$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(exportText()); note('Copied. Paste it into Import on another browser.'); } catch { note("Couldn't copy. Use Save file instead.", true); }
};
$('save-file').onclick = () => {
  const url = URL.createObjectURL(new Blob([exportText()], { type: 'application/json' }));
  el('a', { href: url, download: 'declutter-for-clickup-settings.json' }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  note('Saved.');
};
$('show-import').onclick = () => {
  const open = $('import-box').hidden;
  $('import-box').hidden = !open;
  $('show-import').ariaExpanded = String(open);
  note('');
  if (open) $('import-text').focus();
};
$('load-file').onclick = () => $('file-input').click();
$('file-input').onchange = async (e) => {
  const file = e.target.files[0];
  if (file) $('import-text').value = await file.text();
  e.target.value = '';
};
$('apply-import').onclick = () => {
  try {
    state = parseSettings($('import-text').value);
    save();
    $('import-text').value = '';
    $('import-box').hidden = true;
    $('show-import').ariaExpanded = 'false';
    render();
    note(`Imported ${Object.keys(state.enabled).length} rule settings and ${state.custom.length} picked element${state.custom.length === 1 ? '' : 's'}.`);
  } catch (err) {
    note(err.message, true);
  }
};

// Reset asks for a second click instead of a native confirm() dialog.
let resetTimer;
$('reset').onclick = () => {
  const btn = $('reset');
  const label = $('reset-label');
  if (!btn.classList.contains('confirm')) {
    btn.classList.add('confirm');
    label.textContent = 'Click again to reset everything';
    resetTimer = setTimeout(() => { btn.classList.remove('confirm'); label.textContent = 'Reset to defaults'; }, 3000);
    return;
  }
  clearTimeout(resetTimer);
  btn.classList.remove('confirm');
  label.textContent = 'Reset to defaults';
  state = cudState();
  save();
  render();
};

// ---------- Theme ----------
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

// ---------- Load ----------
chrome.storage.local.get(['cudTheme', 'cudHealth'], ({ cudTheme, cudHealth }) => {
  applyTheme(cudTheme);
  if (cudHealth) health = cudHealth;
  chrome.storage.sync.get('cud', ({ cud }) => { state = cudState(cud); render(); });
});
// Keep in sync with the shortcut, Undo toasts and other open popups.
chrome.storage.onChanged.addListener((ch, area) => {
  if (area === 'sync' && ch.cud) { state = cudState(ch.cud.newValue); render(); }
  if (area === 'local' && ch.cudHealth) { health = ch.cudHealth.newValue || health; render(); }
});
