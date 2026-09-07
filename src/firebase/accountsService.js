// src/firebase/accountsService.js
import { db } from './config';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

const ACCOUNTS_COLLECTION = 'accounts';

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
  // Sort client-side (newest first)
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