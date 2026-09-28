// apps/web/src/components/ui/data-table.jsx
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useState, useMemo, useDeferredValue } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Styles — inline, no Tailwind required                              */
/* ------------------------------------------------------------------ */
const CSS = `
  .dt-root {
    --dt-accent: #F59E0B;
    --dt-accent-2: #FDE68A;
    --dt-line: rgba(255,255,255,.085);
    --dt-line-soft: rgba(255,255,255,.05);
    --dt-ink-1: #E7E9EE;
    --dt-ink-2: #8892A3;
    --dt-ink-3: #545E6E;
    --dt-panel: #11151F;
    --dt-panel-2: #151A26;
    width: 100%;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    color: var(--dt-ink-1);
  }
  .dt-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .dt-search {
    position: relative;
    flex: 1;
    min-width: 200px;
  }
  .dt-search-input {
    width: 100%;
    background: rgba(10,13,19,.6);
    border: 1px solid var(--dt-line);
    border-radius: 8px;
    color: var(--dt-ink-1);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    padding: 8px 12px 8px 34px;
    outline: none;
    box-sizing: border-box;
    transition: all .2s;
  }
  .dt-search-input::placeholder { color: var(--dt-ink-3); }
  .dt-search-input:hover { border-color: rgba(255,255,255,.2); }
  .dt-search-input:focus {
    border-color: var(--dt-accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .dt-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--dt-ink-3);
    pointer-events: none;
  }

  .dt-cols-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--dt-line);
    background: rgba(255,255,255,.03);
    color: var(--dt-ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .2s;
  }
  .dt-cols-btn:hover {
    color: var(--dt-accent);
    border-color: rgba(245,158,11,.28);
    background: rgba(245,158,11,.06);
  }

  .dt-cols-panel {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 50;
    min-width: 200px;
    max-height: 320px;
    overflow-y: auto;
    background: #11151F;
    border: 1px solid #212836;
    border-radius: 10px;
    box-shadow: 0 16px 40px -12px rgba(0,0,0,.7);
    padding: 6px;
  }
  .dt-cols-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    color: var(--dt-ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .dt-cols-row:hover {
    background: rgba(255,255,255,.04);
    color: var(--dt-ink-1);
  }
  .dt-cols-row input {
    accent-color: var(--dt-accent);
    cursor: pointer;
    width: 14px;
    height: 14px;
  }

  .dt-scroll {
    overflow: auto;
    border: 1px solid var(--dt-line);
    border-radius: 10px;
    background: rgba(0,0,0,.15);
    position: relative;
  }
  .dt-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    table-layout: fixed;
  }
  .dt-thead {
    position: sticky;
    top: 0;
    z-index: 5;
    background: #151A26;
  }
  .dt-th {
    padding: 10px 12px;
    text-align: left;
    font-weight: 700;
    color: var(--dt-ink-2);
    font-size: 10.5px;
    letter-spacing: .06em;
    text-transform: uppercase;
    white-space: nowrap;
    border-bottom: 1px solid var(--dt-line);
    user-select: none;
    position: relative;
    background: #151A26;
  }
  .dt-th.sortable {
    cursor: pointer;
  }
  .dt-th.sortable:hover {
    color: var(--dt-accent);
  }
  .dt-th-inner {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dt-resizer {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 6px;
    cursor: col-resize;
    user-select: none;
    touch-action: none;
    background: transparent;
  }
  .dt-resizer:hover, .dt-resizer.is-resizing {
    background: var(--dt-accent);
  }

  .dt-row {
    transition: background-color .12s ease;
  }
  .dt-row:hover {
    background: rgba(255,255,255,.025);
  }
  .dt-td {
    padding: 9px 12px;
    color: var(--dt-ink-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-bottom: 1px solid var(--dt-line-soft);
  }
  .dt-td.sticky-left {
    position: sticky;
    left: 0;
    background: #0D1117;
    z-index: 2;
  }
  .dt-row:hover .dt-td.sticky-left {
    background: #10151D;
  }

  /* Cell type styling */
  .dt-cell-num { text-align: right; }
  .dt-cell-pos { color: #35C4A1; font-weight: 700; }
  .dt-cell-neg { color: #FF5C5C; font-weight: 700; }

  .dt-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
  }
  .dt-tag-win  { background: rgba(53,196,161,.12); color: #35C4A1; }
  .dt-tag-loss { background: rgba(255,92,92,.12);  color: #FF5C5C; }
  .dt-tag-be   { background: rgba(108,118,134,.15); color: #8892A3; }

  .dt-empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--dt-ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
  }

  .dt-count {
    margin-left: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--dt-ink-3);
    letter-spacing: .02em;
  }
`;

/* ------------------------------------------------------------------ */
/*  Column visibility dropdown                                         */
/* ------------------------------------------------------------------ */
function ColumnPicker({ table }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  const onBlurRef = (el) => {
    if (!el) return;
    const handler = (e) => {
      if (!el.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    el._cleanup = () => document.removeEventListener('mousedown', handler);
  };

  // Cleanup on unmount
  const cleanupRef = useRef(null);
  if (!cleanupRef.current) {
    cleanupRef.current = () => {
      if (ref.current?._cleanup) ref.current._cleanup();
    };
  }

  return (
    <div style={{ position: 'relative' }} ref={ref} onBlur={() => {}}>
      <button
        type="button"
        className="dt-cols-btn"
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal size={12} />
        Columns
        <ChevronDown size={11} />
      </button>

      {open && (
        <div className="dt-cols-panel" ref={onBlurRef}>
          {table
            .getAllLeafColumns()
            .filter((col) => col.getCanHide())
            .map((col) => (
              <label key={col.id} className="dt-cols-row">
                <input
                  type="checkbox"
                  checked={col.getIsVisible()}
                  onChange={col.getToggleVisibilityHandler()}
                />
                <span>{col.columnDef.meta?.label || col.id}</span>
              </label>
            ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */
export default function DataTable({
  data,
  columns,
  getRowId = (row, idx) => row.id ?? idx,
  estimateRowHeight = 36,
  overscan = 10,
  searchPlaceholder = 'Search…',
  searchableColumnIds,
  initialSort,
  maxHeight = 560,
  emptyMessage = 'No data',
  stickyFirstColumn = true,
  showToolbar = true,
}) {
  // Deferred search — smooth typing on large datasets
  const [searchInput, setSearchInput] = useState('');
  const search = useDeferredValue(searchInput);

  const [sorting, setSorting] = useState(initialSort || []);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnSizing, setColumnSizing] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, columnSizing, globalFilter: search },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onGlobalFilterChange: () => {},
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _colId, filterValue) => {
      if (!filterValue) return true;
      const q = String(filterValue).toLowerCase();
      const colsToSearch = searchableColumnIds
        ? searchableColumnIds
        : table.getAllLeafColumns().map((c) => c.id);
      return colsToSearch.some((id) => {
        const v = row.getValue(id);
        return v != null && String(v).toLowerCase().includes(q);
      });
    },
    getRowId,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    defaultColumn: { size: 120, minSize: 60, maxSize: 600 },
  });

  const { rows } = table.getRowModel();

  // Virtualizer
  const scrollRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
  });

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom =
    items.length > 0 ? totalSize - items[items.length - 1].end : 0;

  // Visible leaf columns for rendering
  const visibleCols = table.getVisibleLeafColumns();

  // Width computation: sum of visible column widths, minimum 100%
  const totalWidth = useMemo(
    () => visibleCols.reduce((sum, c) => sum + c.getSize(), 0),
    [visibleCols, columnSizing]
  );

  const colsSignature = visibleCols.map((c) => c.id).join('|');

  return (
    <div className="dt-root">
      <style>{CSS}</style>

      {showToolbar && (
        <div className="dt-toolbar">
          <div className="dt-search">
            <Search size={14} className="dt-search-icon" />
            <input
              type="text"
              className="dt-search-input"
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <ColumnPicker table={table} />

          <span className="dt-count">
            {rows.length} {rows.length === 1 ? 'row' : 'rows'}
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        className="dt-scroll"
        style={{ maxHeight, overflowY: 'auto' }}
      >
        <table
          className="dt-table"
          style={{
            width: Math.max(totalWidth, 100) === 100 ? '100%' : totalWidth,
            minWidth: '100%',
          }}
          key={colsSignature}
        >
          <colgroup>
            {visibleCols.map((col) => (
              <col key={col.id} style={{ width: col.getSize() }} />
            ))}
          </colgroup>

          <thead className="dt-thead">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header, idx) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  const isSticky = stickyFirstColumn && idx === 0;

                  return (
                    <th
                      key={header.id}
                      className={`dt-th ${canSort ? 'sortable' : ''} ${
                        isSticky ? 'sticky-left' : ''
                      }`}
                      style={{
                        width: header.getSize(),
                        position: isSticky ? 'sticky' : undefined,
                        left: isSticky ? 0 : undefined,
                        zIndex: isSticky ? 6 : 5,
                        background: '#151A26',
                      }}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      <span className="dt-th-inner">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {canSort &&
                          (sortDir === 'asc' ? (
                            <ArrowUp size={10} />
                          ) : sortDir === 'desc' ? (
                            <ArrowDown size={10} />
                          ) : (
                            <ArrowUpDown
                              size={10}
                              style={{ opacity: 0.3 }}
                            />
                          ))}
                      </span>

                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`dt-resizer ${
                            header.column.getIsResizing() ? 'is-resizing' : ''
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleCols.length}
                  className="dt-empty"
                  style={{ position: 'sticky', left: 0 }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: paddingTop }} colSpan={visibleCols.length} />
                  </tr>
                )}

                {items.map((vRow) => {
                  const row = rows[vRow.index];
                  return (
                    <tr key={row.id} className="dt-row" style={{ height: estimateRowHeight }}>
                      {row.getVisibleCells().map((cell, idx) => {
                        const isSticky = stickyFirstColumn && idx === 0;
                        return (
                          <td
                            key={cell.id}
                            className={`dt-td ${isSticky ? 'sticky-left' : ''}`}
                            style={{
                              width: cell.column.getSize(),
                            }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: paddingBottom }} colSpan={visibleCols.length} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}