/* @ds-bundle: {"format":4,"namespace":"Ariadne","components":[{"name":"Logo"},{"name":"Icon"},{"name":"Button"},{"name":"IconButton"},{"name":"NavItem"},{"name":"SearchField"},{"name":"Tabs"},{"name":"FilterChip"},{"name":"StatusPill"},{"name":"PriorityIcon"},{"name":"Avatar"},{"name":"Label"},{"name":"DueDate"},{"name":"HoldTooltip"},{"name":"SummaryCard"},{"name":"Banner"},{"name":"Menu"},{"name":"ActivityItem"},{"name":"GanttBar"},{"name":"WorkloadRow"}]} */
(function () {
  function h() { var R = window.React; return R.createElement.apply(R, arguments); }
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }

  /* ---------- data ---------- */
  var STATUSES = [
    { key: 'not-started', label: 'Not Started', held: false },
    { key: 'progress', label: 'On Progress', held: false },
    { key: 'fixing', label: 'Fixing', held: false },
    { key: 'blocked', label: 'Blocked', held: true },
    { key: 'hold', label: 'On Hold', held: true },
    { key: 'request', label: 'On Request', held: true },
    { key: 'done', label: 'Done', held: false },
    { key: 'routine', label: 'Rutin', held: false }
  ];
  var PRIORITIES = [
    { key: 'critical', label: 'Critical', rank: 0 },
    { key: 'high', label: 'High', rank: 1 },
    { key: 'medium', label: 'Medium', rank: 2 },
    { key: 'low', label: 'Low', rank: 3 }
  ];
  function findBy(list, key) { for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i]; return list[0]; }

  /* ---------- icons: 24-grid, 1.75 stroke, currentColor ---------- */
  var C = function (extra) { return [['circle', { cx: 12, cy: 12, r: 9 }]].concat(extra || []); };
  var P = function (d) { return ['path', { d: d }]; };
  var ICONS = {
    'status-not-started': [['circle', { cx: 12, cy: 12, r: 9, strokeDasharray: '3.2 2.9' }]],
    'status-progress': C([['path', { d: 'M12 3a9 9 0 0 1 0 18z', fill: 'currentColor', stroke: 'none' }]]),
    'status-fixing': [P('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z')],
    'status-blocked': C([P('M5.6 5.6 18.4 18.4')]),
    'status-hold': C([P('M10 9v6'), P('M14 9v6')]),
    'status-request': C([P('M12 7v5l3 2')]),
    'status-done': C([P('m8 12.5 2.8 2.8L16.5 9')]),
    'status-routine': [P('m17 2 4 4-4 4'), P('M3 11v-1a4 4 0 0 1 4-4h14'), P('m7 22-4-4 4-4'), P('M21 13v1a4 4 0 0 1-4 4H3')],
    'priority-critical': [P('m6 12 6-6 6 6'), P('m6 18 6-6 6 6')],
    'priority-high': [P('m6 15 6-6 6 6')],
    'priority-medium': [P('M6 9h12'), P('M6 15h12')],
    'priority-low': [P('m6 9 6 6 6-6')],
    search: [['circle', { cx: 11, cy: 11, r: 7 }], P('m20 20-4-4')],
    bell: [P('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'), P('M10.3 21a1.94 1.94 0 0 0 3.4 0')],
    'chevron-down': [P('m6 9 6 6 6-6')],
    'chevron-right': [P('m9 18 6-6-6-6')],
    plus: [P('M5 12h14'), P('M12 5v14')],
    x: [P('M18 6 6 18'), P('m6 6 12 12')],
    check: [P('M20 6 9 17l-5-5')],
    lock: [['rect', { x: 4, y: 11, width: 16, height: 10, rx: 2 }], P('M8 11V7a4 4 0 0 1 8 0v4')],
    info: C([P('M12 16v-4'), P('M12 8h.01')]),
    message: [P('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')],
    update: [P('M12 20h9'), P('M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z')],
    at: [['circle', { cx: 12, cy: 12, r: 4 }], P('M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8')],
    move: [P('m16 3 4 4-4 4'), P('M20 7H4'), P('m8 21-4-4 4-4'), P('M4 17h16')],
    calendar: [['rect', { x: 3, y: 4, width: 18, height: 18, rx: 2 }], P('M16 2v4'), P('M8 2v4'), P('M3 10h18')],
    eye: [P('M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z'), ['circle', { cx: 12, cy: 12, r: 3 }]],
    folder: [P('M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z')],
    dashboard: [['rect', { x: 3, y: 3, width: 7, height: 9, rx: 1 }], ['rect', { x: 14, y: 3, width: 7, height: 5, rx: 1 }], ['rect', { x: 14, y: 12, width: 7, height: 9, rx: 1 }], ['rect', { x: 3, y: 16, width: 7, height: 5, rx: 1 }]],
    timeline: [P('M3 3v18h18'), P('M7 7h7'), P('M10 12h8'), P('M8 17h6')],
    users: [P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), ['circle', { cx: 9, cy: 7, r: 4 }], P('M22 21v-2a4 4 0 0 0-3-3.87'), P('M16 3.13a4 4 0 0 1 0 7.75')],
    settings: [P('M4 21v-7'), P('M4 10V3'), P('M12 21v-9'), P('M12 8V3'), P('M20 21v-5'), P('M20 12V3'), P('M1 14h6'), P('M9 8h6'), P('M17 16h6')],
    more: [['circle', { cx: 5, cy: 12, r: 1 }], ['circle', { cx: 12, cy: 12, r: 1 }], ['circle', { cx: 19, cy: 12, r: 1 }]],
    milestone: [P('M12 2.5 21.5 12 12 21.5 2.5 12z')],
    mail: [['rect', { x: 2, y: 4, width: 20, height: 16, rx: 2 }], P('m22 7-10 6L2 7')]
  };
  function Icon(props) {
    var name = props.name, size = props.size || 16, parts = ICONS[name] || ICONS.info;
    var sw = props.strokeWidth || (name.indexOf('priority-') === 0 ? 2.5 : 1.75);
    return h('svg', {
      className: cx('ar-icon', props.className), width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': props.title ? undefined : 'true', role: props.title ? 'img' : undefined, style: props.style
    }, props.title ? h('title', null, props.title) : null, parts.map(function (p, i) { return h(p[0], Object.assign({ key: i }, p[1])); }));
  }

  /* ---------- Logo ---------- */
  function Mark(props) {
    var s = props.size || 28;
    return h('svg', { className: 'ar-mark', width: s, height: s, viewBox: '0 0 32 32', fill: 'none', 'aria-hidden': 'true' },
      h('g', { className: 'ar-mark-walls', strokeWidth: 2, strokeLinecap: 'round' },
        h('path', { d: 'M27.78 21.49A13 13 0 1 1 27.78 10.51' }),
        h('path', { d: 'M8.30 19.59A8.5 8.5 0 1 0 8.30 12.41' }),
        h('path', { d: 'M19.63 17.69A4 4 0 1 1 19.63 14.31' })),
      h('path', { className: 'ar-mark-thread', d: 'M16 16H22.25A6.25 6.25 0 0 0 9.75 16H5.25A10.75 10.75 0 0 0 26.75 16H29', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      h('circle', { className: 'ar-mark-knot', cx: 29.5, cy: 16, r: 1.9 }));
  }
  function Logo(props) {
    var size = props.size || 28;
    return h('span', { className: cx('ar-logo', props.className) }, h(Mark, { size: size }),
      props.markOnly ? null : h('span', { className: 'ar-logo-text' },
        h('span', { className: 'ar-logo-name', style: { fontSize: Math.round(size * 0.64) + 'px' } }, 'Ariadne'),
        props.subtitle === false ? null : h('span', { className: 'ar-logo-sub' }, props.subtitle || 'Task Tracker Hub')));
  }

  /* ---------- actions ---------- */
  function Button(props) {
    var v = props.variant || 'secondary', s = props.size || 'md';
    var rest = Object.assign({}, props); delete rest.variant; delete rest.size; delete rest.icon; delete rest.iconEnd;
    return h('button', Object.assign({ type: 'button' }, rest, { className: cx('ar-btn', 'ar-btn-' + v, 'ar-btn-' + s, props.className) }),
      props.icon ? h(Icon, { name: props.icon, size: s === 'sm' ? 14 : 16 }) : null,
      props.children ? h('span', null, props.children) : null,
      props.iconEnd ? h(Icon, { name: props.iconEnd, size: s === 'sm' ? 14 : 16 }) : null);
  }
  function IconButton(props) {
    return h('button', { type: 'button', className: cx('ar-iconbtn', props.size === 'sm' && 'ar-iconbtn-sm', props.className), 'aria-label': props.label, title: props.label, onClick: props.onClick },
      h(Icon, { name: props.icon, size: props.size === 'sm' ? 14 : 18 }),
      props.badge ? h('span', { className: 'ar-count' }, props.badge > 99 ? '99+' : props.badge) : null);
  }

  /* ---------- navigation ---------- */
  function NavItem(props) {
    var depth = props.depth || 0;
    return h('div', { className: cx('ar-nav', props.active && 'is-active'), style: { paddingLeft: 12 + depth * 16 + 'px' }, role: 'treeitem', 'aria-expanded': props.expandable ? !!props.expanded : undefined, 'aria-current': props.active ? 'page' : undefined },
      props.expandable ? h('span', { className: cx('ar-nav-caret', props.expanded && 'is-open') }, h(Icon, { name: 'chevron-right', size: 14 })) : (depth ? h('span', { className: 'ar-nav-caret' }) : null),
      props.icon ? h(Icon, { name: props.icon, size: 16 }) : null,
      h('span', { className: 'ar-nav-label' }, props.label),
      props.count != null ? h('span', { className: 'ar-nav-count' }, props.count) : null);
  }
  function SearchField(props) {
    return h('label', { className: cx('ar-search', props.className), style: props.width ? { width: props.width } : null },
      h(Icon, { name: 'search', size: 16 }),
      h('input', { type: 'search', placeholder: props.placeholder || 'Cari task, proyek, orang…', defaultValue: props.value, 'aria-label': props.placeholder || 'Cari' }),
      props.shortcut ? h('kbd', null, props.shortcut) : null);
  }
  function Tabs(props) {
    return h('div', { className: 'ar-tabs', role: 'tablist' }, props.items.map(function (it) {
      var label = typeof it === 'string' ? it : it.label;
      return h('button', { key: label, type: 'button', role: 'tab', 'aria-selected': label === props.active, className: cx('ar-tab', label === props.active && 'is-active') }, label);
    }));
  }
  function FilterChip(props) {
    return h('button', { type: 'button', className: cx('ar-chip', props.active && 'is-active'), 'aria-pressed': props.toggle ? !!props.active : undefined },
      props.toggle && props.active ? h(Icon, { name: 'check', size: 14 }) : null,
      h('span', null, props.label, props.value ? h('b', null, ': ' + props.value) : null),
      props.count ? h('span', { className: 'ar-chip-count' }, props.count) : null,
      props.toggle ? null : h(Icon, { name: 'chevron-down', size: 14 }));
  }

  /* ---------- status & priority ---------- */
  function StatusPill(props) {
    var st = findBy(STATUSES, props.status);
    return h(props.select ? 'button' : 'span', {
      type: props.select ? 'button' : undefined,
      className: cx('ar-pill', 'ar-pill-' + st.key, props.select && 'ar-pill-select', props.open && 'is-open', props.className),
      'aria-haspopup': props.select ? 'listbox' : undefined, 'aria-expanded': props.select ? !!props.open : undefined
    }, h(Icon, { name: 'status-' + st.key, size: 14 }), h('span', null, st.label), props.select ? h(Icon, { name: 'chevron-down', size: 12, className: 'ar-pill-caret' }) : null);
  }
  function PriorityIcon(props) {
    var p = findBy(PRIORITIES, props.priority);
    return h('span', { className: cx('ar-prio', 'ar-prio-' + p.key, props.className), title: props.showLabel ? undefined : 'Prioritas: ' + p.label },
      h(Icon, { name: 'priority-' + p.key, size: props.size || 16, title: props.showLabel ? undefined : 'Prioritas ' + p.label }),
      props.showLabel ? h('span', null, p.label) : null);
  }

  /* ---------- people & labels ---------- */
  function initials(n) { var p = String(n || '?').trim().split(/\s+/); return (p[0][0] + (p[1] ? p[1][0] : (p[0][1] || ''))).toUpperCase(); }
  function Avatar(props) {
    var s = props.size || 24;
    return h('span', { className: cx('ar-avatar', props.guest && 'is-guest', props.className), title: props.name, style: { width: s, height: s, fontSize: Math.round(s * 0.42) + 'px' } }, initials(props.name));
  }
  function AvatarStack(props) {
    var max = props.max || 3, names = props.names || [], shown = names.slice(0, max);
    return h('span', { className: 'ar-avatars', title: names.join(', ') }, shown.map(function (n) { return h(Avatar, { key: n, name: n, size: props.size }); }),
      names.length > max ? h('span', { className: 'ar-avatar ar-avatar-more', style: { width: props.size || 24, height: props.size || 24 } }, '+' + (names.length - max)) : null);
  }
  function Label(props) { return h('span', { className: 'ar-label' }, props.children); }
  function DueDate(props) {
    return h('span', { className: cx('ar-date', props.overdue && 'is-overdue') }, props.overdue ? h(Icon, { name: 'calendar', size: 13 }) : null, props.children,
      props.overdue && props.lateBy ? h('span', { className: 'ar-date-late' }, '· telat ' + props.lateBy + ' hari') : null);
  }

  /* ---------- hold reason ---------- */
  function HoldTooltip(props) {
    var st = findBy(STATUSES, props.status);
    return h('span', { className: 'ar-hold' },
      h('button', { type: 'button', className: cx('ar-hold-trigger', 'ar-hold-' + st.key), 'aria-label': 'Alasan ' + st.label, 'aria-expanded': !!props.open }, h(Icon, { name: 'info', size: 14 })),
      props.open ? h('span', { className: 'ar-tooltip', role: 'tooltip' },
        h('span', { className: 'ar-tooltip-head' }, h(StatusPill, { status: st.key }), props.since ? h('span', { className: 'ar-muted' }, 'sejak ' + props.since) : null),
        h('span', { className: 'ar-tooltip-k' }, 'Alasan tertahan'), h('span', { className: 'ar-tooltip-v' }, props.reason),
        props.waitingOn ? h('span', { className: 'ar-tooltip-k' }, 'Menunggu') : null,
        props.waitingOn ? h('span', { className: 'ar-tooltip-v ar-tooltip-who' }, h(Avatar, { name: props.waitingOn, size: 18 }), props.waitingOn) : null) : null);
  }

  /* ---------- dashboard ---------- */
  function SummaryCard(props) {
    return h('div', { className: cx('ar-card', 'ar-summary', props.tone && 'is-' + props.tone) },
      h('div', { className: 'ar-summary-head' }, props.icon ? h(Icon, { name: props.icon, size: 16 }) : null, h('span', null, props.label)),
      h('div', { className: 'ar-summary-value' }, props.value),
      props.hint ? h('div', { className: 'ar-summary-hint' }, props.hint) : null);
  }
  function Banner(props) {
    return h('div', { className: 'ar-banner', role: 'status' }, h(Icon, { name: props.icon || (props.kind === 'guest' ? 'eye' : 'users'), size: 16 }),
      h('span', { className: 'ar-banner-text' }, props.children),
      props.action ? h('button', { type: 'button', className: 'ar-banner-action' }, props.action) : null);
  }

  /* ---------- menu ---------- */
  function Menu(props) {
    return h('div', { className: 'ar-menu', role: 'listbox', style: props.width ? { width: props.width } : null },
      props.title ? h('div', { className: 'ar-menu-title' }, props.title) : null,
      props.query != null ? h('div', { className: 'ar-menu-query' }, h(Icon, { name: 'search', size: 14 }), h('span', null, props.query || h('span', { className: 'ar-muted' }, 'Cari…'))) : null,
      props.items.map(function (it, i) {
        return h('div', { key: i, role: 'option', 'aria-selected': !!it.selected, className: cx('ar-menu-item', i === props.activeIndex && 'is-active', it.selected && 'is-selected') },
          it.status ? h(StatusPill, { status: it.status }) : null,
          it.avatar ? h(Avatar, { name: it.avatar, size: 22 }) : null,
          it.icon ? h(Icon, { name: it.icon, size: 16 }) : null,
          it.label ? h('span', { className: 'ar-menu-label' }, it.label) : null,
          it.meta ? h('span', { className: 'ar-menu-meta' }, it.meta) : null,
          it.selected ? h(Icon, { name: 'check', size: 14, className: 'ar-menu-check' }) : null);
      }));
  }

  /* ---------- activity ---------- */
  function ActivityItem(props) {
    var k = props.kind || 'comment';
    if (k === 'log') {
      return h('div', { className: 'ar-act ar-act-log' }, h('span', { className: 'ar-act-dot' }, h(Icon, { name: props.icon || 'move', size: 12 })),
        h('span', { className: 'ar-act-logtext' }, h('b', null, props.author), ' ', props.children), h('span', { className: 'ar-act-time' }, props.time));
    }
    return h('div', { className: cx('ar-act', 'ar-act-' + k) },
      h(Avatar, { name: props.author, size: 28, guest: props.guest }),
      h('div', { className: 'ar-act-body' },
        h('div', { className: 'ar-act-head' }, h('b', null, props.author), props.guest ? h('span', { className: 'ar-tag-guest' }, 'Tamu') : null,
          k === 'update' ? h('span', { className: 'ar-badge-update' }, h(Icon, { name: 'update', size: 12 }), 'Update') : null,
          k === 'internal' ? h('span', { className: 'ar-badge-internal' }, h(Icon, { name: 'lock', size: 12 }), 'Internal') : null,
          h('span', { className: 'ar-act-time' }, props.time)),
        h('div', { className: 'ar-act-text' }, props.children)));
  }
  function Mention(props) { return h('span', { className: 'ar-mention' }, '@' + props.children); }

  /* ---------- gantt ---------- */
  function GanttTrack(props) {
    var dw = props.dayWidth || 28, days = props.days || [];
    return h('div', { className: 'ar-track', style: { width: days.length * dw, height: props.height || 36 } },
      days.map(function (d, i) { return h('span', { key: i, className: cx('ar-track-day', d.weekend && 'is-weekend'), style: { left: i * dw, width: dw } }); }),
      props.children);
  }
  function GanttBar(props) {
    var st = findBy(STATUSES, props.status), dw = props.dayWidth || 28;
    return h('div', { className: 'ar-bar-wrap', style: { left: props.start * dw, top: props.top != null ? props.top : 8 } },
      h('div', { className: cx('ar-bar', 'ar-bar-' + st.key, props.overdue && 'is-overdue'), style: { width: Math.max(props.span * dw - 2, 8) }, title: st.label },
        h(Icon, { name: 'status-' + st.key, size: 12, title: st.label })),
      props.label ? h('span', { className: 'ar-bar-label' }, props.priority ? h(PriorityIcon, { priority: props.priority, size: 12 }) : null, props.label) : null);
  }
  function Milestone(props) {
    var dw = props.dayWidth || 28;
    return h('div', { className: 'ar-ms', style: { left: props.day * dw + dw / 2, top: props.top != null ? props.top : 10 } },
      h('span', { className: cx('ar-ms-diamond', props.done && 'is-done') }), h('span', { className: 'ar-ms-label' }, props.label));
  }
  function TodayMarker(props) {
    var dw = props.dayWidth || 28;
    return h('div', { className: 'ar-today', style: { left: props.day * dw + dw / 2 } }, h('span', { className: 'ar-today-knot' }), props.label === false ? null : h('span', { className: 'ar-today-label' }, props.label || 'Hari ini'));
  }
  function WorkloadRow(props) {
    var dw = props.dayWidth || 28, counts = props.counts || [], wk = props.weekends || [];
    return h('div', { className: 'ar-load' },
      props.name ? h('span', { className: 'ar-load-name' }, h(Avatar, { name: props.name, size: 20 }), h('span', null, props.name)) : null,
      h('div', { className: 'ar-load-cells' }, counts.map(function (n, i) {
        var step = Math.min(n, 5);
        return h('span', { key: i, className: cx('ar-heat', 'ar-heat-' + step, wk.indexOf(i) >= 0 && 'is-weekend'), style: { width: dw - 2 }, title: n + ' task aktif' }, n > 0 ? (n > 9 ? '9+' : n) : '');
      })));
  }

  var api = { STATUSES: STATUSES, PRIORITIES: PRIORITIES, Icon: Icon, Mark: Mark, Logo: Logo, Button: Button, IconButton: IconButton, NavItem: NavItem, SearchField: SearchField, Tabs: Tabs, FilterChip: FilterChip,
    StatusPill: StatusPill, PriorityIcon: PriorityIcon, Avatar: Avatar, AvatarStack: AvatarStack, Label: Label, DueDate: DueDate, HoldTooltip: HoldTooltip, SummaryCard: SummaryCard,
    Banner: Banner, Menu: Menu, ActivityItem: ActivityItem, Mention: Mention, GanttTrack: GanttTrack, GanttBar: GanttBar, Milestone: Milestone, TodayMarker: TodayMarker, WorkloadRow: WorkloadRow };
  window.Ariadne = Object.assign(window.Ariadne || {}, api);
})();
