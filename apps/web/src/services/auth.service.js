// apps/web/src/services/auth.service.js
import { apiJson, setAccessToken } from './api';

// Normalize our API's user shape into a Firebase-compatible shape
// so existing consumers (Sidebar, AccountModal, AppLayout, App.jsx)
// don't need to change.
function normalizeUser(u) {
  if (!u) return null;
  const displayName =
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
    u.email ||
    'User';
  return {
    id: u.id,
    uid: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    displayName,
    emailVerified: !!u.emailVerified,
    photoUrl: u.photoUrl ?? null,
    photoURL: u.photoUrl ?? null,
    providerData: [],
  };
}

export async function signup({ email, password, firstName, lastName }) {
  const data = await apiJson('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
  setAccessToken(data.accessToken);
  return { user: normalizeUser(data.user) };
}

export async function login({ email, password }) {
  const data = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(data.accessToken);
  return { user: normalizeUser(data.user) };
}

export async function refresh() {
  const data = await apiJson('/api/auth/refresh', { method: 'POST' });
  setAccessToken(data.accessToken);
  return { user: normalizeUser(data.user) };
}

export async function logout() {
  try {
    await apiJson('/api/auth/logout', { method: 'POST' });
  } finally {
    setAccessToken(null);
  }
}

export async function fetchMe() {
  const data = await apiJson('/api/auth/me');
  return normalizeUser(data.user);
}

export async function verifyEmail(token) {
  return apiJson('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function resendVerification() {
  return apiJson('/api/auth/resend-verification', { method: 'POST' });
}

export { normalizeUser };