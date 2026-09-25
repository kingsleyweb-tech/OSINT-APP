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

export interface SearchDefaults {
  type: 'Name' | 'Username';
  depth: SearchDepthPref;
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
  isGuest?: boolean;
  timeZone?: string;
  dateFormat?: DateFormatPref;
  searchDefaults?: SearchDefaults;
  notificationPrefs?: NotificationPrefs;
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
  isGuest: boolean;
}
