import { useMemo } from 'react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { makeFmt, shortDate, toneColor } from '@/features/dashboard/components/viz/format';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Slim context strip above the grid: which account, which period, and today/week/month results. */
export default function DashboardContextBar({ account }) {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';
  const fmt = makeFmt(isMoney);

  const info = useMemo(() => {
    const out = stats?.outcomes || [];
    if (!out.length) return null;
    const now = new Date();
    const today = ymd(now);
    const monday = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)));
    const month = today.slice(0, 7);

    let d = 0, w = 0, m = 0, dn = 0, wn = 0, mn = 0;
    let first = out[0].date;
    let last = out[0].date;
    out.forEach((o) => {
      const s = Number(o.score) || 0;
      if (!o.date) return;
      if (o.date < first) first = o.date;
      if (o.date > last) last = o.date;
      if (o.date === today) { d += s; dn += 1; }
      if (o.date >= monday) { w += s; wn += 1; }
      if (o.date.startsWith(month)) { m += s; mn += 1; }
    });
    return { first, last, d, w, m, dn, wn, mn, n: out.length };
  }, [stats]);

  if (!info) return null;
  const type = account?.type;

  const pills = [
    { label: 'Today', v: info.d, n: info.dn },
    { label: 'This week', v: info.w, n: info.wn },
    { label: 'This month', v: info.m, n: info.mn },
  ];

  return (
    <div className="cb">
      <div className="cb-left">
        <span className={`cb-badge${type ? ` is-${String(type).toLowerCase()}` : ''}`}>
          <i />
          {account?.name || 'Account'}
          {type && <em>{type}</em>}
        </span>
        <span className="cb-meta">
          {info.n} trades · {shortDate(info.first)} → {shortDate(info.last)}
        </span>
      </div>
      <div className="cb-pills">
        {pills.map((p) => (
          <div key={p.label} className="cb-pill">
            <span>{p.label}</span>
            <b style={{ color: p.n ? toneColor(p.v) : 'var(--d-ink-3)' }}>{p.n ? fmt(p.v) : '—'}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
