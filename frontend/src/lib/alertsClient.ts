import {
  addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, where, writeBatch, type Unsubscribe
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { apiFetch } from './apiAuth';
import { getApiBase } from './searchClient';

/**
 * Keyword alerts of the signed-in user. Each alert document carries ownerUid = the creator; the
 * Firestore rules let only that user read or change it, and the server emails only that user.
 */

export type AlertFrequency = 'daily' | '12h' | '6h';

export interface AlertResult {
  at: string;
  checked: number;
  newMatches: number;
  searchesUsed: number;
  status: 'ok' | 'waiting' | 'error';
  message?: string;
}

export interface Alert {
  id: string;
  ownerUid: string;
  name: string;
  keywords: string[];
  sources: string[];
  country?: string;
  language?: string;
  frequency: AlertFrequency;
  active: boolean;
  emailEnabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt: string;
  matchCount?: number;
  lastResult?: AlertResult;
}

export interface AlertMatch {
  id: string;
  title: string;
  url: string;
  source: string;
  snippet?: string;
  publishedText?: string;
  publishedAt?: string;
  engine: string;
  kind?: string;
  keyword: string;
  foundAt: string;
}

export type AlertInput = Pick<Alert, 'name' | 'keywords' | 'sources' | 'country' | 'language' | 'frequency' | 'emailEnabled'>;

const ALERTS = 'alerts';
/** Paused alerts get a far-future next run, so the scheduler never picks them up. */
const NEVER = '9999-12-31T00:00:00.000Z';

export const FREQUENCY_LABEL: Record<AlertFrequency, string> = { daily: 'Once a day', '12h': 'Every 12 hours', '6h': 'Every 6 hours' };
const RUNS_PER_MONTH: Record<AlertFrequency, number> = { daily: 30, '12h': 60, '6h': 120 };

/** Most SerpApi searches one run can use (Google + Bing News per keyword, one per social platform per keyword). */
export function searchesPerRun(a: Pick<Alert, 'keywords' | 'sources'>): number {
  const social = a.sources.filter(s => s !== 'news').length;
  return a.keywords.length * ((a.sources.includes('news') ? 2 : 0) + social);
}
export const searchesPerMonth = (a: Pick<Alert, 'keywords' | 'sources' | 'frequency'>) => searchesPerRun(a) * RUNS_PER_MONTH[a.frequency];

function uid(): string {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('You must be signed in.');
  return u;
}

const clean = <T extends object>(o: T): T => JSON.parse(JSON.stringify(o));

export function subscribeToAlerts(onUpdate: (alerts: Alert[]) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, ALERTS), where('ownerUid', '==', uid())),
    snap => onUpdate(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Alert, 'id'>) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    e => onError?.(e)
  );
}

export function subscribeToMatches(alertId: string, onUpdate: (m: AlertMatch[]) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, ALERTS, alertId, 'matches'), orderBy('foundAt', 'desc'), limit(200)),
    snap => onUpdate(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<AlertMatch, 'id'>) }))),
    e => onError?.(e)
  );
}

export async function createAlert(input: AlertInput): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, ALERTS), clean({ ...input, ownerUid: uid(), active: true, createdAt: now, nextRunAt: now, matchCount: 0 }));
  return ref.id;
}

export async function updateAlert(id: string, input: AlertInput): Promise<void> {
  uid();
  await updateDoc(doc(db, ALERTS, id), clean({ ...input }));
}

export async function setAlertActive(a: Alert, active: boolean): Promise<void> {
  uid();
  await updateDoc(doc(db, ALERTS, a.id), { active, nextRunAt: active ? new Date().toISOString() : NEVER });
}

/** Deletes the alert and its stored matches. */
export async function deleteAlert(id: string): Promise<void> {
  uid();
  const matches = await getDocs(collection(db, ALERTS, id, 'matches')).catch(() => null);
  if (matches && matches.size) {
    for (let i = 0; i < matches.docs.length; i += 400) {
      const b = writeBatch(db);
      matches.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
      await b.commit().catch(() => undefined);
    }
  }
  await deleteDoc(doc(db, ALERTS, id));
}

async function post<T>(path: string): Promise<T> {
  const res = await apiFetch(`${getApiBase()}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'The request could not be completed.');
  return data as T;
}

export const runAlertNow = (id: string) => post<{ result: AlertResult }>(`/alerts/${encodeURIComponent(id)}/run`);
export const sendTestEmail = () => post<{ sentTo: string }>('/alerts/test-email');

export interface AlertsServerStatus {
  configured: boolean;
  emailConfigured: boolean;
  budgetPerDay?: number;
  usedToday?: number;
  searchesLeft?: number | null;
}

export async function getAlertsStatus(): Promise<AlertsServerStatus | null> {
  try {
    const res = await apiFetch(`${getApiBase()}/alerts/status`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
