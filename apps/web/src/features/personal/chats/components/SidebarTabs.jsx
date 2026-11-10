const TABS = [
  { id: 'dms',    label: 'Direct' },
  { id: 'groups', label: 'Groups' },
];

export default function SidebarTabs({ active, onChange, counts = {} }) {
  const index = Math.max(0, TABS.findIndex((t) => t.id === active));

  return (
    <div
      className="chat-sidebar-tabs"
      role="tablist"
      style={{ '--tab-i': index, '--tab-n': TABS.length }}
    >
      <span className="chat-sidebar-tab-thumb" aria-hidden />
      {TABS.map((t) => {
        const count = counts[t.id] || 0;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            className={`chat-sidebar-tab${active === t.id ? ' is-active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <span>{t.label}</span>
            {count > 0 && (
              <span className="chat-sidebar-tab-count">{count > 99 ? '99+' : count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
