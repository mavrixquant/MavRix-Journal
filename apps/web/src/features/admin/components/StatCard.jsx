
export default function StatCard({ label, value, sub, accent = 'plain', icon: Icon }) {
  const iconCls = `sc-icon sc-icon-${accent}`;
  return (
    <div className="sc-card">
      <div className="sc-row">
        {Icon && (
          <span className={iconCls}>
            <Icon size={16} />
          </span>
        )}
        <div className="sc-text">
          <div className="sc-label">{label}</div>
          <div className={`sc-value sc-value-${accent}`}>{value}</div>
          {sub && <div className="sc-sub">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

if (typeof document !== 'undefined') {
  const ID = 'admin-stat-card-styles';
  if (!document.getElementById(ID)) {
    const s = document.createElement('style');
    s.id = ID;
    s.textContent = `
      .sc-card {
        position: relative;
        padding: 16px 18px;
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
        border: 1px solid rgba(255,255,255,.08);
        box-shadow: 0 20px 50px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.03);
        transition: border-color .25s, transform .25s;
      }
      .sc-card:hover {
        border-color: color-mix(in srgb, var(--accent) 28%, transparent);
        transform: translateY(-1px);
      }
      .sc-row { display: flex; align-items: center; gap: 14px; }
      .sc-icon {
        flex-shrink: 0;
        width: 42px; height: 42px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.08);
        color: #8892A3;
      }
      .sc-icon-amber { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); border-color: color-mix(in srgb, var(--accent) 28%, transparent); }
      .sc-icon-win   { color: #35C4A1; background: rgba(53,196,161,.10); border-color: rgba(53,196,161,.28); }
      .sc-icon-loss  { color: #ef4444; background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.28); }
      .sc-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .sc-label {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 9.5px; font-weight: 700; letter-spacing: .14em;
        text-transform: uppercase; color: #545E6E;
      }
      .sc-value {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 20px; font-weight: 700; letter-spacing: -.01em;
        color: #E7E9EE; line-height: 1.15;
      }
      .sc-value-amber { color: var(--accent); }
      .sc-value-win   { color: #35C4A1; }
      .sc-value-loss  { color: #ef4444; }
      .sc-sub {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 10px; color: #545E6E;
      }
    `;
    document.head.appendChild(s);
  }
}