import { SerpApiProvider, type SerpCallResult } from '../search/serpApiProvider';
import { TREND_WINDOWS, trendCalls, type EngineCall } from '../explore/engineCatalog';
import { normalizeEngine, parseDate, twitterResults, type Draft } from '../explore/normalize';
import { withTimeout } from '../explore/exploreService';
import { scoreText, MIN_SCORE } from '../explore/relevance';
import { fromDates, fromGoogleStart, firstKnown } from './direction';
import {
  PLATFORM_META, cleanResults, dateSpan, hashtagsIn, headlineTopic, itemId, toEvidence, topicKey
} from './normalize';
import type { SourceReport, SourceStatus, TrendItem, TrendSource, TrendWindow } from './types';

/**
 * One adapter per platform. Each runs its own SerpApi calls (built in engineCatalog.trendCalls) and returns
 * its status and items; a failing platform never fails the others.
 */

const provider = new SerpApiProvider();
const CALL_TIMEOUT_MS = 45_000;
/** Fast-moving sources are re-fetched after 30 minutes; the rest are cached for 2 hours. */
const TTL_HOURS: Record<TrendSource, number> = { google: 0.5, news: 0.5, x: 0.5, youtube: 2, reddit: 2, tiktok: 2, facebook: 2, instagram: 2 };

export interface AdapterContext { window: TrendWindow; country?: string; language?: string; now: number }

export interface AdapterResult { report: SourceReport; items: TrendItem[]; /** Google Trends extras for snapshots. */ ranked?: Array<{ item: TrendItem; active: boolean }> }

async function runCalls(platform: TrendSource, calls: EngineCall[]): Promise<SerpCallResult[]> {
  return Promise.all(calls.map(c => withTimeout(provider.request(c.engine, c.params, { ttlHours: TTL_HOURS[platform] }), c, CALL_TIMEOUT_MS)));
}

function statusOf(results: SerpCallResult[], items: number): { status: SourceStatus; error?: string } {
  if (items > 0) return { status: 'ok' };
  if (results.some(r => r.quotaExhausted)) return { status: 'quota', error: 'The search quota is used up.' };
  const failed = results.filter(r => !r.data);
  if (failed.length && failed.length === results.length) {
    const err = failed[0].error || 'Failed';
    if (/timed out/i.test(err)) return { status: 'timeout', error: 'The source did not answer in time.' };
    if (/429|rate|too many/i.test(err)) return { status: 'rate_limited', error: 'Rate limited by the source.' };
    return { status: 'unavailable', error: 'Temporarily unavailable.' };
  }
  return { status: 'empty' };
}

function report(platform: TrendSource, calls: EngineCall[], results: SerpCallResult[], items: number, extra: Partial<SourceReport> = {}): SourceReport {
  const m = PLATFORM_META[platform];
  const st = statusOf(results, items);
  return {
    platform, label: m.name, signalKind: m.signalKind, ...st, items,
    searchesUsed: results.filter(r => r.data && !r.fromCache).length,
    fromCache: results.length > 0 && results.every(r => r.fromCache),
    queries: calls.map(c => String(c.params.q || c.params.search_query || c.label)),
    ...extra
  };
}

const regionLabel = (country?: string) => (country ? country.toUpperCase() : 'Worldwide');

/** Google Trends "trending now": Google's own list, with its volume, increase, start time and categories. */
export async function googleTrending(ctx: AdapterContext): Promise<AdapterResult> {
  const calls = trendCalls('google', undefined, ctx);
  if (!calls.length) {
    return {
      items: [],
      report: { ...report('google', [], [], 0), status: 'unavailable', error: 'Not available worldwide — select a country.' }
    };
  }
  const results = await runCalls('google', calls);
  const w = TREND_WINDOWS[ctx.window];
  const meta = PLATFORM_META.google;
  const ranked: Array<{ item: TrendItem; active: boolean }> = [];
  let outside = 0;
  const list: any[] = Array.isArray(results[0]?.data?.trending_searches) ? results[0].data.trending_searches : [];
  list.forEach(t => {
    const query = String(t.query || '').trim();
    if (!query) return;
    const startedAt = t.start_timestamp ? new Date(Number(t.start_timestamp) * 1000).toISOString() : undefined;
    const active = Boolean(t.active);
    // Live = still active; short windows keep trends that started inside them.
    if (ctx.window === 'live' && !active) return;
    if (ctx.window !== 'live' && w.ms < w.hours * 3600_000 && startedAt && ctx.now - Date.parse(startedAt) > w.ms) { outside += 1; return; }
    const dir = firstKnown(fromGoogleStart(active, startedAt, ctx.now));
    const categories = (t.categories || []).map((c: any) => String(c?.name || '')).filter(Boolean);
    const item: TrendItem = {
      id: itemId('google', ctx.country || '', query), topic: query, key: topicKey(query), platform: 'google',
      signalKind: meta.signalKind, sourceLabel: meta.sourceLabel, query: '', observedAt: new Date(ctx.now).toISOString(),
      ...(startedAt ? { firstSeenAt: startedAt } : {}),
      region: regionLabel(ctx.country), ...(categories[0] ? { category: categories[0] } : {}),
      metrics: {
        ...(Number(t.search_volume) > 0 ? { searchVolume: Number(t.search_volume) } : {}),
        ...(Number(t.increase_percentage) > 0 ? { increasePct: Number(t.increase_percentage) } : {})
      },
      direction: dir.direction, directionBasis: dir.basis,
      relatedKeywords: (t.trend_breakdown || []).map((x: unknown) => String(x)).filter((x: string) => x && x.toLowerCase() !== query.toLowerCase()).slice(0, 8),
      hashtags: [],
      // Google's own page for the term (the list itself has no article links).
      evidence: [{
        title: `Google Trends: ${query}`, source: 'Google Trends',
        url: `https://trends.google.com/trends/explore?${new URLSearchParams({ q: query, date: ctx.window === '7d' ? 'now 7-d' : 'now 1-d', ...(ctx.country ? { geo: ctx.country.toUpperCase() } : {}) }).toString()}`
      }],
      reliability: meta.reliability
    };
    ranked.push({ item, active });
  });
  const items = ranked.map(r => r.item);
  return {
    items, ranked,
    report: report('google', calls, results, items.length, outside ? { note: `${outside} trend${outside === 1 ? '' : 's'} started before this window and ${outside === 1 ? 'is' : 'are'} not shown.` } : {})
  };
}

/** News: top-story clusters (no topic) or the articles about a topic in the window. */
export async function newsCoverage(ctx: AdapterContext, term?: string): Promise<AdapterResult> {
  const calls = trendCalls('news', term, ctx);
  const results = await runCalls('news', calls);
  const meta = PLATFORM_META.news;
  const w = TREND_WINDOWS[ctx.window];
  const observedAt = new Date(ctx.now).toISOString();
  const items: TrendItem[] = [];
  let outside = 0;

  if (term) {
    const drafts = results.flatMap(r => (r.data ? normalizeEngine(r.engine, r.params, r.data) : []))
      .filter(d => scoreText(term, d).score >= MIN_SCORE);
    const { kept, outside: out } = cleanResults(drafts, w.ms, ctx.now);
    outside = out;
    if (kept.length) items.push(signalItem('news', term, term, kept, ctx, { articleCount: kept.length }));
  } else {
    // Google groups top stories into clusters: one topic per cluster, its articles as evidence.
    const raw: any[] = Array.isArray(results[0]?.data?.news_results) ? results[0].data.news_results : [];
    raw.forEach(r => {
      const group: Draft[] = normalizeEngine('google_news', {}, { news_results: [r] });
      const { kept, outside: out } = cleanResults(group, w.ms, ctx.now);
      outside += out && !kept.length ? 1 : 0;
      if (!kept.length) return;
      const lead = r.highlight?.title || r.title || kept[0].title;
      const topic = headlineTopic(String(lead));
      const span = dateSpan(kept);
      const dir = firstKnown(fromDates(kept.map(k => k.publishedAt || '').filter(Boolean), w.ms, ctx.now));
      items.push({
        id: itemId('news', ctx.country || '', topic), topic, key: topicKey(topic), platform: 'news',
        signalKind: meta.signalKind, sourceLabel: meta.sourceLabel, query: '', observedAt,
        ...(span.first ? { firstSeenAt: span.first } : {}), ...(span.latest ? { latestAt: span.latest } : {}),
        region: regionLabel(ctx.country), metrics: { articleCount: kept.length },
        direction: dir.direction, directionBasis: dir.basis, relatedKeywords: [], hashtags: hashtagsIn(kept.map(k => `${k.title} ${k.snippet || ''}`)),
        evidence: kept.slice(0, 8).map(toEvidence), reliability: meta.reliability
      });
    });
  }
  return {
    items,
    report: report('news', calls, results, items.length, outside ? { note: `${outside} result${outside === 1 ? '' : 's'} outside the window removed.` } : {})
  };
}

/** One platform's signal for a topic: the posts / videos / threads found in the window. */
function signalItem(platform: TrendSource, topic: string, query: string, kept: Draft[], ctx: AdapterContext, metrics: TrendItem['metrics']): TrendItem {
  const meta = PLATFORM_META[platform];
  const w = TREND_WINDOWS[ctx.window];
  const span = dateSpan(kept);
  const dir = firstKnown(fromDates(kept.map(k => k.publishedAt || '').filter(Boolean), w.ms, ctx.now));
  return {
    id: itemId(platform, ctx.country || '', topic), topic, key: topicKey(topic), platform,
    signalKind: meta.signalKind, sourceLabel: meta.sourceLabel, query, observedAt: new Date(ctx.now).toISOString(),
    ...(span.first ? { firstSeenAt: span.first } : {}), ...(span.latest ? { latestAt: span.latest } : {}),
    region: regionLabel(ctx.country), metrics,
    direction: dir.direction, directionBasis: dir.basis, relatedKeywords: [],
    hashtags: hashtagsIn(kept.map(k => `${k.title} ${k.snippet || ''}`)),
    evidence: kept.slice(0, 8).map(toEvidence), reliability: meta.reliability
  };
}

/**
 * X, YouTube, Reddit, TikTok, Facebook, Instagram for one topic. Results must name the topic (relevance score)
 * and fall inside the window by their own dates where they have one.
 */
export async function platformSignal(platform: Exclude<TrendSource, 'google' | 'news'>, topic: string, ctx: AdapterContext, opts: { xPosts?: 'add' | 'only' } = {}): Promise<{ results: SerpCallResult[]; calls: EngineCall[]; item: TrendItem | null; outside: number }> {
  const calls = trendCalls(platform, topic, { ...ctx, xPosts: opts.xPosts });
  const results = await runCalls(platform, calls);
  const w = TREND_WINDOWS[ctx.window];
  const drafts: Draft[] = [];
  results.forEach((r, i) => {
    if (!r.data) return;
    if (platform === 'x' && calls[i].label.includes('carousel')) {
      drafts.push(...twitterResults(r.data).map(d => ({ ...d, publishedAt: d.publishedAt || parseDate(d.publishedText, ctx.now) })));
      return;
    }
    drafts.push(...normalizeEngine(r.engine, r.params, r.data));
  });
  const relevant = drafts.filter(d => (platform === 'x' && d.metadata?.carousel ? true : scoreText(topic, d).score >= MIN_SCORE));
  const { kept, outside } = cleanResults(relevant, w.ms, ctx.now);
  if (!kept.length) return { results, calls, item: null, outside };
  const videos = kept.filter(k => k.kind === 'video');
  const views = videos.reduce((n, v) => n + (typeof v.metadata?.views === 'number' ? (v.metadata.views as number) : 0), 0);
  const metrics: TrendItem['metrics'] = platform === 'youtube'
    ? { videoCount: videos.length || kept.length, ...(views > 0 ? { views } : {}) }
    : { postCount: kept.length };
  const query = calls.map(c => String(c.params.q || c.params.search_query || '')).filter(Boolean).join(' · ');
  return { results, calls, item: signalItem(platform, topic, query, kept, ctx, metrics), outside };
}

/** Runs a platform for several topics and reports it once. */
export async function platformAcross(platform: Exclude<TrendSource, 'google' | 'news'>, topics: string[], ctx: AdapterContext, opts: { xPosts?: 'add' | 'only' } = {}): Promise<AdapterResult> {
  if (!topics.length) {
    return { items: [], report: { ...report(platform, [], [], 0), status: 'empty', note: 'No topic to check on this platform.' } };
  }
  const runs = await Promise.all(topics.map(t => platformSignal(platform, t, ctx, opts)));
  const items = runs.map(r => r.item).filter((x): x is TrendItem => Boolean(x));
  const outside = runs.reduce((n, r) => n + r.outside, 0);
  return {
    items,
    report: report(platform, runs.flatMap(r => r.calls), runs.flatMap(r => r.results), items.length, {
      ...(outside ? { note: `${outside} result${outside === 1 ? '' : 's'} outside the window removed.` } : {}),
      ...(topics.length > 1 ? { note: `Checked the top ${topics.length} topics.${outside ? ` ${outside} result${outside === 1 ? '' : 's'} outside the window removed.` : ''}` } : {})
    })
  };
}
