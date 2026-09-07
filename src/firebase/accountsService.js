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
  orderBy,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, ACCOUNTS_COLLECTION), account);
  return { id: docRef.id, ...account };
}

export async function getAccounts(userId) {
  const q = query(
    collection(db, ACCOUNTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function subscribeToAccounts(userId, callback) {
  const q = query(
    collection(db, ACCOUNTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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