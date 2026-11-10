import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Archive, MessageSquare, Users, ChevronRight } from 'lucide-react';

import { useTypingConversations } from '@/shared/api/chat';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import EmptyState from '@/shared/components/EmptyState';

import SidebarSearch from './SidebarSearch';
import SidebarTabs from './SidebarTabs';
import SidebarSkeleton from './SidebarSkeleton';
import ConversationRow from './ConversationRow';
import SidebarFab from './SidebarFab';

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
  onAddFriend,
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

  const listRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Ctrl/⌘ + K focuses the search box.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { archived, active } = useMemo(() => {
    const arch = [];
    const main = [];
    for (const c of conversations) (c.isArchived ? arch : main).push(c);
    return { archived: arch, active: main };
  }, [conversations]);

  const base = archivedMode ? archived : active;

  const filtered = useMemo(() => {
    if (!search) return base;
    return base.filter((c) => {
      const name = c.isGroup
        ? (c.name || '').toLowerCase()
        : `${c.peer?.firstName || ''} ${c.peer?.lastName || ''} ${c.peer?.username || ''} ${c.peer?.email || ''}`.toLowerCase();
      return name.includes(search);
    });
  }, [base, search]);

  const visible = useMemo(() => sortConversations(filtered), [filtered]);

  const counts = useMemo(() => {
    let dms = 0;
    let groups = 0;
    for (const c of active) {
      if (c.unreadCount > 0) (c.isGroup ? (groups += 1) : (dms += 1));
    }
    return { dms, groups };
  }, [active]);

  const handleListKeyDown = (e) => {
    const list = listRef.current;
    if (!list) return;
    const rows = Array.from(list.querySelectorAll('button[data-conv-row]'));
    if (rows.length === 0) return;
    const idx = rows.indexOf(document.activeElement);

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      let next;
      if (idx === -1) next = e.key === 'ArrowDown' ? 0 : rows.length - 1;
      else if (e.key === 'ArrowDown') next = Math.min(idx + 1, rows.length - 1);
      else next = Math.max(idx - 1, 0);
      rows[next].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      rows[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      rows[rows.length - 1].focus();
    }
  };

  const headerTitle = archivedMode ? 'Archived' : activeTab === 'groups' ? 'Groups' : 'Messages';
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
        ? 'Use Discover groups below to find a public group.'
        : 'Tap “New message” below to start chatting.';

  const pinned = visible.filter((c) => c.isPinned);
  const rest = visible.filter((c) => !c.isPinned);
  const showSections = !archivedMode && !search && pinned.length > 0;

  const renderRow = (c) => (
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
  );

  return (
    <>
      <div className="chat-sidebar-head">
        <div className="chat-sidebar-title-row">
          {archivedMode && (
            <button
              type="button"
              className="chat-sidebar-back"
              onClick={onArchivedToggle}
              aria-label="Back to conversations"
              title="Back to conversations"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <h2 className="chat-sidebar-title">{headerTitle}</h2>
          <span className="chat-sidebar-count">{headerCount}</span>
        </div>

        <SidebarSearch ref={searchRef} value={searchInput} onChange={setSearchInput} />

        {!archivedMode && <SidebarTabs active={activeTab} onChange={onTabChange} counts={counts} />}
      </div>

      <div
        className="chat-sidebar-list"
        ref={listRef}
        onKeyDown={handleListKeyDown}
        role="list"
        aria-label={headerTitle}
      >
        {!archivedMode && archived.length > 0 && !search && (
          <button
            type="button"
            className="chat-sidebar-archived"
            onClick={onArchivedToggle}
            aria-label={`Archived chats (${archived.length})`}
          >
            <Archive size={15} />
            <span className="chat-sidebar-archived-label">Archived</span>
            <span className="chat-sidebar-archived-count">{archived.length}</span>
            <ChevronRight size={14} />
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
        ) : showSections ? (
          <>
            <div className="chat-sidebar-section">Pinned</div>
            {pinned.map(renderRow)}
            {rest.length > 0 && (
              <div className="chat-sidebar-section">
                {activeTab === 'groups' ? 'All groups' : 'All messages'}
              </div>
            )}
            {rest.map(renderRow)}
          </>
        ) : (
          visible.map(renderRow)
        )}
      </div>

      <SidebarFab
        activeTab={activeTab}
        archivedMode={archivedMode}
        isAdmin={isAdmin}
        onCreateDm={onCreateDm}
        onCreateGroup={onCreateGroup}
        onDiscover={onDiscover}
        onAddFriend={onAddFriend}
      />
    </>
  );
}
