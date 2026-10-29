// Runs at document_start on app.clickup.com. rules.js is loaded first.
(() => {
  const HIDDEN = 'cud-hidden';
  let state = cudState();

  const isOn = (r) => (r.id in state.enabled ? state.enabled[r.id] : r.def);
  const active = () => (state.off ? [] : CUD_RULES.filter(isOn));
  const activeCustom = () => (state.off ? [] : state.custom);

  // When the extension is reloaded or updated, a script already running in an open tab
  // (or injected into a tab that was mid-load) loses its chrome.* APIs: chrome.storage
  // becomes undefined and calls throw. Every chrome.* call goes through these, so such a
  // script goes quiet instead; the CSS it already applied keeps working until reload.
  const alive = () => { try { return !!(chrome.runtime && chrome.runtime.id && chrome.storage); } catch { return false; } };
  const store = {
    get(area, key, cb) {
      if (!alive()) return;
      try { chrome.storage[area].get(key, (v) => { if (alive()) cb(v || {}); }); } catch {}
    },
    set(area, value) {
      if (!alive()) return;
      try { chrome.storage[area].set(value).catch(() => {}); } catch {}
    },
  };

  // ---------- CSS layer ----------
  // Everything that can be CSS is CSS, injected before ClickUp renders, so hidden items
  // never paint, even for a frame.
  const style = document.createElement('style');
  style.id = 'cud-style';
  (document.head || document.documentElement).appendChild(style);

  // Settings arrive asynchronously, a few milliseconds after ClickUp may already paint.
  // Bridge that gap with what was built on the previous visit (the CSS, plus the
  // placeholder item ids to drop), cached in this origin's localStorage, which a content
  // script can read synchronously at document_start.
  const CACHE_KEY = 'cud-css-cache';
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch {}
  if (!cached || typeof cached.css !== 'string') cached = null;

  // Placeholder item ids to drop, per ClickUp localStorage key.
  function placeholderIds() {
    const out = {};
    const on = new Set(active().map((r) => r.id));
    for (const [key, map] of Object.entries(CUD_PLACEHOLDERS)) {
      out[key] = Object.entries(map).filter(([ruleId]) => on.has(ruleId)).map(([, phId]) => phId);
    }
    return out;
  }

  // ClickUp paints its loading-screen rail and top bar from these cached lists before its
  // own scripts run, using markup our CSS doesn't cover. Remove hidden items from the lists
  // first. ClickUp rewrites them with the full set after it loads, so nothing is lost.
  function filterPlaceholders(ids) {
    for (const [key, drop] of Object.entries(ids || {})) {
      if (!CUD_PLACEHOLDERS[key] || !Array.isArray(drop) || !drop.length) continue;
      try {
        const list = JSON.parse(localStorage.getItem(key));
        if (!Array.isArray(list)) continue;
        const kept = list.filter((item) => !(item && drop.includes(item.id)));
        if (kept.length !== list.length) localStorage.setItem(key, JSON.stringify(kept));
      } catch {}
    }
  }

  const validSelector = (s) => {
    try { document.createDocumentFragment().querySelector(s); return true; } catch { return false; }
  };

  // Home sidebar is a flat cdk virtual tree: a section's rows are the siblings after
  // its header, up to the next top-level (aria-level 1) row. Hide the header, those rows,
  // and the empty spacer row just above the header.
  const sectionSelectors = (name) => {
    const n = name.replace(/"/g, '\\"');
    const header = `cdk-tree-node:has([data-test-section-name="${n}"])`;
    return [
      `cu-home-sidebar ${header}`,
      `cu-home-sidebar ${header} ~ cdk-tree-node:not([aria-level="1"]):not(${header} ~ cdk-tree-node[aria-level="1"] ~ *)`,
      `cu-home-sidebar cdk-tree-node:not(:has([data-test])):has(+ cdk-tree-node [data-test-section-name="${n}"])`,
    ];
  };

  function buildCss() {
    const sels = [];
    for (const r of active()) {
      if (r.css) sels.push(r.css);
      if (r.row) sels.push(`cdk-tree-node:has([data-test="${r.row}"])`);
      if (r.section) sels.push(...sectionSelectors(r.section));
    }
    sels.push(...activeCustom().map((c) => c.sel).filter(validSelector));
    sels.push(`.${HIDDEN}`);
    // One rule per selector so a single bad selector can't break the rest.
    return sels.map((s) => `${s}{display:none!important}`).join('\n') +
      // ClickUp pins the rail's item list to the height it measured at load and doesn't
      // re-measure when rules change, which leaves a gap above "More" (or clips items when
      // turning rules off). Let the list size itself to whatever is visible. Kept even when
      // paused so items shown again aren't clipped.
      '\ncu-simple-bar .cu-simple-bar__body-items{height:auto!important}';
  }

  // ---------- JS layer (things CSS can't express) ----------
  const sectionButton = (name) => document.querySelector(`cu-home-sidebar [data-test-section-name="${CSS.escape(name)}"]`);

  // Fallback for announcement cards that don't come from Chameleon:
  // a small fixed box with an "N of M" pager and a Next button.
  function hideTourCards() {
    const roots = [...document.body.children, ...document.querySelectorAll('.cdk-overlay-container > *')];
    for (const el of roots) {
      if (el.id === 'cud-picker' || el.id === 'cud-toast' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      // Skip the app root and other big containers: cards are small, and reading
      // text from the whole app on every mutation would be expensive.
      const box = el.getBoundingClientRect();
      if (!box.width || box.width > 700 || box.height > 700) continue;
      const text = el.textContent || '';
      if (text.length > 800 || !/\b\d+ of \d+\b/.test(text) || !/\bNext\b/.test(text)) continue;
      el.classList.add(HIDDEN);
    }
  }

  // The "/" command menu only exists while it's open; hide its AI / Brain entries.
  function hideSlashAi() {
    document.querySelectorAll('cu-slash-command, .cu-slash-command__container, cu-command-menu').forEach((menu) => {
      menu.querySelectorAll('[role="option"], [role="menuitem"], li, [class*="__item"]').forEach((item) => {
        const text = item.textContent || '';
        if (text.length < 80 && /\b(AI|Brain)\b/.test(text)) item.classList.add(HIDDEN);
      });
    });
  }

  // ---------- Theme capture ----------
  // The popup mirrors ClickUp's own look: copy the current design tokens (light/dark
  // surfaces and the workspace theme color) to local storage whenever they change.
  const TOKENS = [
    'background-main', 'background-main-hover', 'background-subtle', 'background-on-subtle',
    'border-default', 'border-low-contrast', 'border-high-contrast',
    'content-primary', 'content-secondary', 'content-tertiary', 'content-placeholder',
    'background-theme', 'background-theme-hover', 'content-theme', 'background-danger',
  ];
  let lastTheme = '';
  let lastThemeCheck = 0;
  function captureTheme() {
    const now = Date.now();
    if (!document.body || now - lastThemeCheck < 2000) return;
    lastThemeCheck = now;
    const s = getComputedStyle(document.body);
    const theme = {};
    for (const t of TOKENS) {
      const v = s.getPropertyValue(`--cu-${t}`).trim();
      if (v) theme[t] = v;
    }
    if (!theme['background-theme']) return;
    const json = JSON.stringify(theme);
    if (json === lastTheme) return;
    lastTheme = json;
    store.set('local', { cudTheme: theme });
  }

  // ---------- Rule health ----------
  // Records the last day each rule found its element, and which days ClickUp was used
  // (per scope). The popup flags rules that found nothing over the last few days of use.
  let health = null;
  let lastHealthCheck = 0;
  store.get('local', 'cudHealth', ({ cudHealth }) => { health = { days: {}, seen: {}, ...cudHealth }; });

  const isTaskPage = () => !!document.querySelector('cu-task-view-section-header, [data-test^="task-view"]');
  function present(r) {
    try {
      if (r.css && document.querySelector(r.css)) return true;
      if (r.row && document.querySelector(`[data-test="${r.row}"]`)) return true;
      if (r.section && sectionButton(r.section)) return true;
    } catch {}
    return false;
  }

  function checkHealth() {
    const now = Date.now();
    if (!health || !document.body || now - lastHealthCheck < 5000) return;
    lastHealthCheck = now;
    // Local date, not UTC, so "a day of use" matches the user's day.
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let changed = false;
    const mark = (id) => {
      if (health.seen[id] !== today) { health.seen[id] = today; changed = true; }
    };
    for (const r of active()) if (present(r)) mark(r.id);
    for (const c of activeCustom()) {
      try { if (document.querySelector(c.sel)) mark(`c:${c.sel}`); } catch {}
    }
    for (const scope of isTaskPage() ? ['app', 'task'] : ['app']) {
      const days = health.days[scope] || (health.days[scope] = []);
      if (days[days.length - 1] !== today) {
        days.push(today);
        if (days.length > 14) days.shift();
        changed = true;
      }
    }
    if (changed) store.set('local', { cudHealth: health });
  }

  // ---------- Sweep ----------
  function sweep() {
    captureTheme();
    document.querySelectorAll(`.${HIDDEN}`).forEach((e) => e.classList.remove(HIDDEN));
    for (const r of active()) {
      if (r.js === 'tourCards' && document.body) hideTourCards();
      if (r.js === 'slashAi') hideSlashAi();
    }
    checkHealth();
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    setTimeout(() => { queued = false; sweep(); }, 120);
  };
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });

  // Builds and applies the CSS for the current settings, and caches it for next load.
  function apply() {
    const css = buildCss();
    style.textContent = css;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ css, ph: placeholderIds() })); } catch {}
    lastHealthCheck = 0;
    sweep();
  }

  // Last visit's CSS and placeholder filter (or the defaults on a first visit) immediately,
  // then the real settings once storage answers.
  style.textContent = cached ? cached.css : buildCss();
  filterPlaceholders(cached ? cached.ph : placeholderIds());
  store.get('sync', 'cud', ({ cud }) => { state = cudState(cud); apply(); });
  if (alive()) {
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'sync' || !ch.cud) return;
      const wasOff = state.off;
      state = cudState(ch.cud.newValue);
      apply();
      if (state.off !== wasOff) toast(state.off ? 'Declutter paused: showing everything' : 'Declutter on');
    });
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(text, action) {
    if (!document.body) return;
    let el = document.getElementById('cud-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cud-toast';
      document.body.appendChild(el);
    }
    el.replaceChildren(Object.assign(document.createElement('span'), { textContent: text }));
    if (action) {
      const btn = Object.assign(document.createElement('button'), { textContent: action.label });
      btn.onclick = () => { action.run(); el.remove(); };
      el.append(btn);
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), action ? 6000 : 2500);
  }

  // ---------- Element picker ----------
  const UNSTABLE = /^(ng-|cdk-|_ng)|active|hover|focus|selected|open|expanded|disabled|\d{3,}/;
  const stableClass = (el) => [...el.classList].find((c) => !UNSTABLE.test(c) && c !== HIDDEN && c !== 'cud-pick-target');

  function ownSelector(el) {
    const dt = el.getAttribute('data-test');
    if (dt) return `[data-test="${dt.replace(/"/g, '\\"')}"]`;
    const tag = el.tagName.toLowerCase();
    const cls = stableClass(el);
    let s = tag + (cls ? '.' + CSS.escape(cls) : '');
    const al = el.getAttribute('aria-label');
    if (al && !tag.includes('-')) s += `[aria-label="${al.replace(/"/g, '\\"')}"]`;
    return s;
  }

  function selectorFor(el) {
    const own = ownSelector(el);
    if (el.getAttribute('data-test') || el.tagName.includes('-')) return own;
    let a = el.parentElement;
    while (a && a !== document.body && !a.getAttribute('data-test') && !a.tagName.includes('-')) a = a.parentElement;
    const sel = a && a !== document.body ? `${ownSelector(a)} ${own}` : own;
    try { if ([...document.querySelectorAll(sel)].includes(el)) return sel; } catch {}
    return own;
  }

  // A readable default name for a picked element; the user can rename it in the popup.
  function nameFor(el) {
    const label = el.getAttribute('aria-label') || el.getAttribute('title') || (el.innerText || '').trim().split('\n')[0];
    const name = (label || el.tagName.toLowerCase()).replace(/\s+/g, ' ').trim();
    return name.length > 40 ? name.slice(0, 39) + '…' : name;
  }

  function startPicker() {
    if (document.getElementById('cud-picker')) return;
    const tip = document.createElement('div');
    tip.id = 'cud-picker';
    document.body.appendChild(tip);
    let target = null;

    const show = (el) => {
      if (target) target.classList.remove('cud-pick-target');
      target = el;
      if (!el) return;
      el.classList.add('cud-pick-target');
      tip.textContent = `${nameFor(el)}  ·  ${selectorFor(el)}   (↑ parent · ↓ child · click/Enter hide · Esc cancel)`;
    };
    const stop = () => {
      show(null);
      tip.remove();
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
    };
    const update = (fn) => store.get('sync', 'cud', ({ cud }) => {
      const next = cudState(cud);
      fn(next);
      store.set('sync', { cud: next });
    });
    const commit = () => {
      if (!target) return stop();
      const entry = { sel: selectorFor(target), name: nameFor(target), scope: isTaskPage() ? 'task' : 'app' };
      stop();
      update((next) => { if (!next.custom.some((c) => c.sel === entry.sel)) next.custom.push(entry); });
      toast(`Hidden "${entry.name}"`, {
        label: 'Undo',
        run: () => update((next) => { next.custom = next.custom.filter((c) => c.sel !== entry.sel); }),
      });
    };
    const onOver = (e) => { if (e.target !== tip) show(e.target); };
    const onClick = (e) => { e.preventDefault(); e.stopPropagation(); commit(); };
    const onKey = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') stop();
      else if (e.key === 'Enter') commit();
      else if (e.key === 'ArrowUp' && target && target.parentElement && target.parentElement !== document.body) show(target.parentElement);
      else if (e.key === 'ArrowDown' && target && target.firstElementChild) show(target.firstElementChild);
    };
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
  }

  if (alive()) chrome.runtime.onMessage.addListener((msg) => { if (msg === 'cud-pick') startPicker(); });
})();
