// apps/web/src/features/personal/chats/components/ConversationList.jsx
//
// Sidebar contents for the DMs / Groups panes. Composes:
//   SidebarSearch   → filter box
//   SidebarTabs     → DMs / Groups pills
//   ConversationRow → one row per conversation

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Archive,
  MessageSquare,
  MessageSquarePlus,
  Users,
} from 'lucide-react';

import { useTypingConversations } from '@/shared/api/chat';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import EmptyState from '@/shared/components/EmptyState';

import SidebarSearch from './SidebarSearch';
import SidebarTabs from './SidebarTabs';
import SidebarSkeleton from './SidebarSkeleton';
import ConversationRow from './ConversationRow';

const SEARCH_DEBOUNCE_MS = 200;

function sortConversations(arr) {
  return [...arr].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const at = new Date(a.lastMessageAt).getTime() || 0;
    const bt = new Date(b.lastMessageAt).getTime() || 0;
    return bt - at;
  });
}

export default function ConversationList({
  conversations,
  selectedId,
  currentUserId,
  onSelect,
  activeTab = 'dms',
  onTabChange,
  archivedMode = false,
  onArchivedToggle,
  onCreateDm,
  onCreateGroup,
  onDiscover,
  isAdmin = false,
  isLoading = false,
}) {
  const { settings } = useSettings();
  const timeFormat = settings.preferences.timeFormat;
  const timezone = settings.preferences.timezone;
  const showTypingInList = settings.notifications.showTypingInList;

  const typingSet = useTypingConversations(currentUserId);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(
      () => setSearch(searchInput.trim().toLowerCase()),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(t);
  }, [searchInput]);

  const { archived, active } = useMemo(() => {
    const arch = [];
    const main = [];
    for (const c of conversations) {
      if (c.isArchived) arch.push(c);
      else main.push(c);
    }
    return { archived: arch, active: main };
  }, [conversations]);

  const base = archivedMode ? archived : active;

  const filtered = useMemo(() => {
    if (!search) return base;
    return base.filter((c) => {
      const name = c.isGroup
        ? (c.name || '').toLowerCase()
        : `${c.peer?.firstName || ''} ${c.peer?.lastName || ''} ${c.peer?.email || ''}`.toLowerCase();
      return name.includes(search);
    });
  }, [base, search]);

  const visible = useMemo(() => sortConversations(filtered), [filtered]);

  const counts = useMemo(() => {
    let dms = 0;
    let groups = 0;
    for (const c of active) {
      if (c.unreadCount > 0) {
        if (c.isGroup) groups += 1;
        else dms += 1;
      }
    }
    return { dms, groups };
  }, [active]);

  const headerTitle = archivedMode
    ? 'Archived'
    : activeTab === 'groups'
      ? 'Groups'
      : 'Messages';

  const headerCount = archivedMode ? archived.length : filtered.length;

  const emptyTitle = archivedMode
    ? 'No archived chats'
    : search
      ? 'No conversations match'
      : activeTab === 'groups'
        ? 'No groups yet'
        : 'No direct messages yet';

  const emptyDescription = archivedMode
    ? 'Archived conversations will appear here.'
    : search
      ? 'Try a different search term.'
      : activeTab === 'groups'
        ? 'Use the Discover button below to find a public group.'
        : 'Tap "New message" below to start chatting.';

  const renderFooter = () => {
    if (archivedMode) return null;

    if (activeTab === 'dms') {
      return (
        <div className="chat-sidebar-foot">
          <button
            type="button"
            className="chat-sidebar-cta"
            onClick={onCreateDm}
          >
            <MessageSquarePlus size={12} />
            <span>New message</span>
          </button>
        </div>
      );
    }

    if (activeTab === 'groups') {
      return (
        <div className="chat-sidebar-foot">
          <button
            type="button"
            className="chat-sidebar-cta"
            onClick={onDiscover}
          >
            <Users size={12} />
            <span>Discover</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              className="chat-sidebar-icon-btn"
              onClick={onCreateGroup}
              title="Create group"
              aria-label="Create group"
            >
              <MessageSquarePlus size={14} />
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div className="chat-sidebar-head">
        <div className="chat-sidebar-title-row">
          {archivedMode && (
            <button
              type="button"
              className="chat-sidebar-icon-btn"
              onClick={onArchivedToggle}
              aria-label="Back"
              title="Back to conversations"
              style={{ width: 28, height: 28 }}
            >
              <ArrowLeft size={13} />
            </button>
          )}
          <span className="chat-sidebar-title">{headerTitle}</span>
          <span className="chat-sidebar-count">{headerCount}</span>
        </div>

        <SidebarSearch value={searchInput} onChange={setSearchInput} />

        {!archivedMode && (
          <SidebarTabs
            active={activeTab}
            onChange={onTabChange}
            counts={counts}
          />
        )}
      </div>

      <div className="chat-sidebar-list">
        {!archivedMode && archived.length > 0 && (
          <button
            type="button"
            className="chat-sidebar-archived"
            onClick={onArchivedToggle}
            aria-label={`Archived chats (${archived.length})`}
          >
            <Archive size={13} />
            <span style={{ flex: 1 }}>Archived</span>
            <span className="chat-sidebar-count">{archived.length}</span>
          </button>
        )}

        {isLoading ? (
          <SidebarSkeleton />
        ) : visible.length === 0 ? (
          <div className="chat-sidebar-empty">
            <EmptyState
              size="sm"
              variant="bare"
              icon={activeTab === 'groups' ? Users : MessageSquare}
              eyebrow={archivedMode ? 'Archived' : search ? 'No matches' : 'Nothing here'}
              title={emptyTitle}
              description={emptyDescription}
            />
          </div>
        ) : (
          visible.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              selected={c.id === selectedId}
              currentUserId={currentUserId}
              onClick={() => onSelect(c.id)}
              timeFormat={timeFormat}
              timezone={timezone}
              isTyping={showTypingInList && typingSet.has(c.id)}
            />
          ))
        )}
      </div>

      {renderFooter()}
    </>
  );
}