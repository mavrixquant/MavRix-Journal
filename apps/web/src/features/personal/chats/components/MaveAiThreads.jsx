// ============================================================================
// MaveAiThreads — the Mave AI hub.
//
// Renders a persona tab bar (Guide · Trainer · Chat) and mounts the
// corresponding MessageThread below it. Each persona has its own conversation
// (own memory, own history, own character). Switching tabs swaps the mounted
// thread cleanly via React `key`, so internal state (edit drafts, reply
// composer, scroll position) is scoped per persona.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';

import MessageThread from './MessageThread';
import MaveAiAvatar from './MaveAiAvatar';
import { MAVE_AI_PERSONAS } from '@mavrix/shared';

const PERSONA_ORDER = { guide: 0, trainer: 1, chat: 2 };

const PERSONA_TAGLINES = {
  guide: 'App guide · every MavRix feature',
  trainer: 'Trading coach · risk, edge, psychology',
  chat: 'Friendly chat · anything goes',
};

function sortPersonas(conversations) {
  return [...conversations].sort((a, b) => {
    return (PERSONA_ORDER[a.aiPersona] ?? 9) - (PERSONA_ORDER[b.aiPersona] ?? 9);
  });
}

export default function MaveAiThreads({
  aiConversations,
  onBack,
  onOpenThread,
}) {
  const sorted = useMemo(
    () => sortPersonas(aiConversations || []),
    [aiConversations]
  );

  // Auto-select the persona with unread messages first; fall back to first.
  const [activePersona, setActivePersona] = useState(() => {
    const withUnread = sorted.find((c) => c.unreadCount > 0);
    return withUnread?.aiPersona || sorted[0]?.aiPersona || 'guide';
  });

  useEffect(() => {
    if (!sorted.some((c) => c.aiPersona === activePersona)) {
      setActivePersona(sorted[0]?.aiPersona || 'guide');
    }
  }, [sorted, activePersona]);

  const activeConversation = useMemo(
    () => sorted.find((c) => c.aiPersona === activePersona) || null,
    [sorted, activePersona]
  );

  const tabs = MAVE_AI_PERSONAS.map((meta) => {
    const conv = sorted.find((c) => c.aiPersona === meta.id);
    const unread = conv?.unreadCount || 0;
    return {
      ...meta,
      conversationId: conv?.id || null,
      unread,
    };
  });

  return (
    <div className="mave-ai-hub">
      <style>{CSS}</style>

      <div className="mave-ai-header">
        <div className="mave-ai-header-left">
          <MaveAiAvatar size={36} />
          <div className="mave-ai-header-text">
            <span className="mave-ai-title">
              Mave AI
              <span className="mave-ai-badge">
                <Sparkles
                  size={9}
                  style={{ verticalAlign: 'middle', marginRight: 3 }}
                />
                Multi-persona
              </span>
            </span>
            <span className="mave-ai-sub">Each persona keeps its own memory</span>
          </div>
        </div>

        <div className="mave-ai-tabs" role="tablist" aria-label="Mave AI personas">
          {tabs.map((tab) => {
            const isActive = tab.id === activePersona;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`mave-ai-tab${isActive ? ' is-active' : ''}`}
                onClick={() => setActivePersona(tab.id)}
                disabled={!tab.conversationId}
                title={PERSONA_TAGLINES[tab.id]}
              >
                <span className="mave-ai-tab-dot" aria-hidden />
                <span className="mave-ai-tab-label">{tab.label}</span>
                {tab.unread > 0 && (
                  <span className="mave-ai-tab-badge">
                    {tab.unread > 99 ? '99+' : tab.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mave-ai-thread-wrap">
        {activeConversation ? (
          <MessageThread
            key={activeConversation.id}
            conversationId={activeConversation.id}
            onBack={onBack}
            onConversationClosed={onBack}
            onOpenThread={onOpenThread}
          />
        ) : (
          <div className="mave-ai-loading">Preparing {activePersona}…</div>
        )}
      </div>
    </div>
  );
}

const CSS = `
  .mave-ai-hub {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: linear-gradient(180deg, rgba(15,18,25,.55), rgba(15,18,25,.40));
  }

  .mave-ai-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,.06);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent) 4%, transparent),
      transparent
    );
    flex-wrap: wrap;
  }

  .mave-ai-header-left {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .mave-ai-header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .mave-ai-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
    color: #E7E9EE;
    letter-spacing: -.005em;
    line-height: 1.2;
  }

  .mave-ai-badge {
    display: inline-flex;
    align-items: center;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 99px;
    border: 1px solid var(--accent-soft2);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    color: var(--accent);
  }

  .mave-ai-sub {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: #545E6E;
    letter-spacing: .02em;
  }

  .mave-ai-tabs {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border-radius: 12px;
    background: rgba(0,0,0,.32);
    border: 1px solid rgba(255,255,255,.06);
    backdrop-filter: blur(8px);
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .mave-ai-tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 13px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    white-space: nowrap;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    outline: none;
  }
  .mave-ai-tab:hover:not(:disabled):not(.is-active) {
    color: #E7E9EE;
    background: rgba(255,255,255,.04);
  }
  .mave-ai-tab:disabled {
    opacity: .4;
    cursor: not-allowed;
  }
  .mave-ai-tab.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    box-shadow:
      0 8px 20px -10px color-mix(in srgb, var(--accent) 60%, transparent),
      inset 0 1px 0 rgba(255,255,255,.4);
  }

  .mave-ai-tab-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    opacity: .55;
    flex-shrink: 0;
  }
  .mave-ai-tab.is-active .mave-ai-tab-dot {
    opacity: 1;
    box-shadow: 0 0 8px rgba(13,17,23,.35);
  }

  .mave-ai-tab-label {
    line-height: 1;
  }

  .mave-ai-tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 5px;
    border-radius: 8px;
    background: var(--accent);
    color: #0D1117;
    font-size: 9.5px;
    font-weight: 700;
    line-height: 1;
  }
  .mave-ai-tab.is-active .mave-ai-tab-badge {
    background: rgba(13,17,23,.22);
    color: #0D1117;
  }

  .mave-ai-thread-wrap {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }
  .mave-ai-thread-wrap > .chat-thread {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
  }

  .mave-ai-loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8892A3;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
  }

  @media (prefers-reduced-motion: reduce) {
    .mave-ai-tab { transition: none !important; }
  }

  @media (max-width: 720px) {
    .mave-ai-header {
      padding: 10px 12px;
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }
    .mave-ai-tabs {
      width: 100%;
      overflow-x: auto;
      flex-wrap: nowrap;
    }
    .mave-ai-tab { flex-shrink: 0; }
  }
`;