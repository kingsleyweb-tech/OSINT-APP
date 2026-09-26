export type DateFormatPref = 'dmy' | 'mdy' | 'iso';
export type SearchDepthPref = 'quick' | 'standard' | 'deep';

export interface NotificationPrefs {
  /** "Investigation created" when an identity is selected. */
  investigationSaved: boolean;
  /** "Re-run completed" after re-running an investigation's searches. */
  rescanCompleted: boolean;
  /** Failures and other system messages. */
  systemAlerts: boolean;
}

/** Kind of search, used to group the search history. */
export type SearchCategory =
  | 'name' | 'username' | 'social' | 'forums' | 'news' | 'images' | 'videos' | 'reverseImage' | 'geo' | 'trends';

export interface SearchHistoryResult {
  title: string;
  url: string;
  source: string;
  thumbnail?: string;
}

/** One search the user ran, stored in users/{uid}.searchHistory (newest first, capped). */
export interface SearchHistoryEntry {
  id: string;
  category: SearchCategory;
  query: string;
  /** Short description of the settings, e.g. "Ghana · Past week". */
  detail?: string;
  /** Page parameters to run the same search again. */
  params?: Record<string, string>;
  createdAt: string;
  resultCount: number;
  searchesUsed?: number;
  topResults: SearchHistoryResult[];
  /** Case created from this search, when there is one. */
  investigationId?: string;
  /** Search intelligence: the query actually searched when a correction was applied, and how sure it was. */
  correctedQuery?: string;
  correctionConfidence?: 'high' | 'medium' | 'low';
  /** Other spellings that were suggested. */
  variants?: string[];
  /** Engines / sources that ran. */
  sources?: string[];
  mode?: SearchMode;
  /** The full results are saved in users/{uid}/searchResults/{id} and can be shown again without searching. */
  hasResults?: boolean;
}

export type SearchMode = 'intelligent' | 'precise';

export interface SearchDefaults {
  type: 'Name' | 'Username';
  depth: SearchDepthPref;
  /** Intelligent (default): checks spelling and suggests corrections. Precise: searches exactly what is typed. */
  mode?: SearchMode;
}

/**
 * Profile and settings of a user, stored in Firestore at users/{uid}.
 * Passwords are never stored here: Firebase Authentication holds credentials.
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  organisation?: string;
  phoneNumber?: string;
  /** Small square JPEG as a data URL (resized in the browser before saving). */
  photoURL?: string;
  /** Legacy field from the removed guest mode; no longer written. */
  isGuest?: boolean;
  timeZone?: string;
  dateFormat?: DateFormatPref;
  searchDefaults?: SearchDefaults;
  notificationPrefs?: NotificationPrefs;
  /** Recent searches of every kind (History page). */
  searchHistory?: SearchHistoryEntry[];
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  investigationSaved: true,
  rescanCompleted: true,
  systemAlerts: true
};

export const DEFAULT_SEARCH_DEFAULTS: SearchDefaults = { type: 'Name', depth: 'deep' };

/** The signed-in user as the app uses it (Firebase auth user + Firestore profile). */
export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string;
  role: string;
  photoURL?: string;
  /** How this account signs in. */
  provider: 'google' | 'password' | 'other';
  /** Firebase Authentication's own account timestamps (ISO). */
  createdAt?: string;
  lastSignInAt?: string;
}
