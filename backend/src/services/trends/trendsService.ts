import { TREND_WINDOWS } from '../explore/engineCatalog';
import { sanitizeQuery } from '../explore/exploreService';
import { googleTrending, newsCoverage, platformAcross, type AdapterContext, type AdapterResult } from './adapters';
import { aiAvailable, aiGroupTrends } from './aiGroup';
import { contains, groupAcrossPlatforms, PLATFORM_ORDER } from './crossPlatform';
import { firstKnown, fromSnapshot } from './direction';
import { sameTopic, topicKey } from './normalize';
import { previousSnapshot, saveSnapshot } from './snapshots';
import type { TrendItem, TrendSource, TrendsRequest, TrendsResponse } from './types';

/**
 * Trend intelligence. SerpApi collects every signal; Gemini may only group and label what was collected.
 *
 * Discover (no topic): Google Trends' trending list (needs a country) and the news edition's top stories give
 * the topics; the top 3 are then checked on the other selected platforms.
 * Topic: the topic is checked on each selected platform, and against Google's trending list.
 */

/** Platforms used when the investigator picks "All" (the rest cost one search per topic and are opt-in). */
export const DEFAULT_PLATFORMS: Record<'discover' | 'topic', TrendSource[]> = {
  discover: ['google', 'news', 'x'],
  topic: ['google', 'news', 'x', 'youtube', 'reddit']
};
const MAX_CHECKED_TOPICS = 3;

type Social = Exclude<TrendSource, 'google' | 'news'>;
const isSocial = (p: TrendSource): p is Social => p !== 'google' && p !== 'news';

/** Direction from an earlier snapshot of the same list, and this hour's snapshot saved for the next run. */
async function withSnapshots(platform: 'google' | 'news', res: AdapterResult, ctx: AdapterContext): Promise<void> {
  const country = ctx.country || '';
  const prev = await previousSnapshot(country, platform, ctx.window, new Date(ctx.now));
  res.items.forEach((it, rank) => {
    const metric = it.metrics.searchVolume ?? it.metrics.articleCount;
    const snap = fromSnapshot(it.key, rank, metric, prev, ctx.now);
    const dir = firstKnown(snap, it.direction === 'Direction unavailable' ? null : { direction: it.direction, basis: it.directionBasis });
    it.direction = dir.direction;
    it.directionBasis = dir.basis;
  });
  void saveSnapshot(country, platform, res.items.map((it, rank) => ({ key: it.key, topic: it.topic, rank, metric: it.metrics.searchVolume ?? it.metrics.articleCount })), new Date(ctx.now));
}

export async function getTrends(req: TrendsRequest): Promise<TrendsResponse> {
  const now = Date.now();
  const ctx: AdapterContext = { window: req.window, country: req.country, language: req.language, now };
  const term = req.mode === 'topic' ? sanitizeQuery(req.term) : '';
  const chosen = (req.platforms.length ? req.platforms : DEFAULT_PLATFORMS[req.mode]).filter((p, i, a) => PLATFORM_ORDER.includes(p) && a.indexOf(p) === i);
  const notices: string[] = [];
  const results: AdapterResult[] = [];

  if (req.mode === 'topic') {
    const runs = await Promise.allSettled(chosen.map(async p => {
      if (p === 'google') {
        // Is the topic on Google's own trending list right now? Only matching entries are kept.
        const g = await googleTrending(ctx);
        const key = topicKey(term);
        const match = (it: TrendItem) => sameTopic(it.key, key) || contains(term, it.topic) || contains(it.topic, term);
        const items = g.items.filter(match);
        if (g.report.status === 'ok' && !items.length) {
          g.report = { ...g.report, status: 'empty', items: 0, note: `Not among the ${g.items.length} searches Google lists as trending in ${ctx.country?.toUpperCase()} for this window.` };
        } else g.report = { ...g.report, items: items.length };
        return { ...g, items };
      }
      if (p === 'news') return newsCoverage(ctx, term);
      return platformAcross(p as Social, [term], ctx, { xPosts: p === 'x' ? 'add' : undefined });
    }));
    runs.forEach((r, i) => {
      if (r.status === 'fulfilled') results.push(r.value);
      else results.push({ items: [], report: { platform: chosen[i], label: chosen[i], signalKind: 'indexed_mentions', status: 'unavailable', items: 0, error: 'Temporarily unavailable.', searchesUsed: 0, fromCache: false, queries: [] } });
    });
  } else {
    // The lists that name topics: Google Trends (when a country is chosen) and news top stories.
    const wantGoogle = chosen.includes('google') || Boolean(ctx.country);
    const [g, n] = await Promise.allSettled([
      wantGoogle ? googleTrending(ctx) : Promise.resolve(null),
      newsCoverage(ctx)
    ]);
    const google = g.status === 'fulfilled' ? g.value : null;
    const news = n.status === 'fulfilled' ? n.value : null;
    if (google && google.items.length) await withSnapshots('google', google, ctx);
    if (news && news.items.length) await withSnapshots('news', news, ctx);
    if (google && chosen.includes('google')) results.push(google);
    if (news && chosen.includes('news')) results.push(news);
    if (chosen.includes('google') && !google) results.push({ items: [], report: { platform: 'google', label: 'Google Trends', signalKind: 'official_trending', status: 'unavailable', items: 0, error: 'Temporarily unavailable.', searchesUsed: 0, fromCache: false, queries: [] } });

    // Topics to check elsewhere: Google's list first, then news stories.
    const candidates = (google?.items.length ? google.items : news?.items || []).slice(0, MAX_CHECKED_TOPICS).map(i => i.topic);
    const source = google?.items.length ? 'Google Trends' : 'the news top stories';
    const social = chosen.filter(isSocial);
    if (social.length && candidates.length) notices.push(`X and other platforms were checked for the top ${candidates.length} topics from ${source}.`);
    const runs = await Promise.allSettled(social.map(p => platformAcross(p, candidates, ctx, { xPosts: p === 'x' ? 'only' : undefined })));
    runs.forEach((r, i) => {
      if (r.status === 'fulfilled') results.push(r.value);
      else results.push({ items: [], report: { platform: social[i], label: social[i], signalKind: 'indexed_mentions', status: 'unavailable', items: 0, error: 'Temporarily unavailable.', searchesUsed: 0, fromCache: false, queries: [] } });
    });
    if (!google && !ctx.country) notices.push('Google Trends has no worldwide trending list — select a country to include it.');
  }

  let trends = groupAcrossPlatforms(results.flatMap(r => r.items));
  const ai: TrendsResponse['ai'] = { used: false };
  if (req.ai !== false && trends.length > 1 && aiAvailable()) {
    const g = await aiGroupTrends(trends, `${req.mode}|${ctx.country || ''}|${req.window}|${chosen.join(',')}|${term}`);
    trends = g.trends;
    Object.assign(ai, { used: g.used, ...(g.model ? { model: g.model } : {}), ...(g.note ? { note: g.note } : {}) });
  } else if (req.ai !== false && trends.length > 1) {
    ai.note = 'AI grouping is unavailable; topics are grouped by matching words only.';
  }

  const sources = results.map(r => r.report).sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));
  return {
    mode: req.mode,
    ...(term ? { term } : {}),
    window: req.window,
    ...(ctx.country ? { country: ctx.country } : {}),
    generatedAt: new Date(now).toISOString(),
    sources,
    trends,
    ai,
    searchesUsed: sources.reduce((n, s) => n + s.searchesUsed, 0),
    notices: [`Window: ${TREND_WINDOWS[req.window].label}.`, ...notices]
  };
}
