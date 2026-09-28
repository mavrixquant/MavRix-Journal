// apps/web/src/app/shell/nav.config.js
//
// Single source of truth for the sidebar navigation tree.
// Each top-level entry is a group; each `items` entry is a route.

import {
  FaBook,
  FaProjectDiagram,
  FaUsers,
  FaComments,
  FaThLarge,
  FaCalendarAlt,
  FaChartPie,
  FaChartLine,
  FaClipboardList,
  FaChartBar,
  FaWallet,
  FaBrain,
  FaCommentDots,
} from 'react-icons/fa';

export const SIDEBAR_GROUPS = [
  {
    id: 'journal',
    label: 'Journal',
    icon: FaBook,
    items: [
      { to: '/journal',          label: 'Dashboard',         icon: FaThLarge,     end: true },
      { to: '/journal/analyse',  label: 'Analyse',           icon: FaChartPie },
      { to: '/journal/logs',     label: 'Trade logs',        icon: FaBook },
      { to: '/journal/calendar', label: 'Economic Calendar', icon: FaCalendarAlt },
    ],
  },
  {
    id: 'backtester',
    label: 'Backtester',
    icon: FaProjectDiagram,
    items: [
      { to: '/backtester',           label: 'Dashboard', icon: FaChartLine, end: true },
      { to: '/backtester/logs',      label: 'Test logs', icon: FaClipboardList },
      { to: '/backtester/simulator', label: 'Simulator', icon: FaProjectDiagram },
      { to: '/backtester/chart',     label: 'Chart',     icon: FaChartBar },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    icon: FaUsers,
    items: [
      { to: '/manage/accounts',   label: 'Accounts',   icon: FaWallet },
      { to: '/manage/strategies', label: 'Strategies', icon: FaBrain },
    ],
  },
  {
    id: 'personal',
    label: 'Personal Space',
    icon: FaComments,
    items: [
      { to: '/personal/discussion', label: 'Discussion', icon: FaComments },
      { to: '/personal/chats',      label: 'Chats',      icon: FaCommentDots },
    ],
  },
];

export function isItemActive(pathname, item) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + '/');
}

export function groupHasActive(pathname, group) {
  return group.items.some((item) => isItemActive(pathname, item));
}