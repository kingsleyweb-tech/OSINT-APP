/**
 * Offline check of the trends pipeline: SerpApi answers come from fixtures written into the response cache,
 * so nothing is billed. Sources without a fixture fail (invalid key / no network) and must not break the rest.
 *
 *   SERPAPI_KEY=offline npx tsx src/services/trends/__trends_check.ts
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trends-check-'));
process.env.SERPAPI_CACHE_DIR = dir;
process.env.SERPAPI_TIMEOUT_MS = '1500';
process.env.GEMINI_API_KEY = '';

function seed(engine: string, params: Record<string, string | number>, data: unknown) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const key = crypto.createHash('sha1').update(`${engine}?${sorted}`).digest('hex');
  fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(data));
}

const now = Math.floor(Date.now() / 1000);
const isoAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

seed('google_trends_trending_now', { geo: 'GH', hours: 24 }, {
  trending_searches: [
    { query: 'black stars', start_timestamp: now - 3600, active: true, search_volume: 20000, increase_percentage: 1000, categories: [{ id: 17, name: 'Sports' }], trend_breakdown: ['black stars vs mali', 'ghana mali'] },
    { query: 'ecg tariff', start_timestamp: now - 20 * 3600, active: true, categories: [{ id: 3, name: 'Business and Finance' }], trend_breakdown: [] },
    { query: 'old story', start_timestamp: now - 22 * 3600, active: false, search_volume: 1000 }
  ]
});
seed('google_news', { gl: 'gh', hl: 'en' }, {
  news_results: [
    { highlight: { title: 'Black Stars beat Mali 2-1 in World Cup qualifier', link: 'https://news.example/bs1', source: { name: 'Example News' }, iso_date: isoAgo(2) },
      stories: [{ title: 'Black Stars coach praises players after Mali win', link: 'https://other.example/bs2', source: { name: 'Other' }, iso_date: isoAgo(1) }] },
    { title: 'Parliament approves new budget', link: 'https://news.example/budget', source: { name: 'Example News' }, iso_date: isoAgo(5) },
    { title: 'Week-old story about roads', link: 'https://news.example/old', source: { name: 'Example News' }, iso_date: isoAgo(24 * 6) }
  ]
});
seed('google', { q: 'black stars', tbs: 'qdr:d', gl: 'gh' }, {
  twitter_results: {
    title: 'Black Stars on X', link: 'https://x.com/GhanaBlackstars',
    tweets: [
      { link: 'https://x.com/GhanaBlackstars/status/1', snippet: 'Full time! #BlackStars 2-1 Mali #WCQ', published_date: '1 hour ago' },
      { link: 'https://x.com/fan/status/2', snippet: 'What a win for the #BlackStars', published_date: '2 hours ago' },
      { link: 'https://x.com/fan/status/2', snippet: 'What a win for the #BlackStars', published_date: '2 hours ago' }
    ]
  }
});

let failed = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failed += 1;
};

(async () => {
  const { getTrends } = await import('./trendsService');

  // Discover, Ghana, 24 h, Google + News + X.
  const r = await getTrends({ mode: 'discover', platforms: [], window: '24h', country: 'gh' });
  const bs = r.trends.find(t => t.key === 'black stars');
  check('discover returns trends', r.trends.length > 0);
  check('Black Stars grouped across Google, News and X', Boolean(bs && ['google', 'news', 'x'].every(p => bs.platforms.includes(p as never))), JSON.stringify(bs?.platforms));
  const gItem = bs?.items.find(i => i.platform === 'google');
  const xItem = bs?.items.find(i => i.platform === 'x');
  check('Google item is the official list', gItem?.sourceLabel === 'Official trending list');
  check('X item is labelled as a conversation signal', xItem?.sourceLabel === 'X Public Conversation Signal' && xItem.signalKind === 'conversation_signal');
  check('X posts de-duplicated (2 distinct posts)', xItem?.metrics.postCount === 2, String(xItem?.metrics.postCount));
  check('hashtags read from posts', Boolean(xItem?.hashtags.some(h => h.toLowerCase() === '#blackstars')), JSON.stringify(xItem?.hashtags));
  check('Google volume kept as given', gItem?.metrics.searchVolume === 20000);
  check('new active Google trend is Emerging', gItem?.direction === 'Emerging', gItem?.direction);
  check('related keywords from Google', Boolean(gItem?.relatedKeywords.includes('black stars vs mali')));
  const ecg = r.trends.find(t => t.key.includes('ecg'))?.items.find(i => i.platform === 'google');
  check('missing volume stays undefined', ecg !== undefined && ecg.metrics.searchVolume === undefined);
  check('no basis → Direction unavailable', ecg?.direction === 'Direction unavailable', ecg?.direction);
  check('inactive trend is not shown as rising', r.trends.find(t => t.key === 'old story')?.direction !== 'Rising');
  check('week-old news removed from 24h window', !r.trends.some(t => t.items.some(i => i.evidence.some(e => e.url.includes('/old')))));
  const xReport = r.sources.find(s => s.platform === 'x');
  check('X source reported once with a status', Boolean(xReport) && ['ok', 'empty', 'unavailable', 'timeout'].includes(xReport!.status));
  check('no X item comes from a Google search result', r.trends.every(t => t.items.every(i => i.platform !== 'x' || i.evidence.every(e => /x\.com|twitter\.com/.test(e.url)))));

  // Worldwide: no silent fallback to another country.
  const ww = await getTrends({ mode: 'discover', platforms: ['google'], window: '24h' });
  const g = ww.sources.find(s => s.platform === 'google');
  check('worldwide Google Trends says "select a country"', g?.status === 'unavailable' && /select a country/i.test(g.error || ''), JSON.stringify(g));

  // Live: only active trends.
  const live = await getTrends({ mode: 'discover', platforms: ['google'], window: 'live', country: 'gh' });
  check('live shows only active Google trends', !live.trends.some(t => t.key === 'old story'));

  // 1 h window: Google trends that started earlier are left out.
  const h1 = await getTrends({ mode: 'discover', platforms: ['google'], window: '1h', country: 'gh' });
  check('1h window drops trends started 20h ago', !h1.trends.some(t => t.key.includes('ecg')));

  // A source without data fails on its own; the response still comes back.
  const yt = await getTrends({ mode: 'topic', term: 'black stars', platforms: ['google', 'youtube'], window: '24h', country: 'gh' });
  const ytReport = yt.sources.find(s => s.platform === 'youtube');
  check('failed YouTube reported, others still returned', Boolean(ytReport && ytReport.status !== 'ok') && yt.trends.some(t => t.platforms.includes('google')), JSON.stringify(ytReport));

  fs.rmSync(dir, { recursive: true, force: true });
  console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
})();
