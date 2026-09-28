// apps/web/src/shared/api/client.js
// Central fetch wrapper for the Mavrix API.
// - Prefixes VITE_API_URL
// - Injects Authorization: Bearer <accessToken> when set
// - Sends cookies (credentials: 'include') so /api/auth/refresh works
// - On 401, tries one silent refresh and retries the original request once

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let accessToken = null;
let unauthorizedHandler = null;
let refreshInFlight = null;

export function setAccessToken(token) {
  accessToken = token ?? null;
}

export function getAccessToken() {
  return accessToken;
}

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

async function doRefresh() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      accessToken = data.accessToken ?? null;
      return data;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function apiFetch(path, options = {}, allowRetry = true) {
  const headers = { ...(options.headers || {}) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const isRefreshPath = path === '/api/auth/refresh';
  if (res.status === 401 && allowRetry && !isRefreshPath) {
    const refreshed = await doRefresh();
    if (refreshed) return apiFetch(path, options, false);
    if (unauthorizedHandler) unauthorizedHandler();
  }

  return res;
}

export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  const text = await res.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
  }
  if (!res.ok) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function ensureFreshAccessToken() {
  if (accessToken) return accessToken;
  const data = await doRefresh();
  return data?.accessToken ?? null;
}
