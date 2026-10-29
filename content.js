// Runs at document_start on app.clickup.com. rules.js is loaded first.
(() => {
  const HIDDEN = 'cud-hidden';
  let state = { off: false, enabled: {}, custom: [] };

  const isOn = (r) => (r.id in state.enabled ? state.enabled[r.id] : r.def);
  const active = () => (state.off ? [] : CUD_RULES.filter(isOn));

  // ---------- CSS layer ----------
  const style = document.createElement('style');
  style.id = 'cud-style';
  (document.head || document.documentElement).appendChild(style);

  const validSelector = (s) => {
    try { document.createDocumentFragment().querySelector(s); return true; } catch { return false; }
  };

  function buildCss() {
    const sels = [];
    for (const r of active()) {
      if (r.css) sels.push(r.css);
      if (r.row) sels.push(`cdk-tree-node:has([data-test="${r.row}"])`);
    }
    if (!state.off) sels.push(...state.custom.filter(validSelector));
    sels.push(`.${HIDDEN}`);
    // One rule per selector so a single bad selector can't break the rest.
    style.textContent = sels.map((s) => `${s}{display:none!important}`).join('\n');
  }

  // ---------- JS layer (things CSS can't express) ----------
  // Home sidebar is a flat cdk virtual tree: a section's children are the following
  // sibling nodes with aria-level > 1, so hide the header and walk forward.
  function hideSection(name) {
    const btn = document.querySelector(`cu-home-sidebar [data-test-section-name="${CSS.escape(name)}"]`);
    const node = btn && btn.closest('cdk-tree-node');
    if (!node) return;
    const prev = node.previousElementSibling;
    if (prev && !prev.querySelector('[data-test]') && !prev.textContent.trim()) prev.classList.add(HIDDEN);
    node.classList.add(HIDDEN);
    for (let n = node.nextElementSibling; n && Number(n.getAttribute('aria-level')) > 1; n = n.nextElementSibling) {
      n.classList.add(HIDDEN);
    }
  }

  // Fallback for announcement cards that don't come from Chameleon:
  // a small fixed box with an "N of M" pager and a Next button.
  function hideTourCards() {
    const roots = [...document.body.children, ...document.querySelectorAll('.cdk-overlay-container > *')];
    for (const el of roots) {
      if (el.id === 'cud-picker') continue;
      const text = el.innerText || '';
      if (text.length > 800 || !/\b\d+ of \d+\b/.test(text) || !/\bNext\b/.test(text)) continue;
      el.classList.add(HIDDEN);
    }
  }

  function sweep() {
    document.querySelectorAll(`.${HIDDEN}`).forEach((e) => e.classList.remove(HIDDEN));
    for (const r of active()) {
      if (r.section) hideSection(r.section);
      if (r.js === 'tourCards' && document.body) hideTourCards();
    }
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    setTimeout(() => { queued = false; sweep(); }, 120);
  };
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });

  function apply() { buildCss(); sweep(); }

  // Defaults immediately (no flash), then real settings once storage answers.
  apply();
  chrome.storage.sync.get('cud', ({ cud }) => { if (cud) state = { ...state, ...cud }; apply(); });
  chrome.storage.onChanged.addListener((ch) => {
    if (ch.cud) { state = { off: false, enabled: {}, custom: [], ...ch.cud.newValue }; apply(); }
  });

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
      tip.textContent = `${selectorFor(el)}   (↑ parent · ↓ child · click/Enter hide · Esc cancel)`;
    };
    const stop = () => {
      show(null);
      tip.remove();
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
    };
    const commit = () => {
      if (!target) return stop();
      const sel = selectorFor(target);
      stop();
      chrome.storage.sync.get('cud', ({ cud }) => {
        const next = { off: false, enabled: {}, custom: [], ...cud };
        if (!next.custom.includes(sel)) next.custom.push(sel);
        chrome.storage.sync.set({ cud: next });
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

  chrome.runtime.onMessage.addListener((msg) => { if (msg === 'cud-pick') startPicker(); });
})();
