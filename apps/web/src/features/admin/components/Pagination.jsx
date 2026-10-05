// apps/web/src/features/admin/components/Pagination.jsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, total, onChange }) {
  if (!pages || pages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pages;

  return (
    <>
      <style>{CSS}</style>
      <div className="pg-root">
        <span className="pg-info">
          Page <strong>{page}</strong> of <strong>{pages}</strong>
          <span className="pg-total"> · {total} total</span>
        </span>
        <div className="pg-btns">
          <button
            type="button"
            className="pg-btn"
            disabled={prevDisabled}
            onClick={() => onChange(page - 1)}
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <button
            type="button"
            className="pg-btn"
            disabled={nextDisabled}
            onClick={() => onChange(page + 1)}
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </>
  );
}

const CSS = `
  .pg-root {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 4px 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    color: #8892A3;
  }
  .pg-info strong { color: #E7E9EE; font-weight: 700; }
  .pg-total { color: #545E6E; }
  .pg-btns { display: inline-flex; gap: 6px; }
  .pg-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: #8892A3;
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all .18s;
  }
  .pg-btn:hover:not(:disabled) {
    color: #F59E0B;
    border-color: rgba(245,158,11,.35);
    background: rgba(245,158,11,.06);
  }
  .pg-btn:disabled { opacity: .35; cursor: not-allowed; }
`;