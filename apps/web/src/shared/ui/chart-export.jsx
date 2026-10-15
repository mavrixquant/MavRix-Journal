// apps/web/src/components/ui/chart-export.jsx
import { Download } from 'lucide-react';

const CSS = `
  .chart-export-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 4;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.10);
    background: rgba(15,18,25,.72);
    backdrop-filter: blur(8px);
    color: #8892A3;
    cursor: pointer;
    padding: 0;
    opacity: .35;
    transition:
      opacity .22s ease,
      color .18s ease,
      border-color .18s ease,
      background-color .18s ease;
  }
  .chart-export-btn:hover,
  .chart-export-btn:focus-visible {
    opacity: 1;
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 35%, transparent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    outline: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .chart-export-btn { transition: none; }
  }
`;

export function ChartExportButton({ chartRef, filename = 'chart' }) {
  const handleExport = () => {
    const instance = chartRef?.current;
    const canvas = instance?.canvas ?? instance?.ctx?.canvas;
    if (!canvas) return;
    try {
      const url = canvas.toDataURL('image/png', 1.0);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('[chart-export] failed:', err);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        className="chart-export-btn"
        onClick={handleExport}
        title="Export as PNG"
        aria-label="Export chart as PNG"
      >
        <Download size={12} />
      </button>
    </>
  );
}