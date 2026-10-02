import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Server-side Firebase access for scheduled alerts (they run while nobody has the app open).
 * The service account comes from FIREBASE_SERVICE_ACCOUNT (the JSON key, on one line). Without it,
 * alerts report "not configured" instead of failing. The key is never logged or returned.
 */
let app: App | null = null;
let failed = false;

function init(): App | null {
  if (app || failed) return app;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    app = getApps()[0] || initializeApp({ credential: cert(sa), projectId: sa.project_id });
  } catch {
    failed = true;
    console.error('[Alerts] FIREBASE_SERVICE_ACCOUNT could not be read.');
  }
  return app;
}

export function adminConfigured(): boolean {
  return init() !== null;
}

export function adminDb(): Firestore {
  const a = init();
  if (!a) throw new Error('Alerts are not configured on the server.');
  return getFirestore(a);
}

export function adminAuth(): Auth {
  const a = init();
  if (!a) throw new Error('Alerts are not configured on the server.');
  return getAuth(a);
}
