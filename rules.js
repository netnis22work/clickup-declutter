// Hide-rule catalog. Shared by content.js, popup.js and background.js.
//   css:     selector(s) hidden with display:none (fast, no flicker)
//   row:     data-test of a Home-sidebar row (hidden via cdk-tree-node:has(...))
//   section: name of a Home-sidebar section; header + its children hidden by JS
//   js:      extra JS pass in content.js for things CSS can't express
//   def:     on by default
//   scope:   where the element should exist, for the "rule needs updating" check:
//            'app' (any ClickUp page, the default), 'task' (task view), or null
//            (situational, like popups or plan-dependent buttons: never flagged)
// Selectors were taken from the live ClickUp DOM (Oct 2026). If ClickUp ships a
// redesign and something reappears, fix the selector here or use "Pick element".
const RAIL = (cls) => `cu-simple-bar .cu-simple-bar__item-container:has(> a.${cls})`;

const CUD_GROUPS = ['AI', 'In tasks', 'Chat', 'Sidebar', 'Left rail', 'Top bar', 'Popups & nags'];

const CUD_RULES = [
  // AI
  { id: 'ai-rail', group: 'AI', label: 'AI (left rail)', def: true, css: RAIL('ai') },
  { id: 'ai-brain', group: 'AI', label: 'Brain² button (top right)', def: true, css: 'cu-brain-command-bar-toggle-button' },
  { id: 'ai-search', group: 'AI', label: 'AI icon in search bar', def: true, css: '.ai-button-spacer__icon.ai-brain-icon, .search-ai-fade' },
  { id: 'ai-new', group: 'AI', label: '"New" AI launch row', def: true, row: 'special-hub-item-row-new-ai-launch', scope: null },
  { id: 'ai-skills', group: 'AI', label: 'Skills', def: true, row: 'special-chat-item-row-ai-skills' },
  { id: 'ai-artifacts', group: 'AI', label: 'Artifacts', def: true, row: 'special-chat-item-row-ai-artifacts' },
  { id: 'ai-chats', group: 'AI', label: 'AI Chats section', def: true, section: 'AI Chats' },
  { id: 'ai-automation', group: 'AI', label: 'AI automation buttons', def: true, css: 'cu-automation-converged-ai-task-button, cu-automation-converged-ai-task-dropdown', scope: null },
  { id: 'ai-shimmer', group: 'AI', label: 'AI shimmer text / at-location bar', def: false, css: 'cu-ai-shimmer-text, cu-brain-command-bar-at-location', scope: null },

  // Inside the task view
  { id: 'task-ask-brain', group: 'In tasks', label: '"Ask Brain about this task" card', def: true, css: '[data-test="task-chat-foreword__container"]', scope: null },
  { id: 'task-comment-ai', group: 'In tasks', label: 'Ask Brain² in comment bar', def: true, css: 'button[data-test="comment-bar__ask-ai-button"], button[data-test="comment-bar__brain-mention-button"], cu-brain-mention-premium-notice', scope: 'task' },
  { id: 'task-editor-ai', group: 'In tasks', label: 'AI buttons in editor toolbar', def: true, css: 'button[data-test="toolbar-improve-content-with-ai"], cu-content-assistant-toolbar-item, cu-ask-ai-button, button[data-test="toolbar-create-task-ai"]', scope: 'task' },
  { id: 'task-subtask-ai', group: 'In tasks', label: 'Suggest subtasks with AI', def: true, css: '.content-assistant-generate-subtask-toolbar-item__text-button, .content-assistant-generate-subtask-toolbar-item__icon-button', scope: null },
  { id: 'task-summary-ai', group: 'In tasks', label: 'AI activity summary', def: true, css: 'cu-task-activity-summary', scope: null },
  { id: 'task-slash-ai', group: 'In tasks', label: 'AI entries in the / menu', def: true, css: '.generate-content-slash-command, cu-ai-writing-tool', js: 'slashAi', scope: null },

  // Chat (the Slack clone)
  { id: 'chat-rail', group: 'Chat', label: 'Chat (left rail)', def: true, css: 'cu-simple-bar-item.cu-simple-bar-home-switch__item.chat' },
  { id: 'chat-channels', group: 'Chat', label: 'Channels section', def: true, section: 'Channels' },
  { id: 'chat-dms', group: 'Chat', label: 'Direct Messages section', def: true, section: 'Direct Messages' },
  { id: 'chat-add-channel', group: 'Chat', label: '"Add Channel" chip on views', def: true, css: 'cu-create-location-chat-button', scope: null },
  { id: 'chat-replies', group: 'Chat', label: 'Replies', def: true, row: 'special-chat-item-row-threads' },
  { id: 'chat-posts', group: 'Chat', label: 'Posts', def: true, row: 'special-chat-item-row-posts' },

  // Home sidebar leftovers
  { id: 'sb-meetings', group: 'Sidebar', label: 'Meetings', def: true, row: 'special-chat-item-row-meetings' },
  { id: 'sb-assigned', group: 'Sidebar', label: 'Assigned Comments', def: false, row: 'special-chat-item-row-assigned' },
  { id: 'sb-inbox', group: 'Sidebar', label: 'Inbox', def: false, row: 'special-chat-item-row-inbox' },

  // Left rail
  { id: 'rail-planner', group: 'Left rail', label: 'Planner', def: true, css: RAIL('calendar') },
  { id: 'rail-teams', group: 'Left rail', label: 'Teams', def: true, css: RAIL('teams') },
  { id: 'rail-whiteboards', group: 'Left rail', label: 'Whiteboards', def: true, css: RAIL('whiteboards') },
  { id: 'rail-forms', group: 'Left rail', label: 'Forms', def: true, css: RAIL('forms') },
  { id: 'rail-clips', group: 'Left rail', label: 'Clips', def: true, css: RAIL('clips') },
  { id: 'rail-goals', group: 'Left rail', label: 'Goals', def: false, css: RAIL('goals') },
  { id: 'rail-time', group: 'Left rail', label: 'Timesheets', def: false, css: RAIL('time-hub') },
  { id: 'rail-dashboards', group: 'Left rail', label: 'Dashboards', def: false, css: RAIL('dashboards') },
  { id: 'rail-docs', group: 'Left rail', label: 'Docs', def: false, css: RAIL('docs') },
  { id: 'rail-install', group: 'Left rail', label: 'Install', def: true, css: 'cu-sidebar-download-button' },
  { id: 'rail-invite', group: 'Left rail', label: 'Invite', def: false, css: 'cu-invite-button', scope: null },
  { id: 'rail-upgrade', group: 'Left rail', label: 'Upgrade', def: true, css: 'cu-simple-bar-upgrade-toggle, cu-upgrade-nudge-button', scope: null },

  // Top-right header icons
  { id: 'top-syncup', group: 'Top bar', label: 'SyncUp call button', def: true, css: 'cu3-combo-button:has(.syncupButton)' },
  { id: 'top-clip', group: 'Top bar', label: 'Record clip', def: true, css: 'button.app-clip' },
  { id: 'top-stt', group: 'Top bar', label: 'Talk to text', def: true, css: 'button.app-talk_to_text' },
  { id: 'top-notepad', group: 'Top bar', label: 'Notepad', def: true, css: 'button.app-notepad' },
  { id: 'top-reminder', group: 'Top bar', label: 'Reminder', def: false, css: 'button.app-reminder' },
  { id: 'top-docs', group: 'Top bar', label: 'Docs', def: false, css: 'button.app-docs' },

  // Popups, tours, banners
  { id: 'pop-chameleon', group: 'Popups & nags', label: '"What\'s new" cards & tours', def: true, css: '[id^="chmln"], [class^="chmln"], [class*=" chmln"]', js: 'tourCards', scope: null },
  { id: 'pop-banners', group: 'Popups & nags', label: 'Upgrade / automation banners', def: true, css: 'cu-global-upgrade-to-member-banner, cu-automation-banner', scope: null },
  { id: 'pop-banner-popup', group: 'Popups & nags', label: 'Banner popups', def: true, css: 'cu2-banner-popup', scope: null },
];

// One-click setups. `enabled` overrides the defaults; `only` turns on just those rules.
const CUD_PRESETS = [
  { id: 'recommended', label: 'Recommended', desc: 'AI, chat, popups and unused rail items', enabled: {} },
  {
    id: 'focus', label: 'Focus', desc: 'Recommended, plus Docs, Dashboards, Goals and Timesheets',
    enabled: { 'rail-goals': true, 'rail-time': true, 'rail-dashboards': true, 'rail-docs': true, 'rail-invite': true, 'top-reminder': true, 'top-docs': true, 'sb-assigned': true, 'ai-shimmer': true },
  },
  { id: 'light', label: 'Light touch', desc: 'Only popups, tours and upgrade nags', only: ['pop-chameleon', 'pop-banners', 'pop-banner-popup', 'rail-upgrade', 'rail-install'] },
];

const CUD_DEFAULT_STATE = { off: false, enabled: {}, custom: [], ignored: [] };

// Full on/off map for a preset.
function cudPresetMap(p) {
  const map = {};
  for (const r of CUD_RULES) map[r.id] = p.only ? p.only.includes(r.id) : (r.id in p.enabled ? p.enabled[r.id] : r.def);
  return map;
}

// Picked elements used to be plain selector strings; now { sel, name, scope }.
function cudEntry(c) {
  if (typeof c === 'string') return { sel: c, name: '', scope: 'app' };
  if (c && typeof c.sel === 'string') {
    return { sel: c.sel, name: typeof c.name === 'string' ? c.name.slice(0, 60) : '', scope: c.scope === 'task' ? 'task' : 'app' };
  }
  return null;
}

function cudState(raw) {
  const s = { ...CUD_DEFAULT_STATE, ...(raw || {}) };
  s.custom = (Array.isArray(s.custom) ? s.custom : []).map(cudEntry).filter(Boolean);
  s.ignored = Array.isArray(s.ignored) ? s.ignored : [];
  s.enabled = s.enabled && typeof s.enabled === 'object' ? s.enabled : {};
  return s;
}
