// apps/web/src/features/admin/components/RoleBadge.jsx
export default function RoleBadge({ role }) {
  const cls =
    role === 'superadmin' ? 'rb-super'
    : role === 'admin'    ? 'rb-admin'
    : 'rb-user';

  return (
    <>
      <style>{CSS}</style>
      <span className={`rb ${cls}`}>{role || 'user'}</span>
    </>
  );
}

const CSS = `
  .rb {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 99px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    border: 1px solid;
    white-space: nowrap;
  }
  .rb-super {
    color: #F59E0B;
    background: rgba(245,158,11,.10);
    border-color: rgba(245,158,11,.35);
  }
  .rb-admin {
    color: #60a5fa;
    background: rgba(96,165,250,.10);
    border-color: rgba(96,165,250,.30);
  }
  .rb-user {
    color: #8892A3;
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.10);
  }
`;