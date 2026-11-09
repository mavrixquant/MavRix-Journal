import { useCallback, useRef, useState } from 'react';
import {
  GRID_COLS,
  MAX_LAYOUTS,
  DEFAULT_LAYOUT,
  buildFreshLayout,
  makeLayoutId,
  makeLayoutName,
  upscaleToLg,
} from '@/features/dashboard/layout/dashboardLayout';
import { saveUserLayouts } from '@/features/dashboard/api/layouts';

export const MAX_NAME_LEN = 24;
const DEFAULT_NAME_PATTERN = /^Layout \d+$/;

/**
 * Edit-mode state machine shared by the Journal and Backtester dashboards.
 * Call editor.bind({ layouts, activeId, setLayouts, setActiveId }) on every render
 * so the hook always edits the latest committed layouts.
 */
export function useDashboardEditor({ userId }) {
  const [editMode, setEditMode] = useState(false);
  const [draftLayouts, setDraftLayouts] = useState(null);
  const [draftActiveId, setDraftActiveId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const source = useRef({ layouts: [], activeId: null, setLayouts: () => {}, setActiveId: () => {} });
  const editModeRef = useRef(false);
  editModeRef.current = editMode;

  const bind = useCallback((next) => {
    source.current = next;
  }, []);

  const resetRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const enterEdit = () => {
    const { layouts, activeId } = source.current;
    if (!layouts.length) return;
    const clone = layouts.map((l) => ({ ...l, layout: l.layout.map((it) => ({ ...it })) }));
    setDraftLayouts(clone);
    setDraftActiveId(activeId || clone[0].id);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setDraftLayouts(null);
    setDraftActiveId(null);
    resetRename();
    setEditMode(false);
  };

  const saveEdit = () => {
    if (!draftLayouts || !draftActiveId) return;
    const { setLayouts, setActiveId } = source.current;
    setLayouts(draftLayouts);
    setActiveId(draftActiveId);
    if (userId) {
      saveUserLayouts(userId, draftLayouts, draftActiveId).catch((err) =>
        console.error('[layouts] save failed:', err)
      );
    }
    cancelEdit();
  };

  const commitRename = () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim().slice(0, MAX_NAME_LEN);
    if (trimmed) {
      setDraftLayouts((prev) => (prev || []).map((l) => (l.id === renamingId ? { ...l, name: trimmed } : l)));
    }
    resetRename();
  };

  const switchDraftLayout = (id) => {
    if (renamingId) commitRename();
    if (id !== draftActiveId) setDraftActiveId(id);
  };

  const addDraftLayout = () => {
    if (!draftLayouts || draftLayouts.length >= MAX_LAYOUTS) return;
    const created = { id: makeLayoutId(), name: makeLayoutName(draftLayouts.length), layout: buildFreshLayout() };
    setDraftLayouts([...draftLayouts, created]);
    setDraftActiveId(created.id);
  };

  const deleteDraftLayout = (id) => {
    if (!draftLayouts || draftLayouts.length <= 1) return;
    const remaining = draftLayouts.filter((l) => l.id !== id);
    const renumbered = remaining.map((l, idx) =>
      DEFAULT_NAME_PATTERN.test(l.name) ? { ...l, name: makeLayoutName(idx) } : l
    );
    setDraftLayouts(renumbered);
    if (draftActiveId === id) setDraftActiveId(renumbered[0].id);
  };

  const startRename = (id, name) => {
    setRenamingId(id);
    setRenameValue(name);
  };

  // Merge x/y/w/h from the grid (in `sourceCols` space) back into the 48-col draft.
  const applyGeometry = (currentLayout, sourceCols) => {
    if (!editModeRef.current || !draftActiveId) return;
    const upscaled = upscaleToLg(currentLayout, sourceCols || GRID_COLS);
    const byId = new Map(upscaled.map((it) => [it.i, it]));

    setDraftLayouts((prev) =>
      (prev || []).map((l) => {
        if (l.id !== draftActiveId) return l;
        let changed = false;
        const next = l.layout.map((item) => {
          const u = byId.get(item.i);
          if (!u || (item.x === u.x && item.y === u.y && item.w === u.w && item.h === u.h)) return item;
          changed = true;
          return { ...item, x: u.x, y: u.y, w: u.w, h: u.h };
        });
        return changed ? { ...l, layout: next } : l;
      })
    );
  };

  const toggleVisible = (id) => {
    setDraftLayouts((prev) =>
      (prev || []).map((l) =>
        l.id !== draftActiveId
          ? l
          : { ...l, layout: l.layout.map((it) => (it.i === id ? { ...it, visible: !it.visible } : it)) }
      )
    );
  };

  const handleReset = () => {
    setDraftLayouts((prev) =>
      (prev || []).map((l) =>
        l.id !== draftActiveId ? l : { ...l, layout: DEFAULT_LAYOUT.map((it) => ({ ...it })) }
      )
    );
  };

  return {
    bind,
    editMode,
    editModeRef,
    draftLayouts,
    draftActiveId,
    renamingId,
    renameValue,
    setRenameValue,
    enterEdit,
    cancelEdit,
    saveEdit,
    switchDraftLayout,
    addDraftLayout,
    deleteDraftLayout,
    startRename,
    commitRename,
    cancelRename: resetRename,
    applyGeometry,
    toggleVisible,
    handleReset,
  };
}
