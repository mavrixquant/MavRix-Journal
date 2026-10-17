// apps/web/src/shared/ui/data-table.jsx
//
// Virtualized, sortable, resizable, hideable, and REORDERABLE data table.
//
// Column reordering is exposed via the "Columns" popover: each column row
// has a drag handle on its left. Dragging a row up/down reorders the visible
// columns with a smooth FLIP animation.
//
// The panel is rendered through <Portal> (position: fixed) so it can escape
// the `overflow: hidden` of any ancestor card and never gets clipped.
//
// New prop: `emptyState` — a ReactNode that renders inside <tbody> when
// `data` is empty. When provided, it replaces the plain-text `emptyMessage`.

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  useDeferredValue,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  GripVertical,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

import Portal from '@/shared/components/Portal';

/* ------------------------------------------------------------------ */
/*  Styles — inline, no Tailwind required                              */
/* ------------------------------------------------------------------ */
const CSS = `
  .dt-root {
    --dt-accent: var(--accent);
    --dt-accent-2: var(--accent-2);
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
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }
  .dt-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--dt-ink-3);
    pointer-events: none;
  }

  .dt-cols-wrap {
    position: relative;
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
    border-color: color-mix(in srgb, var(--accent) 28%, transparent);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }
  .dt-cols-btn[data-open="true"] {
    color: var(--dt-accent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }

  /* Panel is portaled to document.body — position comes from inline
     style. Local CSS vars are redeclared here so nothing breaks once
     the element leaves the .dt-root subtree. */
  .dt-cols-panel {
    --dt-accent: var(--accent);
    --dt-accent-2: var(--accent-2);
    --dt-line: rgba(255,255,255,.085);
    --dt-line-soft: rgba(255,255,255,.05);
    --dt-ink-1: #E7E9EE;
    --dt-ink-2: #8892A3;
    --dt-ink-3: #545E6E;
    --dt-panel: #11151F;

    z-index: 9999;
    min-width: 240px;
    max-height: 380px;
    overflow-y: auto;
    background: #11151F;
    border: 1px solid #212836;
    border-radius: 10px;
    box-shadow: 0 16px 40px -12px rgba(0,0,0,.7);
    padding: 6px;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    color: var(--dt-ink-1);
    animation: dtPanelIn 140ms cubic-bezier(.2,.8,.25,1);
  }
  @keyframes dtPanelIn {
    from { opacity: 0; transform: translateY(-4px) scale(.985); }
    to   { opacity: 1; transform: none; }
  }

  .dt-cols-header {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--dt-ink-3);
    padding: 8px 10px 6px;
    border-bottom: 1px solid var(--dt-line-soft);
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .dt-cols-hint {
    font-size: 9px;
    color: var(--dt-ink-3);
    font-weight: 500;
    letter-spacing: .04em;
    text-transform: none;
    opacity: .75;
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
    user-select: none;
    transition: background-color .12s ease, opacity .12s ease;
    will-change: transform;
    backface-visibility: hidden;
  }
  .dt-cols-row:hover {
    background: rgba(255,255,255,.04);
    color: var(--dt-ink-1);
  }
  .dt-cols-row.is-dragging {
    opacity: .35;
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent);
  }
  .dt-cols-row.is-locked {
    cursor: default;
    opacity: .55;
  }
  .dt-cols-row.is-locked:hover {
    background: transparent;
    color: var(--dt-ink-2);
  }

  .dt-cols-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: var(--dt-ink-3);
    cursor: grab;
    transition: color .15s;
  }
  .dt-cols-handle:hover { color: var(--dt-accent); }
  .dt-cols-handle:active { cursor: grabbing; }
  .dt-cols-row.is-locked .dt-cols-handle {
    cursor: not-allowed;
    opacity: .35;
  }

  .dt-cols-row input[type="checkbox"] {
    accent-color: var(--dt-accent);
    cursor: pointer;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
  .dt-cols-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  .dt-th.sortable { cursor: pointer; }
  .dt-th.sortable:hover { color: var(--dt-accent); }
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

  .dt-row { transition: background-color .12s ease; }
  .dt-row:hover { background: rgba(255,255,255,.025); }
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
  .dt-row:hover .dt-td.sticky-left { background: #10151D; }

  .dt-th.sticky-right { box-shadow: -10px 0 14px -10px rgba(0,0,0,.7); }
  .dt-td.sticky-right {
    position: sticky;
    right: 0;
    background: #0D1117;
    z-index: 3;
    overflow: visible;
    box-shadow: -10px 0 14px -10px rgba(0,0,0,.7);
  }
  .dt-row:hover .dt-td.sticky-right { background: #10151D; }

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
  .dt-empty-cell {
    padding: 0 !important;
    background: transparent;
    border-bottom: none;
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
/*  Column picker with drag-to-reorder                                 */
/* ------------------------------------------------------------------ */

const FLIP_MS = 200;
const FLIP_EASE = 'cubic-bezier(0.2, 0.8, 0.25, 1)';

function ColumnPicker({ table, columnOrder, onReorder }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);

  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const itemsRef = useRef(new Map());       // id -> DOM node
  const prevOrderRef = useRef([]);          // order before the last reorder
  const itemHeightRef = useRef(30);

  const allLeafColumns = table.getAllLeafColumns();

  const reorderableAll = useMemo(
    () => allLeafColumns.filter((c) => c.getCanHide()),
    [allLeafColumns]
  );
  const lockedAll = useMemo(
    () => allLeafColumns.filter((c) => !c.getCanHide()),
    [allLeafColumns]
  );

  // Effective display order for the reorderable rows.
  const displayOrder = useMemo(() => {
    if (previewOrder) return previewOrder;
    const byId = new Map(reorderableAll.map((c) => [c.id, c]));
    const ids = [];
    for (const id of columnOrder) {
      if (byId.has(id)) {
        ids.push(id);
        byId.delete(id);
      }
    }
    for (const c of byId.values()) ids.push(c.id);
    return ids;
  }, [previewOrder, columnOrder, reorderableAll]);

  const reorderable = useMemo(() => {
    const byId = new Map(reorderableAll.map((c) => [c.id, c]));
    return displayOrder.map((id) => byId.get(id)).filter(Boolean);
  }, [displayOrder, reorderableAll]);

  /* ---------------- Panel open / position ---------------- */

  const recalcPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    recalcPosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;

    const handleDown = (e) => {
      if (buttonRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };

    // Only close when the *page* scrolls (which would move the anchor
    // button out from under our fixed-position panel). Scrolls that
    // originate INSIDE the panel — e.g. scrolling the column list or
    // dragging its scrollbar — must be ignored so the user can browse
    // a long column list without the panel vanishing on them.
    const handleScroll = (e) => {
      const target = e.target;
      if (panelRef.current && target && panelRef.current.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleResize = () => setOpen(false);

    document.addEventListener('mousedown', handleDown, true);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleDown, true);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  /* ---------------- Drag handlers ---------------- */

  const measureItemHeight = () => {
    const nodes = reorderable
      .map((c) => itemsRef.current.get(c.id))
      .filter(Boolean);
    if (nodes.length >= 2) {
      const delta = nodes[1].offsetTop - nodes[0].offsetTop;
      if (delta > 0) return delta;
    }
    return nodes[0]?.offsetHeight || 30;
  };

  const handleDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', id);
    } catch {
      /* Firefox sometimes rejects — no-op */
    }
    itemHeightRef.current = measureItemHeight();
    prevOrderRef.current = displayOrder;
  };

  const handleDragOver = (e, overId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggingId || draggingId === overId) return;

    const fromIdx = displayOrder.indexOf(draggingId);
    const toIdx = displayOrder.indexOf(overId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

    prevOrderRef.current = displayOrder;

    const next = [...displayOrder];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, draggingId);
    setPreviewOrder(next);
  };

  const handleDrop = (e) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    if (previewOrder) onReorder(previewOrder);
    setDraggingId(null);
    setPreviewOrder(null);
    prevOrderRef.current = [];
  };

  /* ---------------- FLIP animation for reordering ---------------- */

  useLayoutEffect(() => {
    if (!previewOrder || !draggingId) return;

    const prev = prevOrderRef.current;
    const itemH = itemHeightRef.current;

    itemsRef.current.forEach((el, id) => {
      if (!el || id === draggingId) return;

      const prevIdx = prev.indexOf(id);
      const currIdx = previewOrder.indexOf(id);
      if (prevIdx === -1 || currIdx === -1 || prevIdx === currIdx) return;

      const deltaY = (prevIdx - currIdx) * itemH;
      if (Math.abs(deltaY) < 1) return;

      el.style.transition = 'none';
      el.style.transform = `translateY(${deltaY}px)`;

      requestAnimationFrame(() => {
        el.style.transition = `transform ${FLIP_MS}ms ${FLIP_EASE}`;
        el.style.transform = '';
      });
    });
  }, [previewOrder, draggingId]);

  /* ---------------- Render ---------------- */

  return (
    <div className="dt-cols-wrap">
      <button
        ref={buttonRef}
        type="button"
        className="dt-cols-btn"
        data-open={open ? 'true' : 'false'}
        onClick={toggleOpen}
      >
        <SlidersHorizontal size={12} />
        Columns
        <ChevronDown size={11} />
      </button>

      {open && panelStyle && (
        <Portal>
          <div
            ref={panelRef}
            className="dt-cols-panel"
            style={panelStyle}
          >
            <div className="dt-cols-header">
              <span>Reorder & visibility</span>
              <span className="dt-cols-hint">drag ⋮⋮</span>
            </div>

            {reorderable.map((col) => {
              const id = col.id;
              const label = col.columnDef.meta?.label || id;
              const isDragging = draggingId === id;

              return (
                <div
                  key={id}
                  ref={(el) => {
                    if (el) itemsRef.current.set(id, el);
                    else itemsRef.current.delete(id);
                  }}
                  className={`dt-cols-row${isDragging ? ' is-dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, id)}
                  onDragOver={(e) => handleDragOver(e, id)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                >
                  <span className="dt-cols-handle" aria-hidden>
                    <GripVertical size={13} />
                  </span>
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="dt-cols-label">{label}</span>
                </div>
              );
            })}

            {lockedAll.length > 0 && (
              <>
                <div className="dt-cols-header" style={{ marginTop: 6 }}>
                  <span>Fixed</span>
                </div>
                {lockedAll.map((col) => {
                  const id = col.id;
                  const label = col.columnDef.meta?.label || id;
                  return (
                    <div key={id} className="dt-cols-row is-locked">
                      <span className="dt-cols-handle" aria-hidden>
                        <GripVertical size={13} />
                      </span>
                      <input type="checkbox" checked disabled />
                      <span className="dt-cols-label">{label}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </Portal>
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
  emptyState = null,
  stickyFirstColumn = true,
  stickyLastColumn = false,
  showToolbar = true,
}) {
  const [searchInput, setSearchInput] = useState('');
  const search = useDeferredValue(searchInput);

  const [sorting, setSorting] = useState(initialSort || []);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnSizing, setColumnSizing] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnSizing,
      columnOrder,
      globalFilter: search,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
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

  const visibleCols = table.getVisibleLeafColumns();
  const lastColIndex = visibleCols.length - 1;

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

          <ColumnPicker
            table={table}
            columnOrder={columnOrder}
            onReorder={setColumnOrder}
          />

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
                  const isStickyLeft = stickyFirstColumn && idx === 0;
                  const isStickyRight =
                    stickyLastColumn && idx === hg.headers.length - 1;

                  const cls = [
                    'dt-th',
                    canSort ? 'sortable' : '',
                    isStickyLeft ? 'sticky-left' : '',
                    isStickyRight ? 'sticky-right' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  const inlineSticky = isStickyRight
                    ? {
                        position: 'sticky',
                        right: 0,
                        zIndex: 7,
                        background: '#151A26',
                      }
                    : isStickyLeft
                      ? {
                          position: 'sticky',
                          left: 0,
                          zIndex: 6,
                          background: '#151A26',
                        }
                      : {};

                  return (
                    <th
                      key={header.id}
                      className={cls}
                      style={{ width: header.getSize(), ...inlineSticky }}
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
                            <ArrowUpDown size={10} style={{ opacity: 0.3 }} />
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
                  className="dt-empty-cell"
                  style={{ position: 'sticky', left: 0 }}
                >
                  {emptyState || <div className="dt-empty">{emptyMessage}</div>}
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td
                      style={{ height: paddingTop }}
                      colSpan={visibleCols.length}
                    />
                  </tr>
                )}

                {items.map((vRow) => {
                  const row = rows[vRow.index];
                  return (
                    <tr
                      key={row.id}
                      className="dt-row"
                      style={{ height: estimateRowHeight }}
                    >
                      {row.getVisibleCells().map((cell, idx) => {
                        const isStickyLeft =
                          stickyFirstColumn && idx === 0;
                        const isStickyRight =
                          stickyLastColumn && idx === lastColIndex;

                        const cls = [
                          'dt-td',
                          isStickyLeft ? 'sticky-left' : '',
                          isStickyRight ? 'sticky-right' : '',
                        ]
                          .filter(Boolean)
                          .join(' ');

                        return (
                          <td
                            key={cell.id}
                            className={cls}
                            style={{ width: cell.column.getSize() }}
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
                    <td
                      style={{ height: paddingBottom }}
                      colSpan={visibleCols.length}
                    />
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