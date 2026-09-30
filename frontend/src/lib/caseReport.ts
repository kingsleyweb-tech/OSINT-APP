/**
 * Builds the investigation report (PDF export) from the case exactly as it is saved: the same lists
 * and helpers the workspace tabs use. Nothing is searched, fetched or inferred here; a detail that the
 * case does not contain is written as "Not found". Every URL goes through reportUrl() first.
 */
import type { Investigation, SocialProfile } from '../types/investigation';
import { derive } from '../components/investigations/workspace/WorkspaceContext';
import {
  activityType, allAuditEvents, assocKey, fmtDate, hostOf, isSimilarActivity, isSimilarProfile, LEVEL_LABEL, levelOf,
  parseLooseDate, profileKey, shortUrl, similarProfileKeys, urlKey, kindLabel, type WebItem
} from './workspace';
import { allLocationRefs, summarise, STATUS_LABEL, TYPE_LABEL } from './locationEvidence';
import { allContacts, summariseContacts, STATUS_TEXT } from './contactEvidence';
import { bestWebsite, entityClass, FIELD_LABEL, orgProfile } from './organizationProfile';
import { caseGender } from './genderEvidence';
import { factsLine, matchStatus } from './profileDisplay';
import type { OrgField } from '../types/investigation';

export const NOT_FOUND = 'Not found';

// ─── Report model (rendered by reportPdf.ts) ────────────────────────────────

export interface LinkCell { text: string; url: string }
export type Cell = string | LinkCell;

export type Block =
  | { kind: 'para'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'sub'; text: string }
  | { kind: 'note'; text: string }
  | { kind: 'kv'; rows: Array<[string, Cell]> }
  | { kind: 'table'; head: string[]; rows: Cell[][]; widths?: number[] };

export interface ReportSection { title: string; blocks: Block[] }

export interface CaseReport {
  title: string;
  subtitle: string;
  generatedAt: string;
  cover: Array<[string, string]>;
  sections: ReportSection[];
  fileName: string;
}

// ─── Links ──────────────────────────────────────────────────────────────────

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif|heic|tiff?)$/i;
const IMAGE_HOSTS = /(^|\.)(gstatic\.com|googleusercontent\.com|ggpht\.com|ytimg\.com|twimg\.com|fbcdn\.net|cdninstagram\.com|licdn\.com|tiktokcdn\.com|tiktokcdn-us\.com|pinimg\.com|redd\.it|imgur\.com|wp\.com|bing\.net|serpapi\.com)$/i;
const SEARCH_PAGES: Array<[RegExp, RegExp]> = [
  [/(^|\.)google\.[a-z.]+$/i, /^\/(search|webhp|imgres|maps\/search)/i],
  [/(^|\.)bing\.com$/i, /^\/(search|images|videos|news|ck)/i],
  [/(^|\.)duckduckgo\.com$/i, /^\/($|\?|html|lite)/i],
  [/(^|\.)search\.yahoo\.com$/i, /./],
  [/(^|\.)youtube\.com$/i, /^\/results/i],
  [/(^|\.)yandex\.[a-z]+$/i, /^\/(search|images)/i]
];
const TRACKING_PARAM = /^(utm_[a-z]+|fbclid|gclid|dclid|msclkid|igshid|igsh|si|ref_src|ref_url|mc_[a-z]+|_hsenc|_hsmi|spm|share_id|feature)$/i;
const TRACKING_HOSTS = /(^|\.)(doubleclick\.net|googleadservices\.com|googlesyndication\.com|facebook\.com\/tr|clickserve|adservice)/i;

/** Unwraps redirect links (google.com/url?q=…, l.facebook.com/l.php?u=…) to the page they point to. */
function unwrap(u: URL): URL | null {
  const host = u.hostname.toLowerCase();
  const target = (/(^|\.)google\.[a-z.]+$/.test(host) && u.pathname === '/url') ? (u.searchParams.get('q') || u.searchParams.get('url'))
    : (/^l[m]?\.facebook\.com$/.test(host) && u.pathname === '/l.php') ? u.searchParams.get('u')
      : (host === 'l.instagram.com') ? u.searchParams.get('u')
        : null;
  if (target === null) return u;
  try { return new URL(target); } catch { return null; }
}

/**
 * The link as it should appear in the report, or null when it must be left out: malformed, not http(s),
 * an image / thumbnail / CDN file, a search-results page, an ad or tracking link, an API endpoint, or a
 * page of this application. Tracking parameters are removed; nothing else about the address changes.
 */
export function reportUrl(raw?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let u: URL | null;
  try { u = new URL(raw.trim()); } catch { return null; }
  u = unwrap(u);
  if (!u || (u.protocol !== 'https:' && u.protocol !== 'http:')) return null;
  const host = u.hostname.toLowerCase();
  if (!host.includes('.') || /^(localhost|127\.|10\.|192\.168\.|0\.0\.0\.0)/.test(host)) return null;
  if (typeof window !== 'undefined' && host === window.location.hostname) return null;
  if (IMAGE_HOSTS.test(host) || IMAGE_EXT.test(u.pathname)) return null;
  if (/^(encrypted-tbn|lh\d|i\d?\.|img\.|images\.|thumbs?\.|static\.|cdn\.)/.test(host) && !/\/(article|news|story|post)/i.test(u.pathname)) return null;
  if (TRACKING_HOSTS.test(host + u.pathname)) return null;
  if (/^\/api(\/|$)|\/wp-json\/|\/graphql\b/i.test(u.pathname) || /^api\./.test(host)) return null;
  if (SEARCH_PAGES.some(([h, p]) => h.test(host) && p.test(u!.pathname + u!.search))) return null;
  Array.from(u.searchParams.keys()).forEach(k => { if (TRACKING_PARAM.test(k)) u!.searchParams.delete(k); });
  u.hash = '';
  return u.toString();
}

const link = (url: string | null | undefined, text?: string): Cell => {
  const clean = reportUrl(url || '');
  return clean ? { text: text || shortUrl(clean), url: clean } : NOT_FOUND;
};

// ─── Text helpers ───────────────────────────────────────────────────────────

const clip = (s: string | undefined, n: number) => {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const orNot = (s?: string | null) => (s && s.trim() ? s.trim() : NOT_FOUND);
/** Where a result came from, without the search provider's name ("SerpApi (tiktok.com)" → "tiktok.com"). */
const siteName = (name?: string, url?: string) =>
  (name || '').replace(/^\s*serp\s?api\s*\(([^)]+)\)\s*$/i, '$1').replace(/^\s*serp\s?api\s*[·:-]?\s*/i, '').trim() || hostOf(url) || NOT_FOUND;

function searchTypeLabel(inv: Investigation): string {
  if (inv.entityKind === 'organization' && inv.organization) return 'Organisation';
  switch (inv.searchType) {
    case 'username': return 'Username';
    case 'email': return 'Email address';
    case 'phone': return 'Phone number';
    case 'name': return 'Person (name)';
    default: return inv.searchInputs?.searchType ? searchTypeLabel({ ...inv, searchType: inv.searchInputs.searchType }) : 'Saved results';
  }
}

function targetTitle(inv: Investigation): string {
  if (inv.searchType === 'username') return `@${inv.name.replace(/^@/, '')}`;
  return inv.organization?.name && inv.entityKind === 'organization' ? inv.organization.name : inv.name;
}

function queryText(inv: Investigation): string {
  const i = inv.searchInputs || {};
  const parts: string[] = [];
  if (i.name) parts.push(`Name: ${i.name}`);
  if (i.username) parts.push(`Username: @${i.username.replace(/^@/, '')}`);
  if (i.email) parts.push(`Email: ${i.email}`);
  if (i.phone) parts.push(`Phone: ${i.phone}`);
  if (i.location) parts.push(`Location: ${i.location}`);
  if (i.organization) parts.push(`Organisation: ${i.organization}`);
  if (!parts.length && i.queryValue) parts.push(i.queryValue);
  return parts.join(' · ') || inv.name;
}

const profileName = (p: SocialProfile) => p.profileName || (p.username ? `@${p.username.replace(/^@/, '')}` : p.title || p.platform);

const USERNAME_MATCH: Record<string, string> = {
  exact: 'Exact match', variation: 'Username variation', related: 'Possibly related', similar: 'Other person (similar handle)'
};

// ─── Report ─────────────────────────────────────────────────────────────────

export function buildCaseReport(inv: Investigation, preparedBy: string): CaseReport {
  const d = derive(inv);
  const now = new Date().toISOString();
  const isOrg = inv.entityKind === 'organization' && Boolean(inv.organization);
  const ref = inv.lastSearched || inv.createdAt;
  const similarKeys = similarProfileKeys(inv);
  const profiles = (inv.socialProfiles || []).filter(p => !isSimilarProfile(p));
  const similar = (inv.socialProfiles || []).filter(isSimilarProfile);
  const activities = (inv.activities || []).filter(a => !isSimilarActivity(a, similarKeys));
  const associations = inv.associations || [];
  const places = summarise(allLocationRefs(inv));
  const contacts = summariseContacts(allContacts(inv));
  const notRaw = (key: string) => levelOf(inv, key) !== 'raw';
  const dateText = (value?: string) => {
    const dt = parseLooseDate(value, ref);
    return dt ? fmtDate(dt.toISOString()) : 'Date not stated';
  };
  const sections: ReportSection[] = [];

  // Web and news results the investigator did not mark as raw, with a usable link, once each.
  const cleanWeb = (items: WebItem[]) => {
    const seen = new Set<string>();
    return items.filter(w => {
      const url = reportUrl(w.url);
      if (!url || !notRaw(urlKey(w.url))) return false;
      const k = urlKey(url);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  const news = cleanWeb(d.buckets.news).sort((a, b) =>
    (parseLooseDate(b.metadata?.date, ref)?.getTime() || 0) - (parseLooseDate(a.metadata?.date, ref)?.getTime() || 0));
  const web = cleanWeb(d.buckets.web);
  const pages = cleanWeb(d.buckets.page);

  // ── 1. Summary ──
  const findings: string[] = [];
  if (isOrg) {
    const facts = Object.values(orgProfile(inv).facts).flat().length;
    findings.push(facts ? `${plural(facts, 'fact')} about the organisation from its sources.` : 'No facts about the organisation were gathered from its sources.');
  }
  findings.push(`${plural(profiles.length, 'public profile')} attributed to the subject${similar.length ? ` (${plural(similar.length, 'similar account')} of other people listed separately)` : ''}.`);
  if (activities.length) findings.push(`${plural(activities.length, 'activity item')} (posts, articles, mentions) in the timeline.`);
  if (associations.length) findings.push(`${plural(associations.length, 'association')} with organisations or groups.`);
  if (places.length) findings.push(`${plural(places.length, 'location')} connected to the subject by public sources.`);
  if (contacts.length) findings.push(`${plural(contacts.length, 'public contact detail')} (email / phone) shown by sources.`);
  if (news.length || web.length) findings.push(`${plural(news.length, 'news article')} and ${plural(web.length, 'other web page')} kept.`);
  findings.push(`${plural(d.sources.length, 'source')} recorded; ${d.pipeline.validated} validated by the investigator.`);
  sections.push({
    title: 'Investigation summary',
    blocks: [
      { kind: 'kv', rows: [
        ['Investigation', inv.name],
        ['Investigation ID', inv.id],
        ['Search type', searchTypeLabel(inv)],
        ['Search query / target', queryText(inv)],
        ['Search depth', inv.searchDepth || 'deep'],
        ['Created', fmtDate(inv.createdAt, true) || NOT_FOUND],
        ['Last searched', fmtDate(inv.lastSearched || inv.createdAt, true) || NOT_FOUND],
        ['Last updated', fmtDate(inv.updatedAt || inv.createdAt, true) || NOT_FOUND],
        ['Status', inv.status || 'Completed']
      ] },
      { kind: 'sub', text: 'Summary of findings' },
      { kind: 'para', text: inv.quickSummary?.trim() || 'No summary could be built from the search results.' },
      { kind: 'bullets', items: findings }
    ]
  });

  // ── 2. Identity / entity ──
  if (isOrg) {
    const profile = orgProfile(inv);
    const cls = entityClass(inv, profile);
    const top = (f: OrgField) => profile.facts[f]?.[0];
    const factValue = (f: OrgField, many = 1): Cell => {
      const g = profile.facts[f];
      if (!g?.length) return NOT_FOUND;
      return g.slice(0, many).map(x => `${x.value}${x.roles.length ? ` (${x.roles.join(', ')})` : ''}`).join('; ');
    };
    const site = bestWebsite(inv);
    const rows: Array<[string, Cell]> = [
      ['Organisation name', top('official_name')?.value || inv.organization!.name],
      ['Also known as', factValue('alt_name', 4)],
      ['Entity type', `${cls.category}${cls.parent ? ` (${cls.parent})` : ''} · ${cls.confidence}`],
      ['Description', orNot(clip(top('description')?.value || inv.organization!.description?.value, 600))],
      ['Industry / sector', top('industry')?.value || top('sector')?.value || NOT_FOUND],
      ['Founded', factValue('founded')],
      ['Headquarters', factValue('headquarters')],
      ['Country', factValue('country')],
      ['Address', factValue('address', 2)],
      ['Official website', site ? link(site.url) : NOT_FOUND],
      ['Phone', factValue('phone', 3)],
      ['Email', factValue('email', 3)],
      ['Parent organisation', factValue('parent')]
    ];
    const factRows: Cell[][] = [];
    (Object.keys(FIELD_LABEL) as OrgField[]).forEach(f => {
      if (['description', 'person', 'unit', 'product', 'service', 'social', 'subsidiary'].includes(f)) return;
      (profile.facts[f] || []).slice(0, 3).forEach(g => {
        const c = g.claims[0];
        factRows.push([FIELD_LABEL[f], clip(g.value, 160), g.independent >= 2 ? `${g.independent} independent sources` : '1 source', c?.sourceUrl ? link(c.sourceUrl, g.sources.slice(0, 2).join(', ')) : g.sources.slice(0, 2).join(', ')]);
      });
    });
    const people = (profile.facts.person || []).slice(0, 25).map(g => [g.value, g.roles.join(', ') || NOT_FOUND, g.sources.slice(0, 2).join(', ')] as Cell[]);
    const units = (inv.websiteIntel?.units || []).slice(0, 40).map(u => [u.name, u.group || '', link(u.url)] as Cell[]);
    const blocks: Block[] = [
      { kind: 'kv', rows },
      { kind: 'note', text: `Entity type basis: ${cls.basis.length ? cls.basis.join('; ') : 'no source states what kind of organisation it is'}.` }
    ];
    if (profile.conflicts.length) blocks.push({ kind: 'note', text: `Sources disagree on: ${profile.conflicts.map(f => FIELD_LABEL[f]).join(', ')}. Both values are listed below.` });
    if (factRows.length) blocks.push({ kind: 'sub', text: 'Facts and their sources' }, { kind: 'table', head: ['Field', 'Value', 'Support', 'Source'], rows: factRows, widths: [30, 70, 30, 44] });
    if (people.length) blocks.push({ kind: 'sub', text: 'People and leadership named by sources' }, { kind: 'table', head: ['Name', 'Role', 'Source'], rows: people, widths: [60, 64, 50] });
    if (units.length) blocks.push({ kind: 'sub', text: 'Units / departments (from the official website)' }, { kind: 'table', head: ['Unit', 'Group', 'Page'], rows: units, widths: [70, 40, 64] });
    sections.push({ title: 'Organisation information', blocks });
  } else {
    const gender = caseGender(inv);
    const usernames = Array.from(new Set([
      inv.searchInputs?.username,
      ...profiles.filter(p => !p.usernameMatch || p.usernameMatch === 'exact').map(p => p.username)
    ].filter((u): u is string => Boolean(u && u.trim())).map(u => `@${u.replace(/^@/, '')}`))).slice(0, 12);
    const platformCounts = new Map<string, number>();
    profiles.forEach(p => platformCounts.set(p.platform, (platformCounts.get(p.platform) || 0) + 1));
    const role = inv.targetProfile?.occupation && !/not stated|no public role|public individual/i.test(inv.targetProfile.occupation) ? inv.targetProfile.occupation : NOT_FOUND;
    const location = inv.targetProfile?.location && inv.targetProfile.location !== 'Not specified' ? inv.targetProfile.location : (places[0]?.place || NOT_FOUND);
    const blocks: Block[] = [{ kind: 'kv', rows: [
      ['Full name', inv.searchType === 'username' ? orNot(profiles.find(p => p.profileName)?.profileName) : (inv.targetProfile?.fullName || inv.name)],
      ['Usernames', usernames.join(', ') || NOT_FOUND],
      ['Location', location],
      ['Occupation / role', role],
      ['Gender', gender.evidence.length ? `${gender.value} (stated on ${gender.evidence.map(x => x.platform).join(', ')})` : 'Not publicly stated'],
      ['Main platforms', Array.from(platformCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p]) => p).join(', ') || NOT_FOUND],
      // Only associations the evidence supports; mentions are listed with their status in the Associations section.
      ['Associated organisations', associations.filter(a => a.evidenceState === 'Documented' || a.evidenceState === 'Strong evidence')
        .slice(0, 5).map(a => a.name).join('; ') || NOT_FOUND]
    ] }];
    if (inv.derivedUsernames?.length) blocks.push({ kind: 'note', text: `Usernames suggested by the email address (not attributed, not searched): ${inv.derivedUsernames.join(', ')}.` });
    blocks.push({ kind: 'note', text: 'Gender is shown only when the person’s own profiles state it; it is never inferred from a name or photo.' });
    sections.push({ title: 'Identity information', blocks });
  }

  // Public contact details (both kinds of case).
  if (contacts.length) {
    sections[sections.length - 1].blocks.push(
      { kind: 'sub', text: 'Public contact details' },
      { kind: 'table', head: ['Contact', 'Where it appears', 'Sources', 'Evidence'], widths: [44, 44, 26, 60],
        rows: contacts.map(c => [c.value, STATUS_TEXT[c.best.status], String(c.sites.length), link(c.best.url, c.sites.slice(0, 2).join(', ') || undefined)]) }
    );
  }

  // ── 3. Profiles ──
  {
    const blocks: Block[] = [];
    const rows: Cell[][] = profiles.map(p => {
      const status = p.usernameMatch ? USERNAME_MATCH[p.usernameMatch] : matchStatus(p).label;
      const info = [factsLine(p), clip(p.bio || p.attributes?.headline || p.snippet, 180)].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(' · ');
      const url = p.linkStatus === 'unavailable' ? `Link no longer available${p.lastCheckedAt ? ` (checked ${fmtDate(p.lastCheckedAt)})` : ''}` : link(p.profileUrl || p.url);
      return [p.platform, profileName(p), url, info || NOT_FOUND, `${status} · ${LEVEL_LABEL[levelOf(inv, profileKey(p))]}`];
    });
    if (rows.length) blocks.push({ kind: 'table', head: ['Platform', 'Name / username', 'Profile URL', 'Public information', 'Match · level'], rows, widths: [22, 30, 42, 48, 32] });
    else blocks.push({ kind: 'para', text: 'No public profile was attributed to the subject.' });
    if (pages.length) {
      blocks.push({ kind: 'sub', text: 'Organisation pages, groups and communities' },
        { kind: 'table', head: ['Title', 'Type', 'Link'], widths: [80, 30, 64], rows: pages.map(w => [clip(w.title, 120), kindLabel(w), link(w.url)]) });
    }
    if (similar.length) {
      blocks.push({ kind: 'sub', text: 'Similar accounts — other people, not attributed to the subject' },
        { kind: 'table', head: ['Platform', 'Account', 'URL', 'Why listed'], widths: [26, 40, 54, 54],
          rows: similar.map(p => [p.platform, profileName(p), link(p.profileUrl || p.url), clip((p.matchExplanation || []).join('; '), 140) || 'Handle resembles the searched username'] ) });
    }
    sections.push({ title: 'Profiles', blocks });
  }

  // ── 4. Activity ──
  {
    const seen = new Set<string>();
    // Cases saved by older versions gave undated results the search day as their date (and no foundAt).
    // Such a date is not the activity's date, so it is reported as not stated.
    const legacy = activities.length > 0 && activities.every(a => !a.foundAt);
    const created = inv.createdAt ? new Date(inv.createdAt).toDateString() : '';
    const dateOf = (value: string) => {
      const dt = parseLooseDate(value, ref);
      return dt && legacy && dt.toDateString() === created ? null : dt;
    };
    const items = activities
      .filter(a => notRaw(urlKey(a.sourceUrl)))
      .map(a => ({ a, date: dateOf(a.date), type: activityType(a, d.webByKey, d.profileKeys) }))
      .filter(x => {
        const k = urlKey(reportUrl(x.a.sourceUrl) || '') || x.a.title.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((x, y) => (y.date?.getTime() || 0) - (x.date?.getTime() || 0));
    const shown = items.slice(0, 80);
    const blocks: Block[] = shown.length
      ? [{ kind: 'table', head: ['Date', 'Type', 'Platform', 'Activity', 'Link'], widths: [22, 18, 26, 64, 44],
        rows: shown.map(x => [x.date ? fmtDate(x.date.toISOString()) : 'Date not stated', x.type, siteName(x.a.sourceName, x.a.sourceUrl),
          clip([x.a.title, x.a.briefReport && x.a.briefReport !== x.a.title ? x.a.briefReport : ''].filter(Boolean).join(' — '), 220) + (x.a.location ? ` (Location: ${x.a.location})` : ''),
          link(x.a.sourceUrl)]) }]
      : [{ kind: 'para', text: 'No public activity was recorded for the subject.' }];
    if (items.length > shown.length) blocks.push({ kind: 'note', text: `${items.length - shown.length} older activity items are in the case and not repeated here.` });
    sections.push({ title: 'Activity', blocks });
  }

  // ── 5. Associations ──
  sections.push({
    title: 'Associations and relationships',
    blocks: associations.length
      ? [
        { kind: 'table', head: ['Name', 'Category', 'Relationship', 'Evidence', 'Status', 'Source'], widths: [30, 22, 28, 46, 24, 24],
          rows: associations.map(a => [a.name, a.category, orNot(a.relationship), clip(a.evidenceCitation, 200) || NOT_FOUND,
            `${a.evidenceState} · ${LEVEL_LABEL[levelOf(inv, assocKey(a))]}`, link(a.sourceUrl, a.sourceName || undefined)]) },
        { kind: 'note', text: 'An association is listed only when a kept result names it alongside the subject; "Mention only" and "Possible association" are not confirmed relationships.' }
      ]
      : [{ kind: 'para', text: 'No organisation, school, company or group was named alongside the subject in the kept results.' }]
  });

  // ── 6. Location ──
  {
    const unconfirmed = allLocationRefs(inv).filter(r => r.status === 'unconfirmed').length;
    const blocks: Block[] = places.length
      ? [{ kind: 'table', head: ['Location', 'What the sources say', 'Status', 'Sources', 'Evidence'], widths: [30, 36, 30, 16, 62],
        rows: places.map(s => [s.place, s.types.map(t => TYPE_LABEL[t]).join('; '), STATUS_LABEL[s.best.status], String(s.sites.length),
          reportUrl(s.best.url) ? { text: `${clip(s.best.evidence, 150)} — ${shortUrl(reportUrl(s.best.url)!)}`, url: reportUrl(s.best.url)! } : clip(s.best.evidence, 150) || NOT_FOUND]) }]
      : [{ kind: 'para', text: 'No reliable public location information was found for the subject.' }];
    const runs = inv.locationScan?.runs || {};
    blocks.push({ kind: 'note', text: [
      runs.core ? `Location search run ${fmtDate(runs.core.at, true)} (${runs.core.resultsChecked} results checked).` : 'The location search of the Location tab had not been run.',
      unconfirmed ? `${plural(unconfirmed, 'reference')} on same-name pages not linked to this identity are left out.` : '',
      'Places are only those a source states; no private address is inferred.'
    ].filter(Boolean).join(' ') });
    sections.push({ title: 'Location intelligence', blocks });
  }

  // ── 7. Web and news ──
  {
    const blocks: Block[] = [];
    // Organisation cases: articles the Google News search found (as in the Organisation tab's news section).
    const orgNews = isOrg ? (inv.orgEnrich?.mentions || [])
      .filter(m => m.engine === 'google_news' && reportUrl(m.url) && !news.some(n => urlKey(n.url) === urlKey(m.url)))
      .filter((m, i, all) => all.findIndex(x => urlKey(x.url) === urlKey(m.url)) === i)
      .sort((a, b) => (parseLooseDate(b.date, ref)?.getTime() || 0) - (parseLooseDate(a.date, ref)?.getTime() || 0))
      .slice(0, 25) : [];
    blocks.push({ kind: 'sub', text: `News articles (${news.length + orgNews.length})` });
    if (news.length || orgNews.length) {
      blocks.push({ kind: 'table', head: ['Date', 'Publisher', 'Headline', 'Link'], widths: [22, 30, 76, 46], rows: [
        ...news.map(w => [dateText(w.metadata?.date), siteName(w.source, w.url), clip(w.title, 160), link(w.url)]),
        ...orgNews.map(m => [dateText(m.date), siteName(m.source, m.url), clip(m.title, 160), link(m.url)])
      ] });
    } else blocks.push({ kind: 'para', text: inv.newsCheckedAt ? 'No news article naming the subject was found.' : 'No news article naming the subject was kept (the News tab search had not been run).' });
    blocks.push({ kind: 'sub', text: `Web pages (${web.length})` });
    if (web.length) {
      blocks.push({ kind: 'table', head: ['Title', 'Site', 'What it shows', 'Link'], widths: [48, 26, 56, 44],
        rows: web.map(w => [clip(w.title, 120), siteName(w.source, w.url), clip(w.description, 160) || NOT_FOUND, link(w.url)]) });
    } else blocks.push({ kind: 'para', text: 'No other web page was kept.' });
    sections.push({ title: 'Web and news findings', blocks });
  }

  // ── 8. Images and media ──
  {
    const seen = new Set<string>();
    const imgs = (inv.imageResults || []).filter(i => {
      const u = reportUrl(i.pageUrl);
      if (!u || seen.has(urlKey(u))) return false;
      seen.add(urlKey(u));
      return true;
    });
    const videos = isOrg ? (inv.orgEnrich?.videos || []).filter(v => reportUrl(v.url)).slice(0, 15) : [];
    const blocks: Block[] = [];
    if (imgs.length) {
      blocks.push({ kind: 'para', text: 'Pages where pictures naming the subject were found. The pages are listed instead of the image files; a picture next to a name is not proof it shows this person.' },
        { kind: 'table', head: ['Picture title', 'Source', 'Page'], widths: [80, 34, 60], rows: imgs.map(i => [clip(i.title, 140), siteName(i.source, i.pageUrl), link(i.pageUrl)]) });
    } else blocks.push({ kind: 'para', text: inv.imagesCheckedAt ? 'No pictures naming the subject were found.' : 'The image search of the Images tab had not been run.' });
    if (videos.length) blocks.push({ kind: 'sub', text: 'Videos' }, { kind: 'table', head: ['Date', 'Title', 'Link'], widths: [24, 90, 60], rows: videos.map(v => [dateText(v.date), clip(v.title, 140), link(v.url)]) });
    sections.push({ title: 'Images and media', blocks });
  }

  // ── 9. Sources ──
  {
    const seen = new Set<string>();
    const rows: Cell[][] = [];
    d.sources.forEach(s => {
      const u = reportUrl(s.source.url);
      if (!u || !notRaw(s.key) || seen.has(urlKey(u))) return;
      seen.add(urlKey(u));
      rows.push([s.sid, siteName(s.source.sourceName || s.source.domain, u), s.source.sourceType, { text: shortUrl(u), url: u },
        (s.source.usedFor || []).filter(Boolean).slice(0, 3).join('; ') || NOT_FOUND]);
    });
    const left = d.sources.length - rows.length;
    sections.push({ title: 'Sources', blocks: [
      rows.length ? { kind: 'table', head: ['ID', 'Source', 'Type', 'URL', 'Supported'], widths: [14, 32, 26, 58, 44], rows } : { kind: 'para', text: 'No sources were recorded.' },
      ...(left > 0 ? [{ kind: 'note', text: `${plural(left, 'source')} left out: marked "Raw" by the investigator, duplicated, or without a usable public link.` } as Block] : [])
    ] });
  }

  // ── 10. Metrics and audit ──
  {
    const log = inv.searchLog || [];
    const coverage = inv.searchCoverage || [];
    const metrics: Array<[string, Cell]> = [
      ['Profiles attributed', String(profiles.length)],
      ['Activity items', String(activities.length)],
      ['Associations', String(associations.length)],
      ['Locations', String(places.length)],
      ['Public contact details', String(contacts.length)],
      ['News articles / web pages kept', `${d.buckets.news.length} / ${d.buckets.web.length}`],
      ['Images', String((inv.imageResults || []).length)],
      ['Sources', String(d.sources.length)],
      ['Results reviewed (raw)', d.pipeline.raw === null ? 'Not recorded' : String(d.pipeline.raw)],
      ['Relevant / validated results', `${d.pipeline.relevant} / ${d.pipeline.validated}`],
      ['Search queries run', log.length ? `${log.length} in ${plural(new Set(log.map(s => s.batch)).size, 'search run')}` : 'Not recorded'],
      ['Sources checked', coverage.length ? `${coverage.filter(c => c.status === 'checked').length} of ${coverage.length}` : 'Not recorded']
    ];
    const blocks: Block[] = [{ kind: 'kv', rows: metrics }];
    if (log.length) {
      blocks.push({ kind: 'sub', text: 'Search log' }, { kind: 'table', head: ['#', 'Time', 'Purpose', 'Query', 'Returned', 'Kept', 'Status'], widths: [9, 26, 32, 55, 17, 13, 22],
        rows: log.slice(0, 120).map(s => [String(s.run), fmtDate(s.at, true), clip(s.purpose, 60), clip(s.query, 120), String(s.returned), s.kept === null ? '—' : String(s.kept), s.status]) });
      if (log.length > 120) blocks.push({ kind: 'note', text: `${log.length - 120} more queries are in the case.` });
    }
    const events = allAuditEvents(inv);
    if (events.length) {
      blocks.push({ kind: 'sub', text: 'Audit trail' }, { kind: 'table', head: ['Time', 'Action', 'Object', 'By', 'Detail'], widths: [26, 32, 38, 24, 54],
        rows: events.slice(0, 80).map(e => [fmtDate(e.at, true), e.action, clip(e.object, 80), e.by, clip(e.detail, 160)]) });
      if (events.length > 80) blocks.push({ kind: 'note', text: `${events.length - 80} earlier audit events are in the case.` });
    }
    sections.push({ title: 'Metrics and audit', blocks });
  }

  const title = targetTitle(inv);
  return {
    title,
    subtitle: `${searchTypeLabel(inv)} investigation report`,
    generatedAt: now,
    cover: [
      ['Search type', searchTypeLabel(inv)],
      ['Search query', queryText(inv)],
      ['Investigation ID', inv.id],
      ['Investigation date', fmtDate(inv.createdAt, true) || NOT_FOUND],
      ['Prepared by', preparedBy],
      ['Report generated', fmtDate(now, true)]
    ],
    sections,
    fileName: `OSINT-Report-${title.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'case'}-${now.slice(0, 10)}.pdf`
  };
}
