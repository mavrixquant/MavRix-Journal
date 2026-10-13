// apps/web/src/app/layout/Settings/SettingsModal.jsx
//
// Global settings modal. Opens from three places in the HeaderBar:
//   - Palette icon  → Appearance tab
//   - Settings icon → Preferences tab
//   - User pill     → Account tab
//
// Phase 1 ships the shell + the fully-functional Account panel. Every other
// tab renders a "Coming in Phase 2" placeholder.

import { useEffect, useState } from 'react';
import {
  User,
  Palette,
  SlidersHorizontal,
  Bell,
  MessageSquare,
  Database,
  Info,
  X,
} from 'lucide-react';

import Portal from '@/shared/components/Portal';
import AccountPanel from './panels/AccountPanel';
import PlaceholderPanel from './panels/PlaceholderPanel';
import './SettingsModal.css';

/* ------------------------------------------------------------------ */
/*  Tab metadata                                                       */
/* ------------------------------------------------------------------ */

const TABS = [
  {
    id: 'account',
    label: 'Account',
    title: 'Account Settings',
    subtitle: 'Your profile, email verification, and connected accounts.',
    icon: User,
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SettingsModal({
  isOpen,
  onClose,
  initialTab = 'account',
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Re-sync the active tab whenever the modal is (re)opened from a different
  // entry point. If the user closes via Account and reopens via Palette,
  // they land on Appearance, not Account.
  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  // Escape closes. Bound only while the modal is open.
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
          {/* ---------- Left rail: navigation ---------- */}
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

          {/* ---------- Right pane: content ---------- */}
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
              {activeTab === 'account' && <AccountPanel />}

              {activeTab === 'appearance' && (
                <PlaceholderPanel
                  title="Appearance options coming soon"
                  description="Accent color, density, font size, and reduced-motion toggles will live here."
                />
              )}

              {activeTab === 'preferences' && (
                <PlaceholderPanel
                  title="Preferences coming soon"
                  description="Default landing page, time format, date format, and confirmation behaviour will live here."
                />
              )}

              {activeTab === 'notifications' && (
                <PlaceholderPanel
                  title="Notification controls coming soon"
                  description="Broadcast banners, chat alerts, sound, and typing indicators will be configurable here."
                />
              )}

              {activeTab === 'chats' && (
                <PlaceholderPanel
                  title="Chat preferences coming soon"
                  description="Composer behaviour, read receipts, and inline typing display will be configurable here."
                />
              )}

              {activeTab === 'data' && (
                <PlaceholderPanel
                  title="Data controls coming soon"
                  description="Export your data, clear the local cache, and reset saved dashboard layouts from here."
                />
              )}

              {activeTab === 'about' && (
                <PlaceholderPanel
                  title="About & support coming soon"
                  description="Version info, terms, privacy, and support contact will live here."
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </Portal>
  );
}