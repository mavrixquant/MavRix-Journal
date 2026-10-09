// apps/web/src/features/admin/nav.config.js
import {
  LayoutDashboard, Users, Wallet, TrendingUp,
  Calendar, Radio, MessageSquare, Layers, Brain,
  ScrollText, Settings, Activity,
} from 'lucide-react';

export const ADMIN_NAV = [
  {
    section: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    section: 'Manage',
    items: [
      { to: '/admin/users',      label: 'Users',      icon: Users },
      { to: '/admin/accounts',   label: 'Accounts',   icon: Wallet },
      { to: '/admin/trades',     label: 'Trades',     icon: TrendingUp },
      { to: '/admin/strategies', label: 'Strategies', icon: Brain },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/admin/calendar',  label: 'Calendar',   icon: Calendar },
      { to: '/admin/gex',       label: 'GEX Levels', icon: Layers },
      { to: '/admin/sessions',  label: 'Sessions',   icon: Radio },
      { to: '/admin/broadcast', label: 'Broadcast',  icon: MessageSquare },
    ],
  },
  {
    section: 'System',
    items: [
      { to: '/admin/audit',    label: 'Audit log', icon: ScrollText },
      { to: '/admin/settings', label: 'Settings',  icon: Settings },
      { to: '/admin/system',   label: 'System',    icon: Activity },
    ],
  },
];

export function isAdminItemActive(pathname, item) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + '/');
}