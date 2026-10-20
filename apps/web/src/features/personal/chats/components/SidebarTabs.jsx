const TABS = [
  { id: 'dms',    label: 'DMs' },
  { id: 'groups', label: 'Groups' },
];

export default function SidebarTabs({ active, onChange, counts = {} }) {
  return (
    <div className="chat-sidebar-tabs" role="tablist">
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
              <span className="chat-sidebar-tab-count">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}