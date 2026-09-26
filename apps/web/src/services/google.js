// apps/web/src/services/google.js
// Thin wrapper around Google Identity Services (GIS).
// Loads window.google (script tag in index.html), initializes an
// OAuth2 token client, and exposes a Promise-based signIn() that
// returns a Google access token.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'openid email profile';

let tokenClient = null;
let pendingResolve = null;
let pendingReject = null;

function waitForGoogle(maxWaitMs = 8000) {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve(window.google.accounts.oauth2);
    const start = Date.now();
    const tick = () => {
      if (window.google?.accounts?.oauth2) return resolve(window.google.accounts.oauth2);
      if (Date.now() - start > maxWaitMs) {
        return reject(new Error('Google SDK did not load. Check your network or the script tag in index.html.'));
      }
      setTimeout(tick, 100);
    };
    tick();
  });
}

async function ensureClient() {
  if (tokenClient) return tokenClient;
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');

  const oauth2 = await waitForGoogle();
  tokenClient = oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (!pendingResolve) return;
      const resolve = pendingResolve;
      const reject = pendingReject;
      pendingResolve = null;
      pendingReject = null;

      if (response?.access_token) resolve(response.access_token);
      else reject(new Error(response?.error || 'Google sign-in was cancelled'));
    },
    error_callback: (err) => {
      if (!pendingReject) return;
      const reject = pendingReject;
      pendingResolve = null;
      pendingReject = null;
      reject(new Error(err?.message || 'Google popup failed'));
    },
  });
  return tokenClient;
}

export async function signIn() {
  const client = await ensureClient();
  return new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    try {
      client.requestAccessToken();
    } catch (e) {
      pendingResolve = null;
      pendingReject = null;
      reject(e);
    }
  });
}