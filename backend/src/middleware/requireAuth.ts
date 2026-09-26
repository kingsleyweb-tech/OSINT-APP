import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * API protection: every /api request must carry a valid Firebase ID token (Authorization: Bearer …).
 * Tokens are verified locally against Google's published keys (no service-account secret needed):
 * RS256 signature, audience/issuer = this Firebase project, not expired, and not an anonymous (guest)
 * sign-in. Optionally, a Firebase App Check token is also required (APP_CHECK_ENFORCE=true).
 *
 * Environment:
 *   FIREBASE_PROJECT_ID      (default: osint-application-6405b)
 *   FIREBASE_PROJECT_NUMBER  (App Check only; default: 374764432466)
 *   AUTH_REQUIRED=false      turns the check off (local testing only)
 *   APP_CHECK_ENFORCE=true   also require X-Firebase-AppCheck
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'osint-application-6405b';
const PROJECT_NUMBER = process.env.FIREBASE_PROJECT_NUMBER || '374764432466';
const ID_TOKEN_JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const APP_CHECK_JWKS = 'https://firebaseappcheck.googleapis.com/v1/jwks';

export interface AuthedUser {
  uid: string;
  email?: string;
  provider?: string;
}

type Jwk = Record<string, unknown> & { kid: string };
const keyCache = new Map<string, { keys: Map<string, crypto.KeyObject>; expires: number }>();

async function publicKey(jwksUrl: string, kid: string): Promise<crypto.KeyObject | null> {
  let entry = keyCache.get(jwksUrl);
  if (!entry || entry.expires < Date.now() || !entry.keys.has(kid)) {
    const res = await fetch(jwksUrl);
    if (!res.ok) throw new Error(`Key download failed (${res.status})`);
    const body: any = await res.json();
    const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1]) || 3600;
    const keys = new Map<string, crypto.KeyObject>();
    (body.keys as Jwk[]).forEach(k => keys.set(k.kid, crypto.createPublicKey({ key: k as any, format: 'jwk' })));
    entry = { keys, expires: Date.now() + maxAge * 1000 };
    keyCache.set(jwksUrl, entry);
  }
  return entry.keys.get(kid) || null;
}

const b64json = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

/** Verifies an RS256 JWT's signature with the given key set and returns its payload, or null. */
async function verifyJwt(token: string, jwksUrl: string): Promise<Record<string, any> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  let header: any;
  let payload: any;
  try {
    header = b64json(parts[0]);
    payload = b64json(parts[1]);
  } catch {
    return null;
  }
  if (header.alg !== 'RS256' || !header.kid) return null;
  const key = await publicKey(jwksUrl, header.kid);
  if (!key) return null;
  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'));
  return ok ? payload : null;
}

export async function verifyIdToken(token: string): Promise<AuthedUser | null> {
  const p = await verifyJwt(token, ID_TOKEN_JWKS);
  if (!p) return null;
  const now = Math.floor(Date.now() / 1000);
  if (p.aud !== PROJECT_ID || p.iss !== `https://securetoken.google.com/${PROJECT_ID}`) return null;
  if (typeof p.exp !== 'number' || p.exp < now) return null;
  if (typeof p.iat !== 'number' || p.iat > now + 300) return null;
  if (typeof p.sub !== 'string' || !p.sub) return null;
  // Guest (anonymous) sign-in is no longer allowed.
  if (p.firebase?.sign_in_provider === 'anonymous') return null;
  return { uid: p.sub, email: p.email, provider: p.firebase?.sign_in_provider };
}

async function verifyAppCheck(token: string): Promise<boolean> {
  const p = await verifyJwt(token, APP_CHECK_JWKS);
  if (!p) return false;
  const aud: string[] = Array.isArray(p.aud) ? p.aud : [p.aud];
  return p.iss === `https://firebaseappcheck.googleapis.com/${PROJECT_NUMBER}` &&
    aud.includes(`projects/${PROJECT_NUMBER}`) && typeof p.exp === 'number' && p.exp > Date.now() / 1000;
}

// Per-user limit on the searches that cost SerpApi quota.
const WINDOW_MS = 10 * 60 * 1000;
const COSTLY_LIMIT = Number(process.env.SEARCHES_PER_10_MIN) || 30;
const COSTLY = /^\/(search|search\/stream|investigations\/rescan)$/;
const hits = new Map<string, number[]>();

function overLimit(uid: string): boolean {
  const now = Date.now();
  const recent = (hits.get(uid) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(uid, recent);
  return recent.length > COSTLY_LIMIT;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (process.env.AUTH_REQUIRED === 'false') return next();
  if (req.method === 'OPTIONS' || req.path === '/health') return next();

  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Please sign in to continue.', code: 'auth/required' });
    return;
  }
  try {
    const user = await verifyIdToken(token);
    if (!user) {
      res.status(401).json({ error: 'Your session has expired. Please sign in again.', code: 'auth/invalid-session' });
      return;
    }
    if (process.env.APP_CHECK_ENFORCE === 'true') {
      const appCheck = String(req.headers['x-firebase-appcheck'] || '');
      if (!appCheck || !(await verifyAppCheck(appCheck))) {
        res.status(401).json({ error: 'This request could not be verified. Refresh the page and try again.', code: 'auth/app-check' });
        return;
      }
    }
    if (req.method === 'POST' && COSTLY.test(req.path) && overLimit(user.uid)) {
      res.status(429).json({ error: 'Too many searches in a short time. Wait a few minutes and try again.', code: 'rate-limited' });
      return;
    }
    (req as any).user = user;
    next();
  } catch (e) {
    console.error('[requireAuth] verification unavailable:', (e as Error)?.message);
    res.status(503).json({ error: 'Unable to verify your sign-in right now. Please try again.', code: 'auth/unavailable' });
  }
}
