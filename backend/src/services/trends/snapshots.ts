import { adminConfigured, adminDb } from '../alerts/admin';
import type { TrendSource, TrendWindow } from './types';

/**
 * Hourly snapshots of the trending lists (server-only Firestore collection `trendSnapshots`, closed to
 * clients by firestore.rules). The next run compares against an older snapshot to say whether a topic is
 * new, rising or falling. Without firebase-admin configured, snapshots are skipped and direction falls back
 * to other evidence or "Direction unavailable".
 */

export interface SnapshotEntry { key: string; topic: string; rank: number; metric?: number }
export interface Snapshot { country: string; platform: TrendSource; at: string; entries: SnapshotEntry[] }

const COLLECTION = 'trendSnapshots';
/** How far back the comparison snapshot is looked for, per window (hours). */
const LAG_HOURS: Record<TrendWindow, number> = { live: 1, '1h': 1, '6h': 6, '24h': 24, '7d': 24 };

const hourId = (d: Date) => d.toISOString().slice(0, 13).replace(/[-T]/g, '');
const docId = (country: string, platform: TrendSource, d: Date) => `${country || 'ww'}_${platform}_${hourId(d)}`;

/** Saves this hour's list once (later runs in the same hour leave it as it is). */
export async function saveSnapshot(country: string, platform: TrendSource, entries: SnapshotEntry[], now = new Date()): Promise<void> {
  if (!adminConfigured() || !entries.length) return;
  try {
    await adminDb().collection(COLLECTION).doc(docId(country, platform, now)).create({
      country: country || 'ww', platform, at: now.toISOString(), entries: entries.slice(0, 50)
    } satisfies Snapshot);
  } catch {
    // Already saved this hour, or Firestore unavailable: nothing to do.
  }
}

/** The newest snapshot taken about one window ago (searched over a few hours around that time). */
export async function previousSnapshot(country: string, platform: TrendSource, window: TrendWindow, now = new Date()): Promise<Snapshot | null> {
  if (!adminConfigured()) return null;
  const lag = LAG_HOURS[window];
  try {
    const db = adminDb();
    const refs = [0, 1, 2, 3].map(extra => db.collection(COLLECTION).doc(docId(country, platform, new Date(now.getTime() - (lag + extra) * 3600_000))));
    const snaps = await db.getAll(...refs);
    const found = snaps.find(s => s.exists);
    return found ? (found.data() as Snapshot) : null;
  } catch {
    return null;
  }
}
