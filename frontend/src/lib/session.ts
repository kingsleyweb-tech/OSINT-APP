import type { DateFormatPref, SessionUser, UserProfile } from '../types/user';

/**
 * Module-level copy of the signed-in user and their display preferences, for plain helper
 * functions (date formatting, audit "by" names) that cannot use React hooks.
 * Kept up to date by SessionProvider.
 */

let currentUser: SessionUser | null = null;
let timeZone: string | undefined;
let dateFormat: DateFormatPref = 'dmy';

export function setSessionState(user: SessionUser | null, profile: UserProfile | null): void {
  currentUser = user;
  timeZone = profile?.timeZone || undefined;
  dateFormat = profile?.dateFormat || 'dmy';
}

export function getSessionUser(): SessionUser | null {
  return currentUser;
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

const tz = () => (timeZone ? { timeZone } : {});

function valid(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date in the user's chosen format and time zone. */
export function formatDate(iso?: string): string {
  const d = valid(iso);
  if (!d) return iso || '—';
  if (dateFormat === 'iso') return d.toLocaleDateString('en-CA', { ...tz() });
  if (dateFormat === 'mdy') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...tz() });
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...tz() });
}

/** Day and month only, in the user's format. */
export function formatShortDate(iso?: string): string {
  const d = valid(iso);
  if (!d) return iso || '—';
  if (dateFormat === 'iso') return d.toLocaleDateString('en-CA', { ...tz() }).slice(5);
  if (dateFormat === 'mdy') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...tz() });
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', ...tz() });
}

export function formatTime(iso?: string): string {
  const d = valid(iso);
  if (!d) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', ...tz() });
}

/** Example of each date format, for the settings picker. */
export function dateFormatExample(fmt: DateFormatPref, iso = new Date().toISOString()): string {
  const saved = dateFormat;
  dateFormat = fmt;
  const out = formatDate(iso);
  dateFormat = saved;
  return out;
}
