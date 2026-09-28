/**
 * Public contact details (email addresses and phone numbers) of the person in a case. Conservative:
 *  - Only details a retrieved source actually shows are recorded — nothing is generated (no
 *    "firstname.lastname@gmail.com" guesses, no number formats invented).
 *  - A detail counts for the person only when it is on their own profile, or appears next to their
 *    name/handle on a page that is tied to this identity. Pages that only share the name are kept
 *    apart as unconfirmed.
 *  - Phone numbers must look like phone numbers: an international "+" number, or digits right after a
 *    word such as "call", "tel", "phone", "mobile" or "WhatsApp" — so dates, IDs and prices are ignored.
 */
import type { Investigation, SocialProfile } from '../types/investigation';
import type { ExploreItem } from './exploreClient';
import { identityContext, subjectMatcher } from './locationEvidence';
import { isSimilarProfile, urlKey } from './workspace';

export type ContactKind = 'email' | 'phone';
export type ContactStatus = 'stated' | 'linked' | 'unconfirmed';

export interface ContactRef {
  id: string;
  kind: ContactKind;
  /** As shown by the source. */
  value: string;
  /** Normalised for grouping: lower-case email, or the phone's digits. */
  key: string;
  status: ContactStatus;
  sourceKind: string;
  sourceName: string;
  url: string;
  evidence: string;
  relationship: string;
  linkedBy?: string;
  /** Email only: a free webmail address (gmail, yahoo…) or an organisation domain. */
  emailType?: 'personal' | 'organisation';
}

export const STATUS_TEXT: Record<ContactStatus, string> = {
  stated: 'On the person’s own profile',
  linked: 'Next to the person on a linked page',
  unconfirmed: 'Unconfirmed — same name only'
};

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const FREE_MAIL = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|aol|proton|protonmail|gmx|mail|zoho|yandex)\./i;
const JUNK_EMAIL = /(\.(png|jpe?g|gif|webp|svg|css|js)$)|@(example|test|domain|email|sentry|wixpress|sentry-next)\.|^(no-?reply|donotreply|postmaster|abuse|privacy|webmaster|admin|support|info|hello|contact|sales|help)@(facebook|instagram|linkedin|twitter|x|tiktok|google|youtube|bing|duckduckgo)\./i;

// "+233 24 123 4567", "+1 (415) 555-0100"
const INTL_PHONE_RE = /\+\d[\d\s().-]{7,18}\d/g;
// "call 024 123 4567", "Tel: 0302-123456", "WhatsApp 0241234567"
const CUED_PHONE_RE = /\b(?:call|tel|telephone|phone|mobile|mob|cell|whatsapp|contact(?:\s+us)?|reach\s+(?:me|us)(?:\s+on)?)\b[\s.:#-]*(?:on|at|via)?[\s:]*(\+?\d[\d\s().-]{7,16}\d)/gi;

function phoneDigits(v: string): string { return v.replace(/\D/g, ''); }
function validPhone(v: string): boolean {
  const d = phoneDigits(v);
  if (d.length < 9 || d.length > 15) return false;
  if (/^(19|20)\d{2}[01]\d[0-3]\d/.test(d) && d.length === 8) return false; // dates
  if (/^(\d)\1+$/.test(d)) return false;                                    // 000000000
  return true;
}
/** Phone key: the last 9 digits (so "+233 24…" and "024…" group together). */
const phoneKey = (v: string) => phoneDigits(v).slice(-9);

function sentenceAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 70);
  const end = Math.min(text.length, index + length + 70);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

interface Found { kind: ContactKind; value: string; index: number }

/** Emails and phone numbers written in a text. */
export function findContacts(text: string): Found[] {
  const out: Found[] = [];
  for (const m of text.matchAll(EMAIL_RE)) {
    const v = m[0].replace(/[.,;:]+$/, '');
    if (!JUNK_EMAIL.test(v)) out.push({ kind: 'email', value: v, index: m.index || 0 });
  }
  for (const m of text.matchAll(INTL_PHONE_RE)) {
    if (validPhone(m[0])) out.push({ kind: 'phone', value: m[0].trim(), index: m.index || 0 });
  }
  for (const m of text.matchAll(CUED_PHONE_RE)) {
    const v = m[1];
    const at = (m.index || 0) + m[0].indexOf(v);
    if (validPhone(v) && !out.some(f => f.kind === 'phone' && phoneKey(f.value) === phoneKey(v))) out.push({ kind: 'phone', value: v.trim(), index: at });
  }
  return out;
}

const NEAR = 160;

interface Src { text: string; ownProfile: boolean; linked: boolean; linkedBy?: string; sourceKind: string; sourceName: string; url: string }

function refsFromText(src: Src, subjectEnds: (t: string) => number[]): ContactRef[] {
  const text = src.text || '';
  if (!text.trim()) return [];
  const nameEnds = src.ownProfile ? [] : subjectEnds(text);
  if (!src.ownProfile && nameEnds.length === 0) return [];
  return findContacts(text).flatMap(f => {
    // Third-party pages: the contact must be close to where the person is named.
    if (!src.ownProfile && !nameEnds.some(end => Math.abs(f.index - end) <= NEAR)) return [];
    const status: ContactStatus = !src.linked ? 'unconfirmed' : src.ownProfile ? 'stated' : 'linked';
    const key = f.kind === 'email' ? f.value.toLowerCase() : phoneKey(f.value);
    return [{
      id: `${urlKey(src.url)}|${f.kind}|${key}`,
      kind: f.kind, value: f.value, key, status,
      sourceKind: src.sourceKind, sourceName: src.sourceName, url: src.url,
      evidence: sentenceAround(text, f.index, f.value.length),
      relationship: relationship(f.kind, status, src.linkedBy),
      linkedBy: src.linkedBy,
      ...(f.kind === 'email' ? { emailType: FREE_MAIL.test(f.value) ? 'personal' as const : 'organisation' as const } : {})
    }];
  });
}

function relationship(kind: ContactKind, status: ContactStatus, linkedBy?: string): string {
  const what = kind === 'email' ? 'email address' : 'phone number';
  if (status === 'stated') return `Shown on the person’s own profile. It is public, but it may be a business ${what} or out of date.`;
  if (status === 'linked') return `Appears next to the person’s name on a page tied to this identity${linkedBy ? ` (${linkedBy})` : ''}. It may belong to their organisation rather than to them personally.`;
  return `The page names someone with the same name but nothing ties it to this identity. The ${what} may belong to a different person.`;
}

/** Contact details stated on the profile itself: platform fields (GitHub email, Facebook About, Instagram business contact). */
function profileFieldRefs(p: SocialProfile, url: string): ContactRef[] {
  const out: ContactRef[] = [];
  const push = (kind: ContactKind, value: string, where: string) => {
    const key = kind === 'email' ? value.toLowerCase() : phoneKey(value);
    if (kind === 'phone' && !validPhone(value)) return;
    out.push({
      id: `${urlKey(url)}|${kind}|${key}`, kind, value, key, status: 'stated',
      sourceKind: `${p.platform} ${where}`, sourceName: p.platform, url,
      evidence: `${p.platform} lists “${value}” ${where === 'profile' ? 'on the profile' : `in its ${where}`} for ${p.profileName || (p.username ? `@${p.username}` : 'this account')}.`,
      relationship: relationship(kind, 'stated'),
      ...(kind === 'email' ? { emailType: FREE_MAIL.test(value) ? 'personal' as const : 'organisation' as const } : {})
    });
  };
  if (p.attributes?.email) push('email', p.attributes.email, 'public email field');
  (p.evidence || []).filter(e => e.code === 'about_contact' || e.code === 'stated_contact').forEach(e => {
    const m = e.text.match(/"([^"]+)"/);
    if (!m) return;
    const v = m[1].trim();
    push(/@/.test(v) ? 'email' : 'phone', v, e.code === 'about_contact' ? 'About section' : 'business contact');
  });
  return out;
}

function dedupe(refs: ContactRef[]): ContactRef[] {
  const m = new Map<string, ContactRef>();
  refs.forEach(r => { if (!m.has(r.id)) m.set(r.id, r); });
  return Array.from(m.values());
}

/** Contact details in the case itself: the person's profiles (fields + bios) and pages kept for this identity. */
export function contactsFromCase(inv: Investigation): ContactRef[] {
  const subject = subjectMatcher(inv).find;
  const refs: ContactRef[] = [];
  (inv.socialProfiles || []).filter(p => !isSimilarProfile(p)).forEach(p => {
    const url = p.profileUrl || p.url;
    refs.push(...profileFieldRefs(p, url));
    if (p.bio) refs.push(...refsFromText({ text: p.bio, ownProfile: true, linked: true, sourceKind: `${p.platform} bio`, sourceName: p.platform, url }, subject));
    const blurb = [p.title, p.snippet].filter(Boolean).join('. ');
    if (blurb) refs.push(...refsFromText({ text: blurb, ownProfile: true, linked: true, sourceKind: `${p.platform} profile (search result)`, sourceName: p.platform, url }, subject));
  });
  (inv.webAndNews || []).forEach(w => {
    refs.push(...refsFromText({ text: [w.title, w.description].filter(Boolean).join('. '), ownProfile: false, linked: true, linkedBy: 'the page is saved in this case', sourceKind: 'Web page', sourceName: w.source, url: w.url }, subject));
  });
  return dedupe(refs);
}

/** Contact details in the Contact tab's search results, attributed only when tied to this identity. */
export function contactsFromSearch(inv: Investigation, items: ExploreItem[]): ContactRef[] {
  const subject = subjectMatcher(inv).find;
  const context = identityContext(inv);
  const profileKeys = new Set((inv.socialProfiles || []).filter(p => !isSimilarProfile(p)).flatMap(p => [p.profileUrl, p.url, p.canonicalUrl].filter(Boolean).map(u => urlKey(u))));
  const caseKeys = new Set((inv.webAndNews || []).map(w => urlKey(w.url)));
  const handles = new Set((inv.socialProfiles || []).filter(p => !isSimilarProfile(p)).map(p => (p.username || '').toLowerCase()).filter(Boolean));
  const searchedHandle = inv.searchType === 'username' ? (inv.searchInputs?.username || inv.name).replace(/^@/, '').toLowerCase() : '';
  return dedupe(items.flatMap(i => {
    const text = [i.title, i.snippet].filter(Boolean).join('. ');
    const lower = `${text} ${i.url}`.toLowerCase();
    const handle = (i.username || '').toLowerCase();
    const ownProfile = profileKeys.has(urlKey(i.url)) || (Boolean(searchedHandle) && handle === searchedHandle && i.kind === 'profile');
    let linkedBy: string | undefined;
    if (ownProfile) linkedBy = 'it is one of this person’s profiles';
    else if (caseKeys.has(urlKey(i.url))) linkedBy = 'the page is saved in this case';
    else if (handle && handles.has(handle)) linkedBy = `it belongs to @${handle}, one of this person’s accounts`;
    else {
      const hit = context.find(c => lower.includes(c.term));
      if (hit) linkedBy = `the page also mentions ${hit.label}`;
    }
    return refsFromText({
      text, ownProfile, linked: Boolean(linkedBy), linkedBy,
      sourceKind: ownProfile ? `${i.platform || i.domain} profile` : i.platform ? `${i.platform} page` : 'Web page',
      sourceName: i.platform || i.domain, url: i.url
    }, subject);
  }));
}

/** Every contact reference of a case: its own data plus the Contact tab's saved search. */
/**
 * Organisation cases: contact details the organisation publishes itself — on its website (read by the
 * Organisation tab) and in Google's knowledge panel. A website that could not be confirmed as the
 * organisation's own gives unconfirmed references only.
 */
export function organizationContacts(inv: Investigation): ContactRef[] {
  if (inv.entityKind !== 'organization') return [];
  const out: ContactRef[] = [];
  const org = inv.organization;
  const site = inv.websiteIntel;
  const official = site?.reachable && site.verification.status !== 'unverified';
  const add = (kind: ContactKind, value: string, url: string, sourceKind: string, sourceName: string, stated: boolean, evidence: string) => {
    if (kind === 'phone' && !validPhone(value)) return;
    const key = kind === 'email' ? value.toLowerCase() : phoneKey(value);
    out.push({
      id: `${urlKey(url)}|${kind}|${key}`, kind, value, key, status: stated ? 'stated' : 'unconfirmed',
      sourceKind, sourceName, url, evidence,
      relationship: stated
        ? `Published by ${org?.name || 'the organisation'} itself (${sourceKind.toLowerCase()}).`
        : 'Shown on a website that could not be confirmed as the organisation’s official website. It may belong to a different organisation.',
      ...(kind === 'email' ? { emailType: FREE_MAIL.test(value) ? 'personal' as const : 'organisation' as const } : {})
    });
  };
  if (site?.reachable) {
    const label = official ? 'Official website' : 'Website (not confirmed as official)';
    site.emails.forEach(e => add('email', e.value, e.foundOn, label, site.siteName || shortHost(e.foundOn), Boolean(official), `The page ${shortHost(e.foundOn)} shows “${e.value}”.`));
    site.phones.forEach(p => add('phone', p.value, p.foundOn, label, site.siteName || shortHost(p.foundOn), Boolean(official), `The page ${shortHost(p.foundOn)} shows “${p.value}”.`));
  }
  (org?.facts || []).filter(f => /phone|customer service|contact|telephone/i.test(f.label)).forEach(f => {
    findContacts(f.value).forEach(c => add(c.kind, c.value, f.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(org?.name || inv.name)}`, 'Google knowledge panel', 'Google', true, `Google’s knowledge panel lists ${f.label.toLowerCase()} “${f.value}”.`));
  });
  // Organisation sources searched by the enrichment step: Wikidata and the organisation's own Google Maps listing.
  (inv.orgEnrich?.claims || []).filter(c => c.field === 'phone' || c.field === 'email').forEach(c => {
    const label = c.sourceKind === 'wikidata' ? 'Wikidata' : c.sourceKind === 'maps' ? 'Google Maps listing' : c.source;
    add(c.field as ContactKind, c.value, c.sourceUrl || '', label, label, true, `${c.source} lists “${c.value}” for ${org?.name || 'the organisation'}.`);
  });
  return out;
}

const shortHost = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') + new URL(url).pathname.replace(/\/$/, ''); } catch { return url; } };

export function allContacts(inv: Investigation): ContactRef[] {
  return dedupe([...contactsFromCase(inv), ...(inv.contactScan?.refs || []), ...organizationContacts(inv)]);
}

export interface ContactSummary {
  key: string;
  kind: ContactKind;
  value: string;
  best: ContactRef;
  refs: ContactRef[];
  sites: string[];
  emailType?: 'personal' | 'organisation';
}

const STATUS_RANK: Record<ContactStatus, number> = { stated: 0, linked: 1, unconfirmed: 2 };
const siteOf = (url: string) => { try { return new URL(url).hostname.replace(/^(www|m)\./, ''); } catch { return url; } };

/** One row per email / phone number (confirmed references only), strongest evidence first. */
export function summariseContacts(refs: ContactRef[]): ContactSummary[] {
  const groups = new Map<string, ContactRef[]>();
  refs.filter(r => r.status !== 'unconfirmed').forEach(r => groups.set(`${r.kind}|${r.key}`, [...(groups.get(`${r.kind}|${r.key}`) || []), r]));
  return Array.from(groups.entries()).map(([key, list]) => {
    const sorted = [...list].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
    return {
      key, kind: sorted[0].kind, value: sorted[0].value, best: sorted[0], refs: sorted,
      sites: Array.from(new Set(sorted.map(r => siteOf(r.url)))),
      ...(sorted[0].emailType ? { emailType: sorted[0].emailType } : {})
    };
  }).sort((a, b) => STATUS_RANK[a.best.status] - STATUS_RANK[b.best.status] || b.sites.length - a.sites.length || a.kind.localeCompare(b.kind));
}

/** The Contact tab's search query: the exact name (without qualifiers) or the handle, quoted. */
export function contactQuery(inv: Investigation): string {
  const label = subjectMatcher(inv).label.replace(/^@/, '');
  return `"${label}"`;
}

/** Every result the contact search returned, with what was found in it. */
export function checkedContactResults(inv: Investigation, items: ExploreItem[], refs: ContactRef[]) {
  const subject = subjectMatcher(inv).find;
  return items.slice(0, 30).map(i => {
    const mine = refs.filter(r => urlKey(r.url) === urlKey(i.url));
    const text = [i.title, i.snippet].filter(Boolean).join('. ');
    const hasContact = findContacts(text).length > 0;
    const named = subject(text).length > 0;
    const note = mine.some(r => r.status !== 'unconfirmed') ? 'Contact detail found and tied to this identity'
      : mine.length ? 'Contact detail found, but nothing ties this page to this identity (same name only)'
      : hasContact && named ? 'Has a contact detail, but not next to the person’s name'
      : hasContact ? 'Has a contact detail, but does not name the person'
      : named ? 'Names the person but shows no email or phone number'
      : 'Does not name the person in its title or summary';
    return {
      source: i.engine, title: (i.title || '').slice(0, 200), url: i.url,
      ...(i.snippet ? { snippet: i.snippet.slice(0, 200) } : {}),
      values: Array.from(new Set(mine.map(r => r.value))),
      linked: mine.some(r => r.status !== 'unconfirmed'),
      note
    };
  });
}
