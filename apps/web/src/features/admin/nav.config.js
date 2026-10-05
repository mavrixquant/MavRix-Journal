// apps/web/src/features/admin/nav.config.js
//
// Sidebar tree for the admin shell. Items marked `soon: true` are
// placeholders that route to a "coming soon" state — they exist so the
// navigation reflects the full planned surface, even before each page
// is implemented.

import {
  LayoutDashboard,
  Users,
  Wallet,
  TrendingUp,
  Calendar,
  Radio,
  MessageSquare,
  ScrollText,
  Settings,
  Activity,
} from 'lucide-react';

export const ADMIN_NAV = [
  {
    section: 'Overview',
    items: [
      { to: '/admin',       label: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    section: 'Manage',
    items: [
      { to: '/admin/users',    label: 'Users',    icon: Users },
      { to: '/admin/accounts', label: 'Accounts', icon: Wallet },
      { to: '/admin/trades',   label: 'Trades',   icon: TrendingUp },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/admin/calendar',  label: 'Calendar',  icon: Calendar,      soon: true },
      { to: '/admin/sessions',  label: 'Sessions',  icon: Radio,         soon: true },
      { to: '/admin/broadcast', label: 'Broadcast', icon: MessageSquare, soon: true },
    ],
  },
  {
    section: 'System',
    items: [
      { to: '/admin/audit',    label: 'Audit log', icon: ScrollText, soon: true },
      { to: '/admin/settings', label: 'Settings',  icon: Settings,   soon: true },
      { to: '/admin/system',   label: 'System',    icon: Activity,   soon: true },
    ],
  },
];

export function isAdminItemActive(pathname, item) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + '/');
}