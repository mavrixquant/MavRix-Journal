// src/firebase/accountsService.js
import { db } from './config';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

const ACCOUNTS_COLLECTION = 'accounts';
const USERS_COLLECTION = 'users';

// ============================================================
// Accounts
// ============================================================

export async function createAccount(userId, accountData) {
  const account = {
    userId,
    name: accountData.name,
    balance: accountData.balance,
    currency: accountData.currency,
    type: accountData.type || 'Backtest',
    riskType: accountData.riskType || 'fixed',
    riskValue: accountData.riskValue !== undefined ? accountData.riskValue : null,
    riskUnit: accountData.riskUnit || 'percent',
    slValue: accountData.slValue !== undefined ? accountData.slValue : null,
    slUnit: accountData.slUnit || 'ticks',
    commissionMode: accountData.commissionMode || 'none',
    commissionValue: accountData.commissionValue !== undefined ? accountData.commissionValue : null,
    columnConfigs: accountData.columnConfigs || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, ACCOUNTS_COLLECTION), account);
  return { id: docRef.id, ...account };
}

export async function getAccounts(userId) {
  const q = query(
    collection(db, ACCOUNTS_COLLECTION),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  accounts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return accounts;
}

export function subscribeToAccounts(userId, callback) {
  const q = query(
    collection(db, ACCOUNTS_COLLECTION),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snapshot) => {
    let accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    accounts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(accounts);
  });
}

export async function updateAccount(accountId, accountData) {
  const docRef = doc(db, ACCOUNTS_COLLECTION, accountId);
  await updateDoc(docRef, {
    ...accountData,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteAccount(accountId) {
  const docRef = doc(db, ACCOUNTS_COLLECTION, accountId);
  await deleteDoc(docRef);
}

export async function updateAccountColumnConfigs(accountId, columnConfigs) {
  const docRef = doc(db, ACCOUNTS_COLLECTION, accountId);
  await updateDoc(docRef, {
    columnConfigs: columnConfigs || {},
    updatedAt: new Date().toISOString(),
  });
}

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