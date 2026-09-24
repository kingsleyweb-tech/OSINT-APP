import type { SocialProfile } from '../types/investigation';
import { profileDestination } from './searchClient';

export const UNAVAILABLE_MESSAGE = 'This profile is no longer available or could not be verified.';

/** Evidence strength shown to the user. Deliberately plain wording; it is not a certification. */
export function matchStatus(p: SocialProfile): { label: string; tone: 'strong' | 'likely' | 'possible' } {
  if (p.confidenceLabel === 'Verified Match') return { label: 'Profile match', tone: 'strong' };
  if (p.confidenceLabel === 'Likely Match') return { label: 'Likely match', tone: 'likely' };
  if (p.confidenceLabel === 'Possible Match') return { label: 'Possible match', tone: 'possible' };
  // Records saved before evidence labels existed.
  return p.confidence >= 75 ? { label: 'Likely match', tone: 'likely' } : { label: 'Possible match', tone: 'possible' };
}

export function isUnavailable(p: SocialProfile): boolean {
  return p.linkStatus === 'unavailable';
}

/** Short availability note, or null when there is nothing worth saying. */
export function availabilityNote(p: SocialProfile): string | null {
  const checked = p.lastCheckedAt ? new Date(p.lastCheckedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  if (p.linkStatus === 'unavailable') return `Previously discovered · currently unavailable${checked ? ` (checked ${checked})` : ''}`;
  if (p.status === 'previously_discovered') return 'Previously discovered · not returned by the latest scan';
  if (p.linkStatus === 'reachable' && checked) return `Link reachable (checked ${checked})`;
  return null;
}

export function sourceLine(p: SocialProfile): string {
  return p.source || `Search result · ${p.platform}`;
}

export function displayUrl(p: SocialProfile): string {
  const url = profileDestination(p);
  if (!url) return '';
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${decodeURIComponent(u.pathname).replace(/\/$/, '')}${u.search}`;
  } catch {
    return url;
  }
}

/**
 * Opens exactly the URL the search engine returned. Returns an error message instead of opening
 * when the profile is known to be unavailable or has no valid destination; never substitutes a
 * different or guessed URL.
 */
export function openProfile(p: SocialProfile): string | null {
  if (isUnavailable(p)) return UNAVAILABLE_MESSAGE;
  const url = profileDestination(p);
  if (!url) return UNAVAILABLE_MESSAGE;
  window.open(url, '_blank', 'noopener,noreferrer');
  return null;
}

export function evidenceList(p: SocialProfile): string[] {
  if (p.evidence && p.evidence.length > 0) return p.evidence.map(e => e.text);
  if (p.matchReason && p.matchReason.length > 0) return p.matchReason;
  return [`Returned as a ${p.platform} result for the searched name`];
}

export function factsLine(p: SocialProfile): string | null {
  const a = p.attributes;
  if (!a) return null;
  const parts = [a.headline, a.organization && a.organization !== a.headline ? a.organization : undefined, a.education, a.location].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
