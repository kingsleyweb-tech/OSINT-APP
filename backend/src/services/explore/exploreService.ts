import { dice } from '../queryIntel/fuzzy';
import { SerpApiProvider, type SerpCallResult } from '../search/serpApiProvider';
import { planCalls, SCORED_CAPABILITIES, QUERYLESS_CAPABILITIES } from './engineCatalog';
import { normalizeEngine, rawCount, domainOf, platformOf, handleFromUrl } from './normalize';
import { scoreText, dedupeKey, MIN_SCORE } from './relevance';
import type {
  EngineRun, ExploreItem, ExploreRequest, ExploreResponse, ExploreCapability
} from '../../types/explore';

const provider = new SerpApiProvider();
// Covers the provider's 30s attempt plus one retry.
const CALL_TIMEOUT_MS = 70_000;
const MAX_QUERY = 200;

export class ExploreInputError extends Error {}

const NEWS_ENGINES = new Set(['google_news', 'bing_news']);
/** A news engine asked for an exact phrase: every article it returns contains the phrase somewhere. */
function phraseInBody(call: { engine: string; params: Record<string, string | number> }): boolean {
  return (NEWS_ENGINES.has(call.engine) || call.params.tbm === 'nws') && /^"[^"]+"/.test(String(call.params.q || ''));
}

/** Removes control characters and trims to a safe length. */
export function sanitizeQuery(q: unknown): string {
  return String(q ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY);
}

function withTimeout(p: Promise<SerpCallResult>, call: { engine: any; params: any }, ms = CALL_TIMEOUT_MS): Promise<SerpCallResult> {
  return Promise.race([
    p,
    new Promise<SerpCallResult>(resolve => setTimeout(() => resolve({
      engine: call.engine, params: call.params, data: null, error: `Timed out after ${Math.round(ms / 1000)} seconds`,
      fromCache: false, quotaExhausted: false
    }), ms))
  ]);
}

function runStatus(r: SerpCallResult, returned: number): EngineRun['status'] {
  if (r.quotaExhausted) return 'quota';
  if (!r.data) return 'error';
  if (returned === 0) return 'empty';
  return r.fromCache ? 'cached' : 'ok';
}

/** Structured extras for capabilities whose value is not a list of links. */
function trendsExtra(results: SerpCallResult[]): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  results.forEach(r => {
    if (!r.data) return;
    if (r.params.data_type === 'TIMESERIES') {
      const rows = r.data.interest_over_time?.timeline_data;
      if (Array.isArray(rows)) {
        extra.timeline = rows.map((row: any) => ({
          date: String(row.date || ''),
          timestamp: Number(row.timestamp) || null,
          values: (row.values || []).map((v: any) => ({ query: String(v.query || ''), value: Number(v.extracted_value ?? v.value) || 0 }))
        }));
      }
      if (Array.isArray(r.data.interest_over_time?.averages)) extra.averages = r.data.interest_over_time.averages;
    }
    if (r.params.data_type === 'RELATED_QUERIES') {
      const pick = (list: any[]) => (Array.isArray(list) ? list.slice(0, 15).map(q => ({ query: String(q.query || ''), value: String(q.value ?? ''), link: q.link || null })) : []);
      extra.relatedTop = pick(r.data.related_queries?.top);
      extra.relatedRising = pick(r.data.related_queries?.rising);
    }
    if (Array.isArray(r.data.trending_searches)) {
      extra.trending = r.data.trending_searches.slice(0, 40).map((t: any) => ({
        query: String(t.query || ''),
        searchVolume: Number(t.search_volume) || null,
        increasePercentage: Number(t.increase_percentage) || null,
        active: Boolean(t.active),
        startedAt: t.start_timestamp ? new Date(Number(t.start_timestamp) * 1000).toISOString() : null,
        categories: (t.categories || []).map((c: any) => c.name).filter(Boolean),
        related: (t.trend_breakdown || []).slice(0, 6)
      }));
    }
  });
  return extra;
}

export async function explore(req: ExploreRequest): Promise<ExploreResponse> {
  const capability = req.capability as ExploreCapability;
  const query = sanitizeQuery(req.query);
  const options = req.options || {};
  if (!QUERYLESS_CAPABILITIES.includes(capability) && query.length < 2) {
    throw new ExploreInputError('Enter at least 2 characters to search.');
  }

  let calls: ReturnType<typeof planCalls>;
  const failedPrimaries: EngineRun[] = [];
  const fallbackNotices: string[] = [];
  try {
    calls = planCalls(capability, query, options);
  } catch (e: any) {
    throw new ExploreInputError(e?.message || 'Invalid search request.');
  }

  // Independent engines run concurrently; one failing engine never fails the others.
  // A single call of the plan was requested (the page runs each engine separately to show progress).
  if (options.callIndex != null) {
    const one = calls[options.callIndex];
    if (!one) throw new ExploreInputError('Unknown engine for this search.');
    calls = [one];
  }

  const results = await Promise.all(calls.map(async (c, i) => {
    const first = await withTimeout(provider.request(c.engine, c.params), c, CALL_TIMEOUT_MS);
    const primaryCount = rawCount(c.engine, first.data);
    // For scored searches, "found something" means something relevant survived the text match.
    const relevant = first.data && SCORED_CAPABILITIES.includes(capability)
      ? (phraseInBody(c) ? primaryCount : normalizeEngine(c.engine, c.params, first.data).filter(d => scoreText(query, d).score >= MIN_SCORE).length)
      : primaryCount;
    if (first.quotaExhausted || !c.fallback || (first.data && primaryCount > 0 && relevant > 0)) return first;
    fallbackNotices.push(`${c.label} found nothing relevant, so ${c.fallback.label} was used instead.`);
    // Primary engine failed or found nothing: record it and use the fallback engine in its place.
    failedPrimaries.push({
      engine: c.engine, label: c.label, status: first.data ? 'empty' : 'error', returned: 0,
      ...(first.data ? {} : { error: first.error || 'Failed' })
    });
    calls[i] = c.fallback;
    return withTimeout(provider.request(c.fallback.engine, c.fallback.params), c.fallback);
  }));

  const engines: EngineRun[] = [...failedPrimaries];
  const merged = new Map<string, ExploreItem>();
  let returned = 0;
  let duplicates = 0;
  let filteredOut = 0;
  const scored = SCORED_CAPABILITIES.includes(capability);

  results.forEach((r, i) => {
    const call = calls[i];
    const n = rawCount(call.engine, r.data);
    engines.push({ engine: call.engine, label: call.label, status: runStatus(r, n), returned: n, ...(r.error ? { error: r.error } : {}) });
    normalizeEngine(call.engine, call.params, r.data).forEach(d => {
      returned++;
      let key = dedupeKey(d.url);
      // The same page under a different URL (tracking, mobile or AMP copies): same site and near-identical title.
      const dom = domainOf(d.url);
      if (!merged.has(key) && d.title.length > 12) {
        for (const [k, v] of merged) {
          if (v.domain === dom && dice(v.title, d.title) >= 0.92) { key = k; break; }
        }
      }
      const existing = merged.get(key);
      if (existing) {
        duplicates++;
        if (!existing.engines.includes(d.engine)) existing.engines.push(d.engine);
        // Fill fields the first engine did not provide.
        (['snippet', 'thumbnail', 'image', 'publishedText', 'publishedAt', 'author'] as const).forEach(f => {
          if (!existing[f] && d[f]) (existing as any)[f] = d[f];
        });
        return;
      }
      const domain = domainOf(d.url);
      const h = handleFromUrl(d.url);
      let relevance = capability === 'reverseImage'
        ? { score: 0, label: 'Visual match' as const, reasons: ['Similar image found; this does not identify a person'] }
        : scored
          ? scoreText(query, { title: d.title, snippet: d.snippet, author: d.author, url: d.url })
          : { score: 0, label: 'Not scored' as const, reasons: [] as string[] };
      // News engines searched with an exact phrase match it in the article body: an article whose headline
      // does not name it still mentions it. Kept, ranked below headline matches.
      if (scored && relevance.score < MIN_SCORE && phraseInBody(call)) {
        relevance = { score: MIN_SCORE, label: 'Partial match', reasons: ['Named in the article, not in the headline'] };
      }
      if (scored && relevance.score < MIN_SCORE) {
        filteredOut++;
        return;
      }
      merged.set(key, {
        ...d,
        id: `x-${Buffer.from(key).toString('base64url').slice(0, 24)}-${merged.size}`,
        domain,
        platform: d.platform || platformOf(domain),
        username: d.username || h.username,
        kind: capability === 'forums' && d.kind === 'web' ? 'forum' : d.kind,
        engines: [d.engine],
        relevance
      });
    });
  });

  const items = Array.from(merged.values());
  if (scored) items.sort((a, b) => b.relevance.score - a.relevance.score || (Date.parse(b.publishedAt || '') || 0) - (Date.parse(a.publishedAt || '') || 0));

  const notices: string[] = [...fallbackNotices];
  if (engines.some(e => e.status === 'quota')) notices.push('The SerpApi monthly search quota is exhausted. Some or all engines could not run.');
  if (engines.every(e => e.status === 'error' || e.status === 'quota')) notices.push('No engine returned data for this request.');
  if (filteredOut > 0) notices.push(`${filteredOut} result${filteredOut === 1 ? '' : 's'} hidden because the returned text did not match the search terms.`);

  return {
    capability,
    query,
    items,
    engines,
    stats: {
      returned,
      kept: items.length,
      filteredOut,
      duplicates,
      searchesUsed: results.filter(r => !r.fromCache && r.data).length
    },
    extra: capability === 'trends' || capability === 'trendingNow' ? trendsExtra(results) : undefined,
    notices
  };
}

/** SerpApi account status. The account endpoint is free and does not use a search. */
export async function quotaStatus(): Promise<Record<string, unknown>> {
  const key = process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
  if (!key) return { configured: false };
  try {
    const res = await fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(key)}`);
    const d: any = await res.json();
    if (!res.ok || d.error) return { configured: true, error: d.error || `HTTP ${res.status}` };
    return {
      configured: true,
      plan: d.plan_name ?? null,
      searchesPerMonth: d.searches_per_month ?? null,
      searchesLeft: d.total_searches_left ?? d.plan_searches_left ?? null,
      usedThisMonth: d.this_month_usage ?? null,
      hourlyLimit: d.account_rate_limit_per_hour ?? null
    };
  } catch (e: any) {
    return { configured: true, error: e?.message || 'Network error' };
  }
}
