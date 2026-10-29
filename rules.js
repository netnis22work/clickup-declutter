// Hide-rule catalog. Shared by content.js and popup.js.
//   css:     selector(s) hidden with display:none (fast, no flicker)
//   row:     data-test of a Home-sidebar row (hidden via cdk-tree-node:has(...))
//   section: name of a Home-sidebar section; header + its children hidden by JS
//   def:     on by default
// Selectors were taken from the live ClickUp DOM (Oct 2026). If ClickUp ships a
// redesign and something reappears, fix the selector here or use "Pick element".
const RAIL = (cls) => `cu-simple-bar .cu-simple-bar__item-container:has(> a.${cls})`;

const CUD_GROUPS = ['AI', 'Chat', 'Sidebar', 'Left rail', 'Top bar', 'Popups & nags'];

const CUD_RULES = [
  // AI
  { id: 'ai-rail', group: 'AI', label: 'AI (left rail)', def: true, css: RAIL('ai') },
  { id: 'ai-brain', group: 'AI', label: 'Brain² button (top right)', def: true, css: 'cu-brain-command-bar-toggle-button' },
  { id: 'ai-new', group: 'AI', label: '"New" AI launch row', def: true, row: 'special-hub-item-row-new-ai-launch' },
  { id: 'ai-skills', group: 'AI', label: 'Skills', def: true, row: 'special-chat-item-row-ai-skills' },
  { id: 'ai-artifacts', group: 'AI', label: 'Artifacts', def: true, row: 'special-chat-item-row-ai-artifacts' },
  { id: 'ai-chats', group: 'AI', label: 'AI Chats section', def: true, section: 'AI Chats' },
  { id: 'ai-automation', group: 'AI', label: 'AI automation buttons', def: true, css: 'cu-automation-converged-ai-task-button, cu-automation-converged-ai-task-dropdown' },
  { id: 'ai-shimmer', group: 'AI', label: 'AI shimmer text / at-location bar', def: false, css: 'cu-ai-shimmer-text, cu-brain-command-bar-at-location' },

  // Chat (the Slack clone)
  { id: 'chat-rail', group: 'Chat', label: 'Chat (left rail)', def: true, css: 'cu-simple-bar-item.cu-simple-bar-home-switch__item.chat' },
  { id: 'chat-channels', group: 'Chat', label: 'Channels section', def: true, section: 'Channels' },
  { id: 'chat-dms', group: 'Chat', label: 'Direct Messages section', def: true, section: 'Direct Messages' },
  { id: 'chat-add-channel', group: 'Chat', label: '"Add Channel" chip on views', def: true, css: 'cu-create-location-chat-button' },
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
  { id: 'rail-invite', group: 'Left rail', label: 'Invite', def: false, css: 'cu-invite-button' },
  { id: 'rail-upgrade', group: 'Left rail', label: 'Upgrade', def: true, css: 'cu-simple-bar-upgrade-toggle, cu-upgrade-nudge-button' },

  // Top-right header icons
  { id: 'top-syncup', group: 'Top bar', label: 'SyncUp call button', def: true, css: 'cu3-combo-button:has(.syncupButton)' },
  { id: 'top-clip', group: 'Top bar', label: 'Record clip', def: true, css: 'button.app-clip' },
  { id: 'top-stt', group: 'Top bar', label: 'Talk to text', def: true, css: 'button.app-talk_to_text' },
  { id: 'top-notepad', group: 'Top bar', label: 'Notepad', def: true, css: 'button.app-notepad' },
  { id: 'top-reminder', group: 'Top bar', label: 'Reminder', def: false, css: 'button.app-reminder' },
  { id: 'top-docs', group: 'Top bar', label: 'Docs', def: false, css: 'button.app-docs' },

  // Popups, tours, banners
  { id: 'pop-chameleon', group: 'Popups & nags', label: '"What\'s new" cards & tours', def: true, css: '[id^="chmln"], [class^="chmln"], [class*=" chmln"]', js: 'tourCards' },
  { id: 'pop-banners', group: 'Popups & nags', label: 'Upgrade / automation banners', def: true, css: 'cu-global-upgrade-to-member-banner, cu-automation-banner' },
  { id: 'pop-banner-popup', group: 'Popups & nags', label: 'Banner popups', def: true, css: 'cu2-banner-popup' },
];
