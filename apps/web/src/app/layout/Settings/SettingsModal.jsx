import { useEffect, useState } from 'react';
import {
  User,
  Shield,
  Palette,
  SlidersHorizontal,
  Bell,
  MessageSquare,
  Database,
  Info,
  X,
  Sparkles,
} from 'lucide-react';

import Portal from '@/shared/components/Portal';

import AccountPanel       from './panels/AccountPanel';
import SecurityPanel      from './panels/SecurityPanel';
import AppearancePanel    from './panels/AppearancePanel';
import PreferencesPanel   from './panels/PreferencesPanel';
import NotificationsPanel from './panels/NotificationsPanel';
import ChatsPanel         from './panels/ChatsPanel';
import DataPanel          from './panels/DataPanel';
import AboutPanel         from './panels/AboutPanel';
import MaveAiPanel        from './panels/MaveAiPanel';

import './SettingsModal.css';


const TABS = [
  {
    id: 'account',
    label: 'Account',
    title: 'Account Settings',
    subtitle: 'Your profile and email verification.',
    icon: User,
  },
  {
    id: 'security',
    label: 'Security',
    title: 'Security',
    subtitle: 'Password, two-factor authentication, and connected accounts.',
    icon: Shield,
  },
  {
    id: 'mave-ai',
    label: 'Mave AI',
    title: 'Mave AI Assistant',
    subtitle: 'Configure your personal AI assistant and API keys.',
    icon: Sparkles,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    title: 'Appearance',
    subtitle: 'Accent color, density, font size, and motion preferences.',
    icon: Palette,
  },
  {
    id: 'preferences',
    label: 'Preferences',
    title: 'Preferences',
    subtitle: 'Default landing page, time/date format, and confirmation rules.',
    icon: SlidersHorizontal,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    title: 'Notifications',
    subtitle: 'Broadcasts, chat alerts, sounds, and typing indicators.',
    icon: Bell,
  },
  {
    id: 'chats',
    label: 'Chats',
    title: 'Chats',
    subtitle: 'Message composer behaviour and in-thread display options.',
    icon: MessageSquare,
  },
  {
    id: 'data',
    label: 'Data',
    title: 'Data & Storage',
    subtitle: 'Export your data, clear caches, and reset saved state.',
    icon: Database,
  },
  {
    id: 'about',
    label: 'About',
    title: 'About',
    subtitle: 'Version, terms, privacy, and support.',
    icon: Info,
  },
];


function renderPanel(id) {
  switch (id) {
    case 'account':       return <AccountPanel />;
    case 'security':      return <SecurityPanel />;
    case 'mave-ai':       return <MaveAiPanel />;
    case 'appearance':    return <AppearancePanel />;
    case 'preferences':   return <PreferencesPanel />;
    case 'notifications': return <NotificationsPanel />;
    case 'chats':         return <ChatsPanel />;
    case 'data':          return <DataPanel />;
    case 'about':         return <AboutPanel />;
    default:              return null;
  }
}


export default function SettingsModal({
  isOpen,
  onClose,
  initialTab = 'account',
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const current = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <Portal>
      <div
        className="settings-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="settings-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
        >
          <aside className="settings-rail">
            <div className="settings-rail-head">
              <span className="settings-rail-eyebrow">Preferences</span>
              <h2 className="settings-rail-title">Settings</h2>
            </div>

            <nav className="settings-rail-nav">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`settings-tab${isActive ? ' is-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="settings-pane">
            <header className="settings-pane-head">
              <div className="settings-pane-headtext">
                <span className="settings-pane-eyebrow">{current.label}</span>
                <h3 className="settings-pane-title">{current.title}</h3>
                {current.subtitle && (
                  <p className="settings-pane-sub">{current.subtitle}</p>
                )}
              </div>

              <button
                type="button"
                className="settings-close"
                onClick={onClose}
                aria-label="Close settings"
              >
                <X size={16} />
              </button>
            </header>

            <div className="settings-pane-body">
              {renderPanel(activeTab)}
            </div>
          </section>
        </div>
      </div>
    </Portal>
  );
}