// ============================================================================
// Mave AI sidebar — a 40 vw × full-height overlay containing the 3 AI
// personas (Guide · Trainer · Chat). Opened from the header bar.
//
// The sidebar reuses the existing MessageThread component and its entire
// messaging pipeline (SSE, optimistic send, edit/delete, typing, etc.).
// The only structural differences from the chat page are:
//   • Persona tabs replace the conversation list.
//   • A gear icon opens the existing Settings → Mave AI panel.
//   • A "Reset memory" button wipes the active persona's chat history.
//   • The conversation-info panel is disabled (CSS) so the thread always
//     fills the sidebar.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { X, Settings as SettingsIcon, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import Portal from '@/shared/components/Portal';
import Alert from '@/shared/components/Alert';
import { MAVE_AI_PERSONAS } from '@mavrix/shared';
import {
  useChatConversations,
  useResetAiMemory,
} from '@/shared/api/chat';
import { useSettingsModal } from '@/app/layout/Settings/SettingsModalContext';
import MessageThread from '@/features/personal/chats/components/MessageThread';
import MaveAiAvatar from '@/features/personal/chats/components/MaveAiAvatar';

// The thread + all supporting chat CSS must be loaded even when the user is
// not on the chats page. Vite dedupes CSS imports so this is cheap.
import '@/features/personal/chats/ChatsShell.css';
import './MaveAiSidebar.css';

const PERSONA_ORDER = { guide: 0, trainer: 1, chat: 2 };

function sortPersonas(conversations) {
  return [...conversations].sort((a, b) => {
    return (PERSONA_ORDER[a.aiPersona] ?? 9) - (PERSONA_ORDER[b.aiPersona] ?? 9);
  });
}

export default function MaveAiSidebar({ isOpen = false, onClose }) {
  const { openSettings } = useSettingsModal();

  // Only fetch when the sidebar is actually open (saves a request on boot).
  const { data: allConversations = [], isLoading } = useChatConversations({
    enabled: isOpen,
  });

  const aiConversations = useMemo(
    () => sortPersonas((allConversations || []).filter((c) => c.isAi)),
    [allConversations]
  );

  // Active persona defaults to the one with unread messages, otherwise Guide.
  const [activePersona, setActivePersona] = useState(() => {
    const withUnread = aiConversations.find((c) => c.unreadCount > 0);
    return withUnread?.aiPersona || aiConversations[0]?.aiPersona || 'guide';
  });

  // Reset / repair active persona whenever the list changes.
  useEffect(() => {
    if (!isOpen) return;
    if (!aiConversations.some((c) => c.aiPersona === activePersona)) {
      setActivePersona(aiConversations[0]?.aiPersona || 'guide');
    }
  }, [isOpen, aiConversations, activePersona]);

  const activeConversation = useMemo(
    () => aiConversations.find((c) => c.aiPersona === activePersona) || null,
    [aiConversations, activePersona]
  );

  // Escape closes.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Reset memory confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const resetMemory = useResetAiMemory();

  const personaMeta = Object.fromEntries(MAVE_AI_PERSONAS.map((p) => [p.id, p]));
  const activePersonaLabel =
    personaMeta[activePersona]?.label || 'AI';

  const handleConfirmReset = async () => {
    if (!activeConversation) return;
    const conversationId = activeConversation.id;
    setShowResetConfirm(false);

    try {
      await resetMemory.mutateAsync(conversationId);
      toast.success(`${activePersonaLabel} memory has been reset`, {
        description: 'The next reply starts with a completely clean context.',
      });
    } catch (err) {
      toast.error(err?.message || 'Could not reset memory');
    }
  };

  if (!isOpen) return null;

  const handleOpenSettings = () => {
    onClose();
    openSettings('mave-ai');
  };

  return (
    <Portal>
      <div
        className="mave-sidebar-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Mave AI assistant"
      >
        <aside className="mave-sidebar">
          <header className="mave-sidebar-header">
            <MaveAiAvatar size={36} />
            <div className="mave-sidebar-title-block">
              <h2 className="mave-sidebar-title">Mave AI</h2>
              <p className="mave-sidebar-sub">Guide · Trainer · Chat</p>
            </div>

            {activeConversation && (
              <button
                type="button"
                className="mave-sidebar-btn is-danger"
                onClick={() => setShowResetConfirm(true)}
                disabled={resetMemory.isPending}
                title={`Reset ${activePersonaLabel} memory`}
                aria-label={`Reset ${activePersonaLabel} memory`}
              >
                <RotateCcw size={15} />
              </button>
            )}

            <button
              type="button"
              className="mave-sidebar-btn"
              onClick={handleOpenSettings}
              title="Mave AI settings"
              aria-label="Open Mave AI settings"
            >
              <SettingsIcon size={15} />
            </button>
            <button
              type="button"
              className="mave-sidebar-btn"
              onClick={onClose}
              title="Close"
              aria-label="Close Mave AI"
            >
              <X size={16} />
            </button>
          </header>

          <div className="mave-sidebar-tabs" role="tablist">
            {MAVE_AI_PERSONAS.map((p) => {
              const conv = aiConversations.find((c) => c.aiPersona === p.id);
              const active = p.id === activePersona;
              const unread = conv?.unreadCount || 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`mave-sidebar-tab${active ? ' is-active' : ''}`}
                  onClick={() => setActivePersona(p.id)}
                  disabled={!conv}
                  title={p.description}
                >
                  <span>{p.label}</span>
                  {unread > 0 && (
                    <span className="mave-sidebar-tab-badge">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mave-sidebar-body">
            {isLoading && !activeConversation ? (
              <div className="mave-sidebar-loading">
                <Loader2 size={22} className="mave-sidebar-spinner" />
                <span>Preparing {activePersonaLabel}…</span>
              </div>
            ) : activeConversation ? (
              <MessageThread
                key={activeConversation.id}
                conversationId={activeConversation.id}
                onBack={onClose}
                onConversationClosed={onClose}
                onOpenThread={() => {
                  /* No cross-conversation navigation from the sidebar. */
                }}
              />
            ) : (
              <div className="mave-sidebar-loading">
                <Loader2 size={22} className="mave-sidebar-spinner" />
                <span>Starting conversation…</span>
              </div>
            )}
          </div>
        </aside>
      </div>

      <Alert
        isOpen={showResetConfirm}
        type="confirm"
        title={`Reset ${activePersonaLabel} memory?`}
        message={
          `This permanently deletes every message with ${activePersonaLabel} ` +
          `and gives the assistant a completely fresh start. ` +
          `This cannot be undone.`
        }
        confirmText="Reset memory"
        cancelText="Cancel"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </Portal>
  );
}