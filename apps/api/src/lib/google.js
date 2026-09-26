// apps/api/src/lib/google.js
// Verifies a Google access token issued to our frontend by Google
// Identity Services, and returns the caller's profile info.
//
// Two calls to Google:
//   1. tokeninfo  → confirms `aud` matches OUR client_id (prevents
//      replay of access tokens issued to a different app)
//   2. userinfo   → returns the profile (name, picture, email)
//
// No client secret is used. The access token came straight from
// Google's popup, and Google's own endpoints confirm its validity.

import { HttpError } from '../middleware/error.js';

const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export async function verifyGoogleAccessToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new HttpError(400, 'Missing Google access token');
  }

  const expectedAud = process.env.GOOGLE_CLIENT_ID;
  if (!expectedAud) {
    throw new HttpError(500, 'Server missing GOOGLE_CLIENT_ID configuration');
  }

  // 1. Verify audience
  const infoRes = await fetch(
    `${TOKENINFO_URL}?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!infoRes.ok) {
    throw new HttpError(401, 'Invalid Google access token');
  }
  const info = await infoRes.json();
  if (info.aud !== expectedAud) {
    throw new HttpError(401, 'Google token was not issued for this application');
  }

  // 2. Fetch profile
  const profileRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    throw new HttpError(401, 'Could not fetch Google profile');
  }
  const profile = await profileRes.json();

  const emailVerified = profile.email_verified === true || profile.email_verified === 'true';
  if (!emailVerified) {
    throw new HttpError(400, 'Google account email is not verified');
  }

  return {
    googleId: profile.sub,
    email: String(profile.email || '').toLowerCase(),
    firstName: profile.given_name || '',
    lastName: profile.family_name || '',
    photoUrl: profile.picture || null,
  };
}