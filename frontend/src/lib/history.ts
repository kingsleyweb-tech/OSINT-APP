import { auth } from '../firebase/config';
import { addSearchHistoryInDb, updateSearchHistoryInDb } from '../firebase/firestore';
import type { SearchCategory, SearchHistoryEntry, SearchHistoryResult } from '../types/user';
import type { ExploreItem } from './exploreClient';

export const CATEGORY_LABEL: Record<SearchCategory, string> = {
  name: 'Name', username: 'Username', social: 'Social', forums: 'Forums', news: 'News',
  images: 'Images', videos: 'Videos', reverseImage: 'Reverse image', geo: 'Geo', trends: 'Trends'
};

/** Page that runs each kind of search (History → "Run again"). */
export const CATEGORY_PAGE: Record<SearchCategory, string> = {
  name: '/new-investigation', username: '/new-investigation', social: '/search/social', forums: '/search/social',
  news: '/search/news', images: '/search/media', videos: '/search/media', reverseImage: '/search/media',
  geo: '/search/geo', trends: '/search/trends'
};

export function topFromItems(items: ExploreItem[], n = 8): SearchHistoryResult[] {
  return items.slice(0, n).map(i => ({
    title: i.title.slice(0, 200),
    url: i.url,
    source: i.platform || i.author || i.domain,
    ...(i.thumbnail && i.thumbnail.length < 600 ? { thumbnail: i.thumbnail } : {})
  }));
}

/**
 * Saves a search to the signed-in user's history in Firestore. Returns the entry id, or null when
 * nobody is signed in or saving failed (a failed history write never breaks the search itself).
 */
export async function recordSearch(entry: Omit<SearchHistoryEntry, 'id' | 'createdAt'>): Promise<string | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const id = `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    await addSearchHistoryInDb(uid, { ...entry, id, createdAt: new Date().toISOString() });
    return id;
  } catch (e) {
    console.error('Search history not saved:', e);
    return null;
  }
}

export async function linkHistoryToCase(historyId: string | null, investigationId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !historyId) return;
  await updateSearchHistoryInDb(uid, historyId, { investigationId }).catch(e => console.error('History link not saved:', e));
}
