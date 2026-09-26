// src/services/user.service.js
import { db } from './firebase/config';
import {
  doc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';

// ============================================================
// User Preferences — Dashboard Layouts (max 3)
// Stored at users/{uid}:
//   dashboardLayouts: [{ id, name, layout: [...] }, ...]
//   activeDashboardLayoutId: 'layout-xyz'
// Legacy single-array format (dashboardLayout) is auto-migrated on read.
// ============================================================

export function subscribeToUserLayouts(userId, callback) {
  if (!userId) {
    callback(null);
    return () => {};
  }
  const ref = doc(db, USERS_COLLECTION, userId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) { callback(null); return; }
      const data = snap.data();

      // New multi-layout format
      if (Array.isArray(data.dashboardLayouts) && data.dashboardLayouts.length > 0) {
        callback({
          layouts: data.dashboardLayouts,
          activeId: data.activeDashboardLayoutId || data.dashboardLayouts[0].id,
        });
        return;
      }

      // Legacy single-array format → migrate
      if (Array.isArray(data.dashboardLayout) && data.dashboardLayout.length > 0) {
        const migrated = [{
          id: 'layout-legacy',
          name: 'Layout 1',
          layout: data.dashboardLayout,
        }];
        callback({
          layouts: migrated,
          activeId: 'layout-legacy',
          migratedFromLegacy: true,
        });
        return;
      }

      callback(null);
    },
    (err) => {
      console.error('[userLayouts] subscription error:', err);
      callback(null);
    }
  );
}

export async function saveUserLayouts(userId, layouts, activeId) {
  if (!userId) return;
  const ref = doc(db, USERS_COLLECTION, userId);
  await setDoc(
    ref,
    {
      dashboardLayouts: Array.isArray(layouts) ? layouts : [],
      activeDashboardLayoutId: activeId || null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}