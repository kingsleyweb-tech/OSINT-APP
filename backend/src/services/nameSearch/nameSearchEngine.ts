import type { ProgressCallback } from '../../types/progress';
import { OSINTQuery, NormalizedResultItem } from '../../types/search';
import { PLATFORM_REGISTRY } from '../search/platformRegistry';
import { SerpApiProvider, SerpCallResult, SerpEngine } from '../search/serpApiProvider';
import { resolveResultUrl, isRejection } from './urlResolution';
import { classifyUrl, PageKind, PAGE_KIND_LABELS, PROFILE_KINDS, ClassifiedPage } from './pageClassifier';
import {
  nameTokens, compareName, compareHandle, textHasFullName, parseTitle, extractAttributes,
  normalizeOrg, normalizeText, NameMatchLevel, ExtractedAttributes
} from './identityMatcher';

// ─── Types ────────────────────────────────────────────────────────────────────

/** The raw SerpApi fields kept for every hit so it is always possible to see why a result was used. */
export interface RawSerpEvidence {
  engine: SerpEngine;
  query: string;
  resultType: 'organic' | 'knowledge_graph_profile' | 'top_story' | 'youtube_channel' | 'youtube_video' | 'youtube_video_channel';
  position?: number;
  title?: string;
  link?: string;
  redirect_link?: string;
  displayed_link?: string;
  source?: string;
  snippet?: string;
  favicon?: string;
  thumbnail?: string;
  date?: string;
  extensions?: string[];
}

export interface ProfileEvidence {
  code: string;
  text: string;
}

export type ProfileMatchLabel = 'Verified Match' | 'Likely Match' | 'Possible Match';
export type LinkStatus = 'unchecked' | 'reachable' | 'unavailable' | 'unverifiable';

export interface DiscoveredProfile {
  id: string;
  /** "similar": the profile name only resembles the searched name (usually another person). */
  relation?: 'similar';
  platform: string;
  platformId: string;
  category: 'Social' | 'Professional' | 'Developer' | 'Video & Streaming';
  pageKind: PageKind;
  pageKindLabel: string;
  profileName?: string;
  username: string;
  /** Exact destination returned by the search engine (tracking params removed). This is what "View Profile" opens. */
  profileUrl: string;
  /** Kept equal to profileUrl for components that read `url`. */
  url: string;
  /** The link field exactly as SerpApi returned it. */
  originalUrl: string;
  /** Normalised key used for de-duplication only. */
  canonicalUrl: string;
  /** Page that supplied the evidence (differs from profileUrl only for channels taken from a YouTube video result). */
  sourceUrl: string;
  title: string;
  snippet: string;
  bio: string;
  thumbnail?: string;
  favicon?: string;
  source: string;
  sourceQuery: string;
  attributes: ExtractedAttributes;
  evidence: ProfileEvidence[];
  matchReason: string[];
  confidence: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  confidenceLabel: ProfileMatchLabel;
  isVerified: boolean;
  personId?: string;
  discoveredAt: string;
  lastCheckedAt?: string;
  linkStatus: LinkStatus;
  status: 'active' | 'previously_discovered';
  raw: RawSerpEvidence[];
}

export interface IdentityCluster {
  id: string;
  kind: 'distinct' | 'unlinked' | 'web_only';
  fullName: string;
  publicRole: string;
  location: string;
  avatarUrl?: string;
  summary: string;
  confidenceScore: number;
  confidenceLabel: 'Verified' | 'Strong evidence' | 'Possible match' | 'Mention only' | 'Uncertain';
  evidenceChecklist: Array<{ signal: string; matched: boolean }>;
  profiles: DiscoveredProfile[];
  webItems: NormalizedResultItem[];
}

export interface SerpCallAudit {
  engine: SerpEngine;
  query: string;
  purpose: string;
  status: 'ok' | 'cached' | 'error' | 'skipped';
  error?: string;
  rawResults: number;
}

export interface NameSearchOutput {
  profiles: DiscoveredProfile[];
  webItems: NormalizedResultItem[];
  identities: IdentityCluster[];
  searchCoverage: Array<{ provider: string; status: 'checked' | 'unavailable' | 'error'; count: number }>;
  auditTrail: SerpCallAudit[];
  rejected: Array<{ url: string; title: string; reason: string }>;
  stats: {
    platformsChecked: number;
    queriesExecuted: number;
    serpApiCallsBilled: number;
    serpApiCallsCached: number;
    pagesReviewed: number;
    rawResultsReviewed: number;
    potentialProfiles: number;
    profilesAccepted: number;
    exactMatches: number;
    strongMatches: number;
    possibleMatches: number;
    resultsAccepted: number;
    resultsRejected: number;
    quotaExhausted: boolean;
    errors: string[];
    searchCoveragePercent: number;
  };
}

// ─── Query plan ───────────────────────────────────────────────────────────────

interface PlannedCall {
  engine: SerpEngine;
  params: Record<string, string | number>;
  query: string;
  purpose: string;
  platformIds: string[];
}

function siteFilter(platformIds: string[]): string {
  const sites: string[] = [];
  platformIds.forEach(id => {
    const entry = PLATFORM_REGISTRY.find(p => p.id === id);
    entry?.domains.forEach(d => sites.push(`site:${d}`));
  });
  if (platformIds.includes('soc-x') && !sites.includes('site:twitter.com')) sites.push('site:twitter.com');
  return sites.length === 1 ? sites[0] : `(${sites.join(' OR ')})`;
}

/**
 * A small, fixed budget of SerpApi calls per name search (quick: 4, standard/deep: 8, +1 per context hint).
 * Platform groupings come from the platform registry.
 */
function buildPlan(name: string, query: OSINTQuery, depth: string): PlannedCall[] {
  const quoted = `"${name.replace(/"/g, '')}"`;
  const google = (platformIds: string[], purpose: string, extra = ''): PlannedCall => {
    const q = platformIds.length ? `${siteFilter(platformIds)} ${quoted}${extra}` : `${quoted}${extra}`;
    return { engine: 'google', params: { q, num: 10 }, query: q, purpose, platformIds };
  };

  const plan: PlannedCall[] = [google([], 'Broad web, knowledge panel and news')];

  if (depth === 'quick') {
    plan.push(google(['prof-linkedin'], 'LinkedIn profiles'));
    plan.push(google(['soc-facebook', 'soc-instagram'], 'Facebook & Instagram profiles'));
    plan.push(google(['soc-x', 'soc-tiktok', 'dev-github'], 'X, TikTok & GitHub profiles'));
  } else {
    plan.push(google(['prof-linkedin'], 'LinkedIn profiles'));
    plan.push(google(['soc-facebook'], 'Facebook profiles'));
    // Facebook holds the most public profile information; read a second page of its results.
    const fbMore = google(['soc-facebook'], 'Facebook profiles (page 2)');
    plan.push({ ...fbMore, params: { ...fbMore.params, start: 10 } });
    plan.push(google(['soc-instagram'], 'Instagram profiles'));
    plan.push(google(['soc-x'], 'X (Twitter) profiles'));
    plan.push(google(['soc-tiktok', 'soc-threads'], 'TikTok & Threads profiles'));
    plan.push({ engine: 'youtube', params: { search_query: name }, query: name, purpose: 'YouTube channels', platformIds: ['vid-youtube'] });
    plan.push(google(['dev-github', 'pub-medium', 'soc-reddit', 'dev-stackoverflow'], 'Developer & writing profiles'));
  }

  if (query.location) plan.push(google([], `Context: location "${query.location}"`, ` "${query.location.replace(/"/g, '')}"`));
  if (query.organization) plan.push(google([], `Context: organization "${query.organization}"`, ` "${query.organization.replace(/"/g, '')}"`));

  return plan;
}

// ─── Raw extraction ───────────────────────────────────────────────────────────

interface RawHit {
  raw: RawSerpEvidence;
  /** For channels derived from a YouTube video result: the video page that named the channel. */
  sourcePageUrl?: string;
  channelNameFromApi?: string;
}

function extractHits(call: PlannedCall, data: any): RawHit[] {
  const hits: RawHit[] = [];
  if (!data) return hits;
  const base = { engine: call.engine, query: call.query };

  if (call.engine === 'google' || call.engine === 'bing') {
    (data.organic_results || []).forEach((r: any) => {
      hits.push({
        raw: {
          ...base,
          resultType: 'organic',
          position: r.position,
          title: r.title,
          link: r.link,
          redirect_link: r.redirect_link,
          displayed_link: r.displayed_link,
          source: r.source,
          snippet: r.snippet,
          favicon: r.favicon,
          thumbnail: r.thumbnail,
          date: r.date,
          extensions: r.rich_snippet?.top?.extensions || r.rich_snippet?.bottom?.extensions
        }
      });
    });

    // Knowledge panel social links are explicit URLs Google associates with the entity.
    const kg = data.knowledge_graph;
    if (kg && Array.isArray(kg.profiles)) {
      kg.profiles.forEach((p: any) => {
        if (p?.link) {
          hits.push({
            raw: { ...base, resultType: 'knowledge_graph_profile', title: `${kg.title || ''} (${p.name || 'profile'})`, link: p.link, snippet: kg.description, source: 'Google knowledge panel' },
            channelNameFromApi: kg.title
          });
        }
      });
    }

    (data.top_stories || []).forEach((s: any, idx: number) => {
      if (s?.link) {
        hits.push({ raw: { ...base, resultType: 'top_story', position: idx + 1, title: s.title, link: s.link, source: s.source, date: s.date, thumbnail: s.thumbnail } });
      }
    });
  }

  if (call.engine === 'youtube') {
    (data.channel_results || []).forEach((c: any, idx: number) => {
      hits.push({
        raw: {
          ...base,
          resultType: 'youtube_channel',
          position: c.position_on_page || idx + 1,
          title: c.title,
          link: c.link,
          snippet: c.description,
          thumbnail: c.thumbnail,
          extensions: [c.handle, c.subscribers !== undefined ? `${c.subscribers} subscribers` : undefined].filter(Boolean)
        },
        channelNameFromApi: c.title
      });
    });
    (data.video_results || []).forEach((v: any, idx: number) => {
      hits.push({
        raw: { ...base, resultType: 'youtube_video', position: v.position_on_page || idx + 1, title: v.title, link: v.link, snippet: v.description, date: v.published_date, thumbnail: v.thumbnail?.static || v.thumbnail }
      });
      // The API names the uploading channel and gives its URL; that is reliable evidence for the channel URL.
      if (v.channel?.link) {
        hits.push({
          raw: { ...base, resultType: 'youtube_video_channel', position: v.position_on_page || idx + 1, title: v.channel.name, link: v.channel.link, snippet: `Uploaded the video "${v.title}"` },
          sourcePageUrl: v.link,
          channelNameFromApi: v.channel.name
        });
      }
    });
  }

  return hits;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

const LEVEL_TEXT: Record<NameMatchLevel, string> = {
  exact: 'is exactly',
  reordered: 'matches (different word order)',
  contains_full: 'contains the full name',
  similar: 'is spelled similarly to',
  partial: 'only partly matches',
  none: 'does not match'
};

const SOURCE_LABEL: Record<RawSerpEvidence['resultType'], string> = {
  organic: 'Google Search',
  knowledge_graph_profile: 'Google knowledge panel',
  top_story: 'Google Top Stories',
  youtube_channel: 'YouTube Search',
  youtube_video: 'YouTube Search',
  youtube_video_channel: 'YouTube Search (video uploader)'
};

function categoryFor(platformCategory: string): DiscoveredProfile['category'] {
  if (platformCategory === 'professional' || platformCategory === 'business' || platformCategory === 'academic') return 'Professional';
  if (platformCategory === 'developer') return 'Developer';
  if (platformCategory === 'video' || platformCategory === 'streaming' || platformCategory === 'music') return 'Video & Streaming';
  return 'Social';
}

interface Candidate {
  resolvedUrl: string;
  canonicalUrl: string;
  classified: ClassifiedPage;
  hits: RawHit[];
}

function scoreProfile(
  targetName: string,
  tokens: string[],
  query: OSINTQuery,
  cand: Candidate,
  nowIso: string
): { profile: DiscoveredProfile | null; rejectReason?: string } {
  const primary = cand.hits.find(h => h.raw.resultType === 'organic' || h.raw.resultType === 'youtube_channel') || cand.hits[0];
  const title = primary.raw.title || '';
  const snippet = primary.raw.snippet || '';
  const { nameCandidates, titleHandle } = parseTitle(title);
  if (primary.channelNameFromApi) nameCandidates.unshift(primary.channelNameFromApi);
  if (cand.classified.urlDisplayName) nameCandidates.push(cand.classified.urlDisplayName);

  const order: NameMatchLevel[] = ['exact', 'reordered', 'contains_full', 'similar', 'partial', 'none'];
  let best: { level: NameMatchLevel; text: string } = { level: 'none', text: '' };
  nameCandidates.forEach(nc => {
    const level = compareName(tokens, nc);
    if (order.indexOf(level) < order.indexOf(best.level)) best = { level, text: nc };
  });

  const handle = cand.classified.handle || titleHandle;
  const handleLevel = compareHandle(tokens, handle);
  const allSnippets = cand.hits.map(h => h.raw.snippet || '').join(' ');
  const snippetFull = textHasFullName(tokens, allSnippets);
  const strongName = best.level === 'exact' || best.level === 'reordered' || best.level === 'contains_full';

  // A profile must carry the searched name itself: as its display name, or as its username
  // together with the full name in the result text. Mentions inside someone else's profile do not count.
  const similarName = best.level === 'similar';
  if (!strongName && !similarName && !(handleLevel === 'full' && snippetFull)) {
    return {
      profile: null,
      rejectReason: best.level === 'partial'
        ? `Profile name "${best.text}" only partly matches "${targetName}"`
        : `Profile name does not match "${targetName}" (name only mentioned in the text, if at all)`
    };
  }

  const evidence: ProfileEvidence[] = [];
  let score = 0;
  const platform = cand.classified.platformName;

  if (strongName) {
    score += best.level === 'exact' ? 40 : best.level === 'reordered' ? 36 : 30;
    evidence.push({ code: 'name', text: `Profile name on ${platform} ${LEVEL_TEXT[best.level]} "${best.text}"` });
  }
  if (similarName) {
    score += 20;
    evidence.push({ code: 'similar_name', text: `Profile name "${best.text}" is spelled similarly to "${targetName}" but not the same: likely another person` });
  }
  if (handleLevel === 'full') {
    score += 15;
    evidence.push({ code: 'handle', text: `Username @${handle} matches the name` });
  } else if (handleLevel === 'initials') {
    score += 5;
    evidence.push({ code: 'handle_initials', text: `Username @${handle} resembles the name (initial + surname)` });
  }
  if (snippetFull) {
    score += 10;
    evidence.push({ code: 'snippet', text: 'The search result text also contains the full name' });
  }

  const fullText = `${title} ${allSnippets}`;
  if (query.location && normalizeText(fullText).includes(normalizeText(query.location))) {
    score += 15;
    evidence.push({ code: 'location', text: `Location "${query.location}" appears in the result` });
  }
  if (query.organization && normalizeText(fullText).includes(normalizeText(query.organization))) {
    score += 15;
    evidence.push({ code: 'organization', text: `Organization "${query.organization}" appears in the result` });
  }
  if (cand.hits.some(h => h.raw.resultType === 'knowledge_graph_profile')) {
    score += 25;
    evidence.push({ code: 'knowledge_panel', text: `Listed as a profile in Google's knowledge panel for "${targetName}"` });
  }
  const distinctQueries = new Set(cand.hits.map(h => `${h.raw.engine}:${h.raw.query}`));
  if (distinctQueries.size >= 2) {
    score += 5;
    evidence.push({ code: 'multi_query', text: `Returned by ${distinctQueries.size} separate searches` });
  }

  const attributes = extractAttributes(cand.classified.platformId, title, snippet, primary.raw.extensions);
  const displayName = strongName || similarName ? best.text : undefined;
  const sourceHit = cand.hits.find(h => h.sourcePageUrl);

  const profile: DiscoveredProfile = {
    id: `prof-${Buffer.from(cand.canonicalUrl).toString('base64url').slice(-16)}`,
    platform,
    platformId: cand.classified.platformId || 'web',
    category: categoryFor(cand.classified.platformCategory),
    pageKind: cand.classified.pageKind,
    pageKindLabel: PAGE_KIND_LABELS[cand.classified.pageKind],
    profileName: displayName,
    username: handle || '',
    profileUrl: cand.resolvedUrl,
    url: cand.resolvedUrl,
    originalUrl: primary.raw.link || cand.resolvedUrl,
    canonicalUrl: cand.canonicalUrl,
    sourceUrl: sourceHit?.sourcePageUrl || cand.resolvedUrl,
    title,
    snippet,
    bio: snippet,
    thumbnail: primary.raw.thumbnail,
    favicon: primary.raw.favicon,
    source: `${SOURCE_LABEL[primary.raw.resultType]} · ${platform}`,
    sourceQuery: primary.raw.query,
    attributes,
    evidence,
    matchReason: [],
    confidence: 0,
    confidenceLevel: 'Low',
    confidenceLabel: 'Possible Match',
    isVerified: false,
    discoveredAt: nowIso,
    linkStatus: 'unchecked',
    status: 'active',
    raw: cand.hits.map(h => h.raw)
  };
  finalizeScore(profile, score, strongName && best.level !== 'contains_full');
  if (similarName) {
    // Similar name ≠ same person: kept apart from the subject at low confidence.
    profile.relation = 'similar';
    profile.confidence = Math.min(profile.confidence, 40);
    profile.confidenceLabel = 'Possible Match';
    profile.confidenceLevel = 'Low';
    profile.isVerified = false;
  }
  return { profile };
}

function finalizeScore(p: DiscoveredProfile, score: number, exactOrReordered: boolean): void {
  const corroborated = p.evidence.some(e => ['knowledge_panel', 'cross_source', 'api_confirmed'].includes(e.code));
  const label: ProfileMatchLabel = score >= 75 && corroborated && exactOrReordered
    ? 'Verified Match'
    : score >= 55 ? 'Likely Match' : 'Possible Match';
  p.confidence = Math.min(99, score);
  p.confidenceLabel = label;
  p.confidenceLevel = label === 'Verified Match' ? 'High' : label === 'Likely Match' ? 'Medium' : 'Low';
  p.isVerified = label === 'Verified Match';
  p.matchReason = p.evidence.map(e => e.text);
}

// ─── Profile confirmation (SerpApi facebook_profile / instagram_profile) ─────

const FB_FACT_PATTERNS: Array<{ re: RegExp; attr: 'organization' | 'education' | 'location' }> = [
  { re: /^(?:works?|worked) at\s+(.+)$/i, attr: 'organization' },
  { re: /^(?:studies|studied|went to|attended)\s+(?:at\s+)?(.+)$/i, attr: 'education' },
  { re: /^(?:lives in|from)\s+(.+)$/i, attr: 'location' }
];

async function confirmProfiles(
  serp: SerpApiProvider,
  targetName: string,
  tokens: string[],
  profiles: DiscoveredProfile[],
  maxCalls: number,
  auditTrail: SerpCallAudit[],
  onStep?: (status: 'done' | 'failed') => void
): Promise<{ calls: SerpCallResult[]; rejectedIds: string[]; rejected: NameSearchOutput['rejected'] }> {
  const out = { calls: [] as SerpCallResult[], rejectedIds: [] as string[], rejected: [] as NameSearchOutput['rejected'] };

  // Highest-scoring candidate per platform that exposes a username in its URL.
  const targets: Array<{ profile: DiscoveredProfile; engine: SerpEngine }> = [];
  (['soc-facebook', 'soc-instagram'] as const).forEach(pid => {
    const ranked = profiles.filter(p => p.platformId === pid && p.username).sort((a, b) => b.confidence - a.confidence);
    ranked.slice(0, pid === 'soc-facebook' ? 2 : 1)
      .forEach(best => targets.push({ profile: best, engine: pid === 'soc-facebook' ? 'facebook_profile' : 'instagram_profile' }));
  });

  const picked = targets.slice(0, maxCalls);
  // Profile checks are independent; run them together.
  const responses = await Promise.all(picked.map(t => serp.request(t.engine, { profile_id: t.profile.username })));
  for (let i = 0; i < picked.length; i++) {
    const { profile, engine } = picked[i];
    const res = responses[i];
    onStep?.(res.data ? 'done' : 'failed');
    out.calls.push(res);
    const data = res.data?.profile_results;
    auditTrail.push({
      engine,
      query: profile.username,
      purpose: `Confirm ${profile.platform} profile @${profile.username}`,
      status: res.data ? (res.fromCache ? 'cached' : 'ok') : 'error',
      error: res.error || undefined,
      rawResults: data ? 1 : 0
    });
    if (!data) continue;

    const apiName: string = data.name || data.full_name || '';
    const level = compareName(tokens, apiName);
    if (level === 'exact' || level === 'reordered' || level === 'contains_full') {
      profile.evidence.push({ code: 'api_confirmed', text: `SerpApi ${profile.platform} Profile API returns the account name "${apiName}"` });
      profile.profileName = profile.profileName || apiName;
      if (!profile.thumbnail) profile.thumbnail = data.profile_picture || data.serpapi_profile_pic_url || data.profile_pic_url;

      if (engine === 'facebook_profile' && Array.isArray(data.about_details)) {
        data.about_details.forEach((section: any) => (section.items || []).forEach((item: any) => {
          const text = String(item?.title || '').trim();
          const hit = FB_FACT_PATTERNS.find(f => f.re.test(text));
          if (hit && !profile.attributes[hit.attr]) profile.attributes[hit.attr] = text.replace(hit.re, '$1').trim();
        }));
      }
      if (engine === 'instagram_profile') {
        if (data.biography) profile.bio = data.biography;
        const links: string[] = [data.external_url, ...(data.bio_links || []).map((l: any) => l?.url)].filter(Boolean);
        links.forEach(link => {
          const linked = profiles.find(o => o !== profile && (o.profileUrl === link || o.canonicalUrl === resolveCanonical(link)));
          if (linked) {
            const text = `The Instagram bio of @${profile.username} links to this ${linked.platform} profile`;
            linked.evidence.push({ code: 'cross_source', text });
            profile.evidence.push({ code: 'cross_source', text: `Instagram bio links to ${linked.platform} profile ${linked.profileUrl}` });
            finalizeScore(linked, linked.confidence + 20, true);
          }
        });
        if (data.is_private) profile.evidence.push({ code: 'private', text: 'The account is private; only its public header is visible' });
      }
      finalizeScore(profile, profile.confidence + 25, level !== 'contains_full');
    } else if (apiName) {
      out.rejectedIds.push(profile.id);
      out.rejected.push({ url: profile.profileUrl, title: profile.title, reason: `SerpApi ${profile.platform} Profile API reports this account's name as "${apiName}", not "${targetName}"` });
    }
  }
  return out;
}

function resolveCanonical(link: string): string | null {
  const r = resolveResultUrl({ link });
  return isRejection(r) ? null : r.canonicalUrl;
}

/** Path prefix of an account on its platform, e.g. https://www.facebook.com/uf.spartan/ */
function accountPrefix(p: DiscoveredProfile): string | null {
  if (!p.username || p.pageKind !== 'person_profile' && p.pageKind !== 'channel') return null;
  try {
    const u = new URL(p.canonicalUrl);
    return `${u.host}${u.pathname.replace(/\/+$/, '')}/`.toLowerCase();
  } catch {
    return null;
  }
}

function linkOwnContent(profiles: DiscoveredProfile[], webItems: NormalizedResultItem[]): void {
  profiles.forEach(p => {
    const prefix = accountPrefix(p);
    if (!prefix) return;
    const own = webItems.filter(w => {
      try {
        const u = new URL(w.metadata?.canonicalUrl || w.url);
        return `${u.host}${u.pathname}`.toLowerCase().startsWith(prefix);
      } catch {
        return false;
      }
    });
    if (own.length === 0) return;
    own.forEach(w => (w.metadata = { ...w.metadata, ownerProfileUrl: p.profileUrl }));
    p.evidence.push({ code: 'own_content', text: `${own.length} post(s) published by this account also appear in the results` });
    finalizeScore(p, p.confidence + 10, p.evidence.some(e => e.code === 'name' && !e.text.includes('contains the full name')));
  });
}

// ─── Identity clustering ──────────────────────────────────────────────────────

function handleKey(p: DiscoveredProfile): string | null {
  const h = (p.username || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return h.length >= 4 ? `h:${h}` : null;
}

function orgKey(p: DiscoveredProfile): string | null {
  const o = normalizeOrg(p.attributes.organization);
  return o.length >= 3 ? `o:${o}` : null;
}

function describeProfile(p: DiscoveredProfile, name: string): string {
  const kind = p.pageKind === 'channel' ? 'channel' : 'profile';
  const parts: string[] = [];
  if (p.attributes.headline) parts.push(`headline "${p.attributes.headline}"`);
  if (p.attributes.organization) parts.push(`experience at ${p.attributes.organization}`);
  if (p.attributes.education) parts.push(`education at ${p.attributes.education}`);
  if (p.attributes.location) parts.push(`location "${p.attributes.location}"`);
  const who = p.profileName || name;
  return parts.length > 0
    ? `A ${p.platform} ${kind} for ${who} lists ${parts.join(', ')}.`
    : `A ${p.platform} ${kind} named ${who}${p.username ? ` (@${p.username})` : ''} was found; the result gives no further details.`;
}

function neutralLabel(best?: DiscoveredProfile): IdentityCluster['confidenceLabel'] {
  if (!best) return 'Mention only';
  if (best.confidenceLabel === 'Verified Match') return 'Strong evidence';
  if (best.confidenceLabel === 'Likely Match') return 'Possible match';
  return 'Uncertain';
}

function clusterIdentities(name: string, profiles: DiscoveredProfile[], webItems: NormalizedResultItem[]): IdentityCluster[] {
  // Union-find over shared usernames and shared organizations.
  const parent = profiles.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const keyOwner = new Map<string, number>();
  const linkReasons = new Map<DiscoveredProfile, Set<string>>();
  profiles.forEach((p, i) => {
    [handleKey(p), orgKey(p)].filter(Boolean).forEach(k => {
      const owner = keyOwner.get(k!);
      if (owner === undefined) {
        keyOwner.set(k!, i);
        return;
      }
      parent[find(i)] = find(owner);
      const reason = k!.startsWith('h:') ? `the username @${p.username}` : `the organization "${p.attributes.organization}"`;
      [p, profiles[owner]].forEach(x => {
        if (!linkReasons.has(x)) linkReasons.set(x, new Set());
        linkReasons.get(x)!.add(reason);
      });
    });
  });

  const groups = new Map<number, DiscoveredProfile[]>();
  profiles.forEach((p, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(p);
  });

  const hasFacts = (ps: DiscoveredProfile[]) => ps.some(p => p.attributes.organization || p.attributes.headline || p.attributes.location || p.attributes.education);
  const distinct: DiscoveredProfile[][] = [];
  const unlinked: DiscoveredProfile[] = [];
  groups.forEach(ps => (ps.length >= 2 || hasFacts(ps) ? distinct.push(ps) : unlinked.push(...ps)));

  distinct.sort((a, b) => Math.max(...b.map(p => p.confidence)) - Math.max(...a.map(p => p.confidence)));
  const MAX_DISTINCT = 5;
  distinct.splice(MAX_DISTINCT).forEach(ps => unlinked.push(...ps));

  // Cross-platform corroboration: the same username on two platforms inside one cluster.
  distinct.forEach(ps => {
    ps.forEach(p => {
      const hk = handleKey(p);
      if (!hk) return;
      const others = ps.filter(o => o !== p && handleKey(o) === hk && o.platform !== p.platform);
      if (others.length > 0 && !p.evidence.some(e => e.code === 'cross_source')) {
        p.evidence.push({ code: 'cross_source', text: `Same username @${p.username} also found on ${Array.from(new Set(others.map(o => o.platform))).join(', ')}` });
        const base = p.confidence;
        finalizeScore(p, base + 20, p.evidence.some(e => e.code === 'name' && !e.text.includes('contains the full name')));
      }
    });
  });

  const linkWeb = (ps: DiscoveredProfile[]) => {
    const orgs = ps.map(p => normalizeOrg(p.attributes.organization)).filter(o => o.length >= 4);
    const handles = ps.map(p => (p.username || '').toLowerCase()).filter(h => h.length >= 4);
    const urls = new Set(ps.map(p => p.canonicalUrl));
    return webItems.filter(w => {
      const text = normalizeText(`${w.title} ${w.description}`);
      const raw = `${w.title} ${w.description}`.toLowerCase();
      const owner = w.metadata?.ownerProfileUrl;
      return orgs.some(o => text.includes(o)) || handles.some(h => raw.includes(`@${h}`)) || urls.has(w.metadata?.canonicalUrl) || ps.some(p => p.profileUrl === owner);
    });
  };

  const linkedWebIds = new Set<string>();
  const identities: IdentityCluster[] = distinct.map((ps, idx) => {
    ps.sort((a, b) => b.confidence - a.confidence);
    const best = ps[0];
    const linked = linkWeb(ps);
    linked.forEach(w => linkedWebIds.add(w.id));
    const platforms = Array.from(new Set(ps.map(p => p.platform)));
    const facts = ps.map(p => describeProfile(p, name));
    const reasons = Array.from(new Set(ps.flatMap(p => Array.from(linkReasons.get(p) || []))));
    const linkNote = ps.length > 1 && reasons.length > 0
      ? ` These ${ps.length} profiles are grouped because they share ${reasons.join(' and ')}.`
      : '';
    const org = ps.find(p => p.attributes.organization)?.attributes.organization;
    const loc = ps.find(p => p.attributes.location)?.attributes.location;
    return {
      id: `person-${idx + 1}`,
      kind: 'distinct' as const,
      fullName: best.profileName || name,
      publicRole: ps.find(p => p.attributes.headline)?.attributes.headline || 'Not stated in sources',
      location: loc || 'Not specified',
      avatarUrl: ps.find(p => p.thumbnail)?.thumbnail,
      summary: `${Array.from(new Set(facts)).slice(0, 2).join(' ')}${linkNote}`,
      confidenceScore: best.confidence,
      confidenceLabel: neutralLabel(best),
      evidenceChecklist: [
        { signal: 'Profile name matches the searched name', matched: ps.some(p => p.evidence.some(e => e.code === 'name')) },
        { signal: 'Username matches the name', matched: ps.some(p => p.evidence.some(e => e.code === 'handle')) },
        { signal: `Organization listed${org ? ` (${org})` : ''}`, matched: Boolean(org) },
        { signal: `Location listed${loc ? ` (${loc})` : ''}`, matched: Boolean(loc) },
        { signal: `Linked across platforms (${platforms.join(', ')})`, matched: platforms.length > 1 }
      ],
      profiles: ps,
      webItems: linked
    };
  });

  const mentions = webItems.filter(w => !linkedWebIds.has(w.id));
  mentions.forEach(w => {
    w.metadata = { ...w.metadata, identityLink: 'name_mention' };
  });
  identities.forEach(i => {
    i.webItems.forEach(w => (w.metadata = { ...w.metadata, identityLink: 'linked' }));
    i.webItems = [...i.webItems, ...mentions];
  });

  if (unlinked.length > 0 || identities.length === 0) {
    unlinked.sort((a, b) => b.confidence - a.confidence);
    const platforms = Array.from(new Set(unlinked.map(p => p.platform)));
    const summary = unlinked.length === 0
      ? `No profile page could be attributed to "${name}". ${mentions.length} web result${mentions.length === 1 ? '' : 's'} mention the full name.`
      : unlinked.length === 1
        ? describeProfile(unlinked[0], name)
        : `${unlinked.length} profiles on ${platforms.join(', ')} use the name "${name}" but share no username or organization with each other, so they may belong to different people.`;
    identities.push({
      id: identities.length === 0 ? 'person-1' : 'person-unlinked',
      kind: unlinked.length === 0 ? 'web_only' : 'unlinked',
      fullName: identities.length === 0 && unlinked.length === 1 ? (unlinked[0].profileName || name) : name,
      publicRole: 'Not stated in sources',
      location: 'Not specified',
      avatarUrl: unlinked.find(p => p.thumbnail)?.thumbnail,
      summary,
      confidenceScore: unlinked[0]?.confidence || 0,
      // A group of unlinked accounts is not an established person, whatever its strongest member scores.
      confidenceLabel: unlinked.length === 0 ? 'Mention only' : unlinked.length > 1 ? 'Uncertain' : neutralLabel(unlinked[0]),
      evidenceChecklist: [
        { signal: 'Profile name matches the searched name', matched: unlinked.length > 0 },
        { signal: 'Username matches the name', matched: unlinked.some(p => p.evidence.some(e => e.code === 'handle')) },
        { signal: 'Organization listed', matched: false },
        { signal: 'Location listed', matched: false },
        { signal: 'Linked across platforms', matched: false }
      ],
      profiles: unlinked,
      webItems: mentions
    });
  }

  identities.forEach(i => i.profiles.forEach(p => (p.personId = i.id)));
  return identities;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class NameSearchEngine {
  public static async execute(query: OSINTQuery, options: { searchDepth?: string; onProgress?: ProgressCallback } = {}): Promise<NameSearchOutput> {
    const progress = options.onProgress;
    const targetName = (query.name || query.queryValue || '').trim().replace(/^["']|["']$/g, '');
    const tokens = nameTokens(targetName);
    const depth = options.searchDepth || 'deep';
    const nowIso = new Date().toISOString();
    const serp = new SerpApiProvider();

    const plan = buildPlan(targetName, query, depth);
    console.log(`[NameSearchEngine] "${targetName}" — ${plan.length} planned SerpApi calls (${depth})`);

    progress?.({ type: 'plan', steps: [
      ...plan.map((c, i) => ({ id: `q${i}`, label: c.purpose })),
      { id: 'confirm', label: 'Facebook & Instagram profile checks' }
    ] });
    const results: SerpCallResult[] = await Promise.all(plan.map(async (c, i) => {
      const r = await serp.request(c.engine, c.params);
      const n = extractHits(c, r.data).length;
      progress?.({ type: 'step', id: `q${i}`, status: !r.data ? 'failed' : n === 0 ? 'empty' : r.fromCache ? 'cached' : 'done', count: n, note: !r.data ? (r.error || 'Failed') : `${n} result${n === 1 ? '' : 's'}` });
      return r;
    }));

    // Bing fallback for the broad query only, and only when Google failed for a reason other than quota.
    const broad = results[0];
    if (!broad.data && !broad.quotaExhausted) {
      plan.push({ engine: 'bing', params: { q: plan[0].query }, query: plan[0].query, purpose: 'Broad web (Bing fallback)', platformIds: [] });
      results.push(await serp.request('bing', { q: plan[0].query }));
    }

    const auditTrail: SerpCallAudit[] = [];
    const errors: string[] = [];
    const allHits: RawHit[] = [];
    plan.forEach((call, i) => {
      const r = results[i];
      const hits = extractHits(call, r.data);
      allHits.push(...hits);
      auditTrail.push({
        engine: call.engine,
        query: call.query,
        purpose: call.purpose,
        status: r.data ? (r.fromCache ? 'cached' : 'ok') : 'error',
        error: r.error || undefined,
        rawResults: hits.length
      });
      if (!r.data && r.error) errors.push(`${call.purpose}: ${r.error}`);
    });
    const quotaExhausted = results.some(r => r.quotaExhausted);

    // Resolve, classify and merge hits by canonical URL.
    const rejected: NameSearchOutput['rejected'] = [];
    const candidates = new Map<string, Candidate>();
    allHits.forEach(hit => {
      const resolved = resolveResultUrl(hit.raw);
      if (isRejection(resolved)) {
        rejected.push({ url: hit.raw.link || '', title: hit.raw.title || '', reason: resolved.reason });
        return;
      }
      const classified = classifyUrl(resolved.url);
      // Channel tab pages (/@handle/videos, /channel/ID/about) are the same channel as its root page.
      const key = classified.pageKind === 'channel'
        ? resolved.canonicalUrl.replace(/\/(videos|featured|about|shorts|streams|playlists|community|podcasts)$/i, '')
        : resolved.canonicalUrl;
      const existing = candidates.get(key);
      if (existing) {
        existing.hits.push(hit);
        // Prefer the shortest returned URL (the channel root) as the one to open; both were returned by the API.
        if (resolved.url.length < existing.resolvedUrl.length) {
          existing.resolvedUrl = resolved.url;
          existing.hits.unshift(existing.hits.pop()!);
        }
      } else {
        candidates.set(key, { resolvedUrl: resolved.url, canonicalUrl: key, classified, hits: [hit] });
      }
    });

    const profiles: DiscoveredProfile[] = [];
    const webItems: NormalizedResultItem[] = [];
    let potentialProfiles = 0;

    candidates.forEach(cand => {
      const kind = cand.classified.pageKind;
      const primary = cand.hits[0].raw;

      if (PROFILE_KINDS.has(kind)) {
        potentialProfiles++;
        const { profile, rejectReason } = scoreProfile(targetName, tokens, query, cand, nowIso);
        if (profile) profiles.push(profile);
        else rejected.push({ url: cand.resolvedUrl, title: primary.title || '', reason: rejectReason || 'Profile rejected' });
        return;
      }

      if (kind === 'search_page' || kind === 'platform_page' || kind === 'unknown') {
        rejected.push({ url: cand.resolvedUrl, title: primary.title || '', reason: `Not a profile or content page (${PAGE_KIND_LABELS[kind]})` });
        return;
      }

      // Web / news / posts / videos: keep only when the full name (not one word of it) appears.
      const text = cand.hits.map(h => `${h.raw.title || ''} ${h.raw.snippet || ''}`).join(' ');
      if (!textHasFullName(tokens, text)) {
        rejected.push({ url: cand.resolvedUrl, title: primary.title || '', reason: `Full name "${targetName}" does not appear in the result` });
        return;
      }

      const isNews = cand.hits.some(h => h.raw.resultType === 'top_story') || kind === 'article';
      const sourceType = kind === 'video' ? 'Video & Streaming' : cand.classified.host.endsWith('wikipedia.org') ? 'Knowledge & Wikipedia' : 'Websites & News';
      webItems.push({
        id: `web-${Buffer.from(cand.canonicalUrl).toString('base64url').slice(-16)}`,
        source: primary.source || (cand.classified.platformId ? cand.classified.platformName : cand.classified.host),
        sourceType,
        title: primary.title || cand.classified.host,
        description: primary.snippet || '',
        url: cand.resolvedUrl,
        possibleName: targetName,
        discoveredAt: nowIso,
        confidence: 60,
        confidenceLevel: 'Medium',
        metadata: {
          canonicalUrl: cand.canonicalUrl,
          platform: cand.classified.platformName,
          domain: cand.classified.host,
          itemType: isNews ? 'news' : kind,
          pageKind: kind,
          pageKindLabel: isNews && kind !== 'article'
            ? 'News'
            : (kind === 'post' || kind === 'video' || kind === 'group') && !textHasFullName(tokens, primary.title || '')
              ? `Mention in a ${kind === 'video' ? 'video' : 'post'}`
              : PAGE_KIND_LABELS[kind],
          date: cand.hits.find(h => h.raw.date)?.raw.date,
          foundVia: SOURCE_LABEL[primary.resultType],
          thumbnail: cand.hits.find(h => typeof h.raw.thumbnail === 'string' && /^https?:/.test(h.raw.thumbnail))?.raw.thumbnail,
          raw: cand.hits.map(h => h.raw)
        }
      });
    });

    // Confirmation stage: ask SerpApi's profile endpoints about the top Facebook/Instagram candidates.
    const confirmCalls = depth === 'deep' ? 3 : depth === 'standard' ? 1 : 0;
    if (confirmCalls > 0 && !quotaExhausted) {
      let checked = 0;
      const confirmed = await confirmProfiles(serp, targetName, tokens, profiles, confirmCalls, auditTrail, () => { checked++; });
      progress?.({ type: 'step', id: 'confirm', status: confirmed.calls.length ? 'done' : 'empty', count: checked, note: confirmed.calls.length ? `${checked} profile${checked === 1 ? '' : 's'} checked` : 'No Facebook/Instagram accounts to check' });
      confirmed.rejected.forEach(r => rejected.push(r));
      confirmed.rejectedIds.forEach(id => {
        const idx = profiles.findIndex(p => p.id === id);
        if (idx >= 0) profiles.splice(idx, 1);
      });
      results.push(...confirmed.calls);
    }

    if (!(confirmCalls > 0 && !quotaExhausted)) progress?.({ type: 'step', id: 'confirm', status: 'empty', note: 'Skipped' });

    linkOwnContent(profiles, webItems);
    profiles.sort((a, b) => b.confidence - a.confidence);
    // Similar-name profiles are other people: not clustered into anyone, listed alongside for checking.
    const similarProfiles = profiles.filter(p => p.relation === 'similar');
    const identities = clusterIdentities(targetName, profiles.filter(p => p.relation !== 'similar'), webItems);
    identities.forEach(i => { i.profiles = [...i.profiles, ...similarProfiles]; });
    profiles.sort((a, b) => b.confidence - a.confidence);

    const platformsChecked = new Set<string>();
    plan.forEach(c => c.platformIds.forEach(id => platformsChecked.add(id)));
    const searchCoverage = plan.map((call, i) => ({
      provider: call.purpose,
      status: (results[i]?.data ? 'checked' : results[i]?.quotaExhausted ? 'unavailable' : 'error') as 'checked' | 'unavailable' | 'error',
      count: call.platformIds.length
        ? profiles.filter(p => call.platformIds.includes(p.platformId)).length
        : webItems.filter(w => (w.metadata?.raw || []).some((r: RawSerpEvidence) => r.query === call.query)).length
    }));

    const stats: NameSearchOutput['stats'] = {
      platformsChecked: platformsChecked.size,
      queriesExecuted: results.length,
      serpApiCallsBilled: results.filter(r => r.data && !r.fromCache).length,
      serpApiCallsCached: results.filter(r => r.fromCache).length,
      pagesReviewed: results.filter(r => r.data).length,
      rawResultsReviewed: allHits.length,
      potentialProfiles,
      profilesAccepted: profiles.length,
      exactMatches: profiles.filter(p => p.confidenceLabel === 'Verified Match').length,
      strongMatches: profiles.filter(p => p.confidenceLabel === 'Likely Match').length,
      possibleMatches: profiles.filter(p => p.confidenceLabel === 'Possible Match').length,
      resultsAccepted: profiles.length + webItems.length,
      resultsRejected: rejected.length,
      quotaExhausted,
      errors,
      searchCoveragePercent: Math.round((results.slice(0, plan.length).filter(r => r.data).length / plan.length) * 100)
    };

    console.log(`[NameSearchEngine] "${targetName}" — raw hits ${allHits.length}, profiles ${profiles.length}, web ${webItems.length}, rejected ${rejected.length}, billed ${stats.serpApiCallsBilled}, cached ${stats.serpApiCallsCached}${quotaExhausted ? ', QUOTA EXHAUSTED' : ''}`);

    return { profiles, webItems, identities, searchCoverage, auditTrail, rejected, stats };
  }
}
