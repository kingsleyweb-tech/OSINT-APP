import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
  type Unsubscribe
} from 'firebase/firestore';
import { db, auth } from './config';
import type { Investigation } from '../types/investigation';
import type { UserProfile, SearchHistoryEntry } from '../types/user';

/**
 * Firestore layout (every document belongs to exactly one user):
 *   users/{uid}                          profile and settings
 *   users/{uid}/notifications/{id}       that user's notifications
 *   users/{uid}/searchResults/{historyId} full results of one search in the history
 *   investigations/{id}                  createdBy = owner uid
 *   trackedPeople/{uid}_{investigationId} userId = owner uid
 * The security rules in /firestore.rules enforce the same ownership on the server.
 */

const INVESTIGATIONS = 'investigations';
const USERS = 'users';
const TRACKED = 'trackedPeople';
const NOTIFICATIONS = 'notifications';
const SEARCH_RESULTS = 'searchResults';

/** Strips `undefined` fields recursively so the Firestore SDK does not reject documents. */
const clean = <T>(obj: T): T => (obj === null || obj === undefined ? obj : JSON.parse(JSON.stringify(obj)));

function currentUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in to save data.');
  return uid;
}

async function deleteRefsInBatches(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach(r => batch.delete(r));
    await batch.commit();
  }
}

// ─── User profiles ───────────────────────────────────────────────────────────

export async function getUserProfileFromDb(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

/** Creates the profile if it does not exist yet; never overwrites an existing one (atomic, so it cannot race sign-up). */
export async function createUserProfileInDb(profile: UserProfile): Promise<void> {
  const ref = doc(db, USERS, profile.uid);
  await runTransaction(db, async tx => {
    const existing = await tx.get(ref);
    if (!existing.exists()) tx.set(ref, clean({ ...profile, updatedAt: new Date().toISOString() }));
  });
}

export async function updateUserProfileInDb(uid: string, updates: Partial<UserProfile>): Promise<void> {
  await setDoc(doc(db, USERS, uid), clean({ ...updates, updatedAt: new Date().toISOString() }), { merge: true });
}

export function subscribeToUserProfile(uid: string, onUpdate: (p: UserProfile | null) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(doc(db, USERS, uid), snap => onUpdate(snap.exists() ? (snap.data() as UserProfile) : null), err => onError?.(err));
}

// ─── Investigations ──────────────────────────────────────────────────────────

/** Saves an investigation owned by the signed-in user. */
export async function saveInvestigationToDb(investigation: Investigation): Promise<void> {
  const uid = currentUid();
  const toSave: Investigation = { ...investigation, createdBy: uid, updatedAt: new Date().toISOString() };
  await setDoc(doc(db, INVESTIGATIONS, toSave.id), clean(toSave), { merge: true });
  if (toSave.isTracked) await trackPersonInDb(toSave);
}

/** Returns the investigation only if it belongs to the signed-in user. */
export async function getInvestigationFromDb(id: string): Promise<Investigation | null> {
  try {
    const snap = await getDoc(doc(db, INVESTIGATIONS, id));
    if (!snap.exists()) return null;
    const inv = snap.data() as Investigation;
    return inv.createdBy === auth.currentUser?.uid ? inv : null;
  } catch (error) {
    console.error('Error getting investigation from Firestore:', error);
    return null;
  }
}

const byNewest = (a: Investigation, b: Investigation) =>
  (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0);

export async function getUserInvestigationsFromDb(userId: string): Promise<Investigation[]> {
  try {
    const snap = await getDocs(query(collection(db, INVESTIGATIONS), where('createdBy', '==', userId)));
    return snap.docs.map(d => d.data() as Investigation).sort(byNewest);
  } catch (error) {
    console.error('Error fetching user investigations from Firestore:', error);
    return [];
  }
}

export function subscribeToUserInvestigations(
  userId: string,
  onUpdate: (investigations: Investigation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, INVESTIGATIONS), where('createdBy', '==', userId)),
    snap => onUpdate(snap.docs.map(d => d.data() as Investigation).sort(byNewest)),
    err => {
      console.error('Firestore realtime listener error:', err);
      onError?.(err);
    }
  );
}

export async function deleteInvestigationFromDb(id: string): Promise<void> {
  const uid = currentUid();
  await deleteDoc(doc(db, INVESTIGATIONS, id));
  await deleteDoc(doc(db, TRACKED, `${uid}_${id}`)).catch(() => undefined);
}

// ─── Tracked people ──────────────────────────────────────────────────────────

export interface TrackedPerson {
  userId: string;
  investigationId: string;
  name: string;
  searchType: 'name' | 'username';
  location?: string;
  occupation?: string;
  avatarUrl?: string;
  profilesCount: number;
  sourcesCount: number;
  lastSearched?: string;
  trackedAt: string;
  updatedAt: string;
}

function trackedFrom(inv: Investigation, uid: string, trackedAt?: string): TrackedPerson {
  const location = inv.targetProfile?.location;
  const occupation = inv.targetProfile?.occupation;
  return {
    userId: uid,
    investigationId: inv.id,
    name: inv.name,
    searchType: inv.searchType === 'username' ? 'username' : 'name',
    location: location && location !== 'Not specified' ? location : undefined,
    occupation: occupation && !/not stated|no public role|public individual/i.test(occupation) ? occupation : undefined,
    avatarUrl: inv.targetProfile?.avatarUrl,
    profilesCount: (inv.socialProfiles || []).length,
    sourcesCount: (inv.sources || []).length,
    lastSearched: inv.lastSearched || inv.createdAt,
    trackedAt: trackedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/** Creates or refreshes the tracked-person record for an investigation. */
export async function trackPersonInDb(inv: Investigation): Promise<void> {
  const uid = currentUid();
  const ref = doc(db, TRACKED, `${uid}_${inv.id}`);
  const existing = await getDoc(ref);
  const trackedAt = existing.exists() ? (existing.data() as TrackedPerson).trackedAt : undefined;
  await setDoc(ref, clean(trackedFrom(inv, uid, trackedAt)));
}

export async function untrackPersonInDb(investigationId: string): Promise<void> {
  const uid = currentUid();
  await deleteDoc(doc(db, TRACKED, `${uid}_${investigationId}`));
  await updateDoc(doc(db, INVESTIGATIONS, investigationId), { isTracked: false, updatedAt: new Date().toISOString() }).catch(() => undefined);
}

export function subscribeToTrackedPeople(userId: string, onUpdate: (people: TrackedPerson[]) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, TRACKED), where('userId', '==', userId)),
    snap => onUpdate(snap.docs.map(d => d.data() as TrackedPerson).sort((a, b) => Date.parse(b.trackedAt) - Date.parse(a.trackedAt))),
    err => onError?.(err)
  );
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface StoredNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  targetInvestigationId?: string;
  platform?: string;
}

const notificationsOf = (uid: string) => collection(db, USERS, uid, NOTIFICATIONS);

export function subscribeToNotifications(uid: string, onUpdate: (items: StoredNotification[]) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(notificationsOf(uid), orderBy('createdAt', 'desc'), limit(50)),
    snap => onUpdate(snap.docs.map(d => d.data() as StoredNotification)),
    err => onError?.(err)
  );
}

export async function addNotificationToDb(uid: string, item: StoredNotification): Promise<void> {
  await setDoc(doc(notificationsOf(uid), item.id), clean(item));
}

export async function markNotificationReadInDb(uid: string, id: string): Promise<void> {
  await updateDoc(doc(notificationsOf(uid), id), { read: true });
}

export async function markAllNotificationsReadInDb(uid: string, ids: string[]): Promise<void> {
  const batch = writeBatch(db);
  ids.forEach(id => batch.update(doc(notificationsOf(uid), id), { read: true }));
  await batch.commit();
}

export async function deleteNotificationFromDb(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(notificationsOf(uid), id));
}

export async function deleteAllNotificationsFromDb(uid: string): Promise<void> {
  const snap = await getDocs(notificationsOf(uid));
  await deleteRefsInBatches(snap.docs.map(d => d.ref));
}

// ─── Account data ────────────────────────────────────────────────────────────

/** Everything stored for a user, for "Export my data". */
export async function exportUserDataFromDb(uid: string): Promise<Record<string, unknown>> {
  const [profile, investigations, tracked, notifications] = await Promise.all([
    getUserProfileFromDb(uid),
    getDocs(query(collection(db, INVESTIGATIONS), where('createdBy', '==', uid))),
    getDocs(query(collection(db, TRACKED), where('userId', '==', uid))),
    getDocs(notificationsOf(uid))
  ]);
  return {
    exportedAt: new Date().toISOString(),
    profile,
    investigations: investigations.docs.map(d => d.data()),
    trackedPeople: tracked.docs.map(d => d.data()),
    notifications: notifications.docs.map(d => d.data())
  };
}

export async function deleteAllInvestigationsFromDb(uid: string): Promise<number> {
  const [investigations, tracked] = await Promise.all([
    getDocs(query(collection(db, INVESTIGATIONS), where('createdBy', '==', uid))),
    getDocs(query(collection(db, TRACKED), where('userId', '==', uid)))
  ]);
  await deleteRefsInBatches([...investigations.docs.map(d => d.ref), ...tracked.docs.map(d => d.ref)]);
  return investigations.size;
}

/** Deletes every Firestore document of the user (investigations, tracked people, notifications, saved search results, profile). */
export async function deleteAllUserDataFromDb(uid: string): Promise<void> {
  await deleteAllInvestigationsFromDb(uid);
  await deleteAllNotificationsFromDb(uid);
  await deleteAllSearchResultsFromDb(uid);
  await deleteDoc(doc(db, USERS, uid));
}

// ─── Search history (users/{uid}.searchHistory) ──────────────────────────────

const MAX_HISTORY = 100;

/** Adds a search to the front of the user's history (keeps the newest MAX_HISTORY). */
export async function addSearchHistoryInDb(uid: string, entry: SearchHistoryEntry): Promise<void> {
  const ref = doc(db, USERS, uid);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const current: SearchHistoryEntry[] = (snap.exists() ? (snap.data() as UserProfile).searchHistory : undefined) || [];
    const all = [clean(entry), ...current.filter(e => e.id !== entry.id)];
    const next = all.slice(0, MAX_HISTORY);
    if (snap.exists()) tx.update(ref, { searchHistory: next });
    else tx.set(ref, { searchHistory: next }, { merge: true });
    all.slice(MAX_HISTORY).forEach(e => tx.delete(doc(db, USERS, uid, SEARCH_RESULTS, e.id)));
  });
}

export async function updateSearchHistoryInDb(uid: string, id: string, patch: Partial<SearchHistoryEntry>): Promise<void> {
  const ref = doc(db, USERS, uid);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const current: SearchHistoryEntry[] = (snap.exists() ? (snap.data() as UserProfile).searchHistory : undefined) || [];
    tx.update(ref, { searchHistory: current.map(e => (e.id === id ? clean({ ...e, ...patch }) : e)) });
  });
}

export async function removeSearchHistoryInDb(uid: string, ids: string[] | 'all'): Promise<void> {
  const ref = doc(db, USERS, uid);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const current: SearchHistoryEntry[] = (snap.exists() ? (snap.data() as UserProfile).searchHistory : undefined) || [];
    tx.update(ref, { searchHistory: ids === 'all' ? [] : current.filter(e => !ids.includes(e.id)) });
  });
  if (ids === 'all') await deleteAllSearchResultsFromDb(uid);
  else await deleteRefsInBatches(ids.map(id => doc(db, USERS, uid, SEARCH_RESULTS, id)));
}

// ─── Saved search results (users/{uid}/searchResults/{historyId}) ──────────────

/** Firestore documents are limited to 1 MiB; larger result sets are not cached. */
const MAX_RESULTS_BYTES = 900_000;

/**
 * Saves the full results of a search next to its history entry, so History can show them again
 * without searching. Returns false when the results are too large to store.
 */
export async function saveSearchResultsInDb(uid: string, historyId: string, page: string, payload: unknown): Promise<boolean> {
  const data = JSON.stringify(payload);
  if (data.length > MAX_RESULTS_BYTES) return false;
  await setDoc(doc(db, USERS, uid, SEARCH_RESULTS, historyId), { page, data, savedAt: new Date().toISOString() });
  return true;
}

export async function getSearchResultsFromDb<T = unknown>(uid: string, historyId: string): Promise<{ page: string; payload: T; savedAt: string } | null> {
  const snap = await getDoc(doc(db, USERS, uid, SEARCH_RESULTS, historyId));
  if (!snap.exists()) return null;
  const d = snap.data() as { page: string; data: string; savedAt: string };
  try {
    return { page: d.page, payload: JSON.parse(d.data) as T, savedAt: d.savedAt };
  } catch {
    return null;
  }
}

export async function deleteAllSearchResultsFromDb(uid: string): Promise<void> {
  const snap = await getDocs(collection(db, USERS, uid, SEARCH_RESULTS));
  await deleteRefsInBatches(snap.docs.map(d => d.ref));
}
