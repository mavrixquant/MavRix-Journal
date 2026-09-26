// apps/web/src/services/user.service.js
import { apiJson } from './api';

export async function getLayouts() {
  return apiJson('/api/users/layouts');
}

export async function createLayout(layout) {
  const data = await apiJson('/api/users/layouts', {
    method: 'POST',
    body: JSON.stringify(layout),
  });
  return data.layout;
}

export async function updateLayout(layoutId, patch) {
  const data = await apiJson(`/api/users/layouts/${layoutId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.layout;
}

export async function activateLayout(layoutId) {
  return apiJson(`/api/users/layouts/${layoutId}/activate`, {
    method: 'POST',
  });
}

export async function deleteLayout(layoutId) {
  return apiJson(`/api/users/layouts/${layoutId}`, { method: 'DELETE' });
}

// Firebase-compatible subscribe — fetches once. There is no server push.
export function subscribeToUserLayouts(_userId, callback) {
  let cancelled = false;

  (async () => {
    try {
      const data = await getLayouts();
      if (!cancelled) callback(data);
    } catch (err) {
      console.error('[layouts] fetch error:', err);
      if (!cancelled) callback(null);
    }
  })();

  return () => { cancelled = true; };
}

// Matches the old Firebase signature: saveUserLayouts(userId, layouts, activeId).
// Diffs against current server state and issues the minimal set of calls.
export async function saveUserLayouts(_userId, desiredLayouts, desiredActiveId) {
  const current = await getLayouts();
  const currentById = new Map(current.layouts.map((l) => [l.id, l]));
  const desiredById = new Map(desiredLayouts.map((l) => [l.id, l]));

  for (const id of currentById.keys()) {
    if (!desiredById.has(id)) {
      await deleteLayout(id);
    }
  }

  for (const layout of desiredLayouts) {
    const existing = currentById.get(layout.id);
    if (!existing) {
      await createLayout({
        id: layout.id,
        name: layout.name,
        layout: layout.layout,
      });
    } else {
      const layoutChanged =
        JSON.stringify(existing.layout) !== JSON.stringify(layout.layout);
      const nameChanged = existing.name !== layout.name;
      if (layoutChanged || nameChanged) {
        await updateLayout(layout.id, {
          name: layout.name,
          layout: layout.layout,
        });
      }
    }
  }

  if (desiredActiveId && current.activeId !== desiredActiveId) {
    await activateLayout(desiredActiveId);
  }
}