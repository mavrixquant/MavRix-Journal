// src/firebase/tradesService.js
import { db } from './config';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

const TRADES_COLLECTION = 'trades';

// Generate a unique trade ID from trade data
export function generateTradeId(trade) {
  const { date, entryTime, exitTime, direction, symbol } = trade;
  // Ensure all fields are present and sanitized
  const parts = [date, entryTime, exitTime, direction || '', symbol || '']
    .map(String)
    .map(s => s.trim().replace(/[^a-zA-Z0-9]/g, '_'));
  return parts.join('_');
}

export async function createTrade(accountId, tradeData) {
  const tradeId = generateTradeId(tradeData);
  const trade = {
    accountId,
    tradeId,
    ...tradeData,
    mae: Number(tradeData.mae) || 0,
    mfe: Number(tradeData.mfe) || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  Object.keys(trade).forEach((key) => {
    if (trade[key] === undefined) delete trade[key];
  });
  const docRef = await addDoc(collection(db, TRADES_COLLECTION), trade);
  return { id: docRef.id, ...trade };
}

export async function createTrades(accountId, tradesArray) {
  const batch = tradesArray.map((tradeData) => {
    const tradeId = generateTradeId(tradeData);
    const trade = {
      accountId,
      tradeId,
      ...tradeData,
      mae: Number(tradeData.mae) || 0,
      mfe: Number(tradeData.mfe) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    Object.keys(trade).forEach((key) => {
      if (trade[key] === undefined) delete trade[key];
    });
    return addDoc(collection(db, TRADES_COLLECTION), trade);
  });
  await Promise.all(batch);
}

export function subscribeToTrades(accountId, callback) {
  const q = query(
    collection(db, TRADES_COLLECTION),
    where('accountId', '==', accountId)
  );
  return onSnapshot(q, (snapshot) => {
    let trades = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    trades.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return String(dateB).localeCompare(String(dateA));
    });
    callback(trades);
  });
}

export async function getTrades(accountId) {
  const q = query(
    collection(db, TRADES_COLLECTION),
    where('accountId', '==', accountId)
  );
  const snapshot = await getDocs(q);
  let trades = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  trades.sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return String(dateB).localeCompare(String(dateA));
  });
  return trades;
}

export async function updateTrade(tradeId, tradeData) {
  const docRef = doc(db, TRADES_COLLECTION, tradeId);
  // If date/entryTime/exitTime/direction change, update tradeId
  const newTradeId = generateTradeId(tradeData);
  const updatePayload = {
    ...tradeData,
    tradeId: newTradeId,
    updatedAt: new Date().toISOString(),
  };
  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) delete updatePayload[key];
  });
  await updateDoc(docRef, updatePayload);
}

export async function deleteTrade(tradeId) {
  const docRef = doc(db, TRADES_COLLECTION, tradeId);
  await deleteDoc(docRef);
}

export async function deleteTradesByAccountId(accountId) {
  const trades = await getTrades(accountId);
  const deletes = trades.map(trade => deleteDoc(doc(db, TRADES_COLLECTION, trade.id)));
  await Promise.all(deletes);
}

export async function renameCustomColumn(accountId, oldName, newName) {
  // Get all trades for the account
  const trades = await getTrades(accountId);
  const updates = trades
    .filter(trade => trade[oldName] !== undefined)
    .map(trade => {
      const tradeRef = doc(db, TRADES_COLLECTION, trade.id);
      return updateDoc(tradeRef, {
        [newName]: trade[oldName],
        [oldName]: deleteField(),
      });
    });
  await Promise.all(updates);
}

export async function deleteCustomColumn(accountId, columnName) {
  const trades = await getTrades(accountId);
  const updates = trades
    .filter(trade => trade[columnName] !== undefined)
    .map(trade => {
      const tradeRef = doc(db, TRADES_COLLECTION, trade.id);
      return updateDoc(tradeRef, {
        [columnName]: deleteField(),
      });
    });
  await Promise.all(updates);
}

export async function addCustomColumn(accountId, columnName) {
  const trades = await getTrades(accountId);
  const updates = trades.map(trade => {
    const tradeRef = doc(db, TRADES_COLLECTION, trade.id);
    return updateDoc(tradeRef, { [columnName]: '' });
  });
  await Promise.all(updates);
}