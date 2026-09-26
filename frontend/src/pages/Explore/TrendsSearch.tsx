import React from 'react';
import { Search, TrendingUp, Flame, RotateCcw } from 'lucide-react';
import { ExplorePage, Field, Segmented, EngineStatus, ResultList, EmptyState } from '../../components/explore/ExploreKit';
import { useSearchRun, type SearchTask } from '../../components/explore/useSearchRun';
import { usePageSearch } from '../../components/explore/usePageSearch';
import { SearchLoader } from '../../components/ui/SearchLoader';
import { recordSearch, topFromItems } from '../../lib/history';
import { COUNTRY_OPTIONS, SOCIAL_PLATFORM_OPTIONS, mergeResponses, type ExploreResponse } from '../../lib/exploreClient';
import { fmtDate } from '../../lib/workspace';
import { useQueryIntel, useSearchMode } from '../../components/search/useIntelligentSearch';
import { QueryIntelBanner, SearchModeToggle } from '../../components/search/QueryIntelBanner';
import { intelHistoryFields, type QueryIntel } from '../../lib/queryIntelClient';
import { clearPageState, usePageState } from '../../lib/pageState';
import { useCases } from '../../components/explore/exploreHooks';

const TIMEFRAMES = [
  { value: 'now 7-d', label: 'Past 7 days' },
  { value: 'today 1-m', label: 'Past 30 days' },
  { value: 'today 3-m', label: 'Past 90 days' },
  { value: 'today 12-m', label: 'Past 12 months' },
  { value: 'today 5-y', label: 'Past 5 years' }
];
const WHEN_FOR: Record<string, 'w' | 'm' | 'y' | undefined> = { 'now 7-d': 'w', 'today 1-m': 'm', 'today 3-m': 'y', 'today 12-m': 'y' };
const SERIES_COLORS = ['var(--accent-warm)', '#0ea5e9', '#10b981', '#a855f7', '#f59e0b'];
type Tab = 'news' | 'social' | 'web';

interface Point { date: string; values: Array<{ query: string; value: number }> }

const TrendChart: React.FC<{ timeline: Point[] }> = ({ timeline }) => {
  const W = 760, H = 240, P = 30;
  const series = timeline[0]?.values.map(v => v.query) || [];
  const max = Math.max(1, ...timeline.flatMap(t => t.values.map(v => v.value)));
  const x = (i: number) => P + (i / Math.max(1, timeline.length - 1)) * (W - P * 2);
  const y = (v: number) => H - P - (v / max) * (H - P * 2);
  const ticks = [0, Math.floor(timeline.length / 2), timeline.length - 1].filter((v, i, a) => v >= 0 && a.indexOf(v) === i);
  return (
    <div className="ex-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Search interest over time">
        {[0, 50, 100].map(v => (
          <g key={v}>
            <line x1={P} x2={W - P} y1={y((v / 100) * max)} y2={y((v / 100) * max)} stroke="var(--border-color)" />
            <text className="ex-chart-axis" x={4} y={y((v / 100) * max) + 3}>{Math.round((v / 100) * max)}</text>
          </g>
        ))}
        {series.map((q, s) => (
          <polyline key={q} fill="none" stroke={SERIES_COLORS[s % SERIES_COLORS.length]} strokeWidth={2.2}
            points={timeline.map((t, i) => `${x(i)},${y(t.values[s]?.value || 0)}`).join(' ')} />
        ))}
        {ticks.map(i => <text key={i} className="ex-chart-axis" x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === timeline.length - 1 ? 'end' : 'middle'}>{timeline[i].date}</text>)}
      </svg>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
        {series.map((q, s) => (
          <span key={q} className="ex-small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <span style={{ width: 12, height: 3, background: SERIES_COLORS[s % SERIES_COLORS.length], display: 'inline-block' }} /> {q}
          </span>
        ))}
        <span className="ex-muted ex-small">Values are Google's relative interest (100 = the peak in this period), not search counts.</span>
      </div>
    </div>
  );
};

export const TrendsSearchPage: React.FC = () => {
  // Everything on this page is kept when you leave it (until "New search").
  const { run, cancel, running, steps } = useSearchRun('trends:run');
  const [searchMode, setSearchMode] = useSearchMode();
  const qi = useQueryIntel('trends:qi');
  const { cases } = useCases();
  const trendingRun = useSearchRun('trends:trendingRun');
  const [terms, setTerms] = usePageState('trends:terms', '');
  const [country, setCountry] = usePageState('trends:country', '');
  const [timeframe, setTimeframe] = usePageState('trends:timeframe', 'today 12-m');
  const [error, setError] = usePageState('trends:error', '');
  const [results, setResults] = usePageState<Record<string, ExploreResponse> | null>('trends:results', null);
  const [tab, setTab] = usePageState<Tab>('trends:tab', 'news');
  const [trendCountry, setTrendCountry] = usePageState('trends:trendCountry', 'gh');
  const [trending, setTrending] = usePageState<ExploreResponse | null>('trends:trending', null);
  const [restoredAt, setRestoredAt] = usePageState<string | null>('trends:restoredAt', null);

  const newSearch = () => {
    qi.cancel();
    cancel();
    trendingRun.cancel();
    clearPageState('trends');
  };

  const search = async (o: { t?: string; cc?: string; tf?: string; keepOriginal?: boolean; chosen?: string } = {}) => {
    const list = (o.t ?? terms).split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
    const cc = o.cc ?? country;
    const tf = o.tf ?? timeframe;
    if (list.length === 0) { setError('Enter a search term, or up to 5 separated by commas.'); return; }
    setError('');
    setRestoredAt(null);
    // Search intelligence for a single topic; several comparison terms are searched as typed.
    const checked = list.length === 1
      ? await qi.check(list[0], 'topic', searchMode, { country: cc || undefined, knownNames: cases.map(c => c.name), keepOriginal: o.keepOriginal, chosen: o.chosen })
      : { query: list[0], intel: null };
    if (!checked) return;
    if (list.length > 1) qi.setIntel(null);
    const main = checked.query;
    list[0] = main;
    const when = WHEN_FOR[tf];
    // Besides Google Trends, gather what news, social platforms and the web say about the (first) term,
    // so a topic with too little Trends data still returns information.
    const tasks: SearchTask[] = [
      { key: 'trends', label: 'Google Trends', capability: 'trends', query: list.join(','), options: { country: cc || undefined, timeframe: tf } },
      { key: 'news', label: 'News', capability: 'news', query: main, options: { country: cc || undefined, when } },
      { key: 'social', label: 'Social', capability: 'social', query: main, options: { country: cc || undefined, when, platforms: SOCIAL_PLATFORM_OPTIONS.filter(p => p.default).map(p => p.id) } },
      { key: 'web', label: 'Web', capability: 'web', query: main, options: { country: cc || undefined, when } },
      // What is trending in that country right now, to show whether the topic is among it.
      { key: 'trending', label: 'Trending now', capability: 'trendingNow', query: '', options: { country: cc || 'us' } }
    ];
    const out = await run(tasks);
    if (!out) return;
    setResults(out);
    if (list.length === 1) qi.learnFromResults(checked.query, [...(out.news?.items || []), ...(out.web?.items || [])].map(i => `${i.title} ${i.snippet || ''}`), 'results');
    if (out.trending) { setTrending(out.trending); setTrendCountry(cc || 'us'); }
    const firstTab = (['news', 'social', 'web'] as Tab[]).find(t => out[t]?.items.length) || 'news';
    setTab(firstTab);
    const all = Object.values(out);
    recordSearch({
      ...intelHistoryFields(checked.intel),
      category: 'trends', query: (o.t ?? terms).split(',').map(t => t.trim()).filter(Boolean).slice(0, 5).join(', '),
      detail: [COUNTRY_OPTIONS.find(c => c.code === cc && c.code)?.label || 'Worldwide', TIMEFRAMES.find(t => t.value === tf)?.label].filter(Boolean).join(' · '),
      resultCount: all.reduce((n, r) => n + r.items.length, 0), searchesUsed: all.reduce((n, r) => n + r.stats.searchesUsed, 0),
      topResults: topFromItems([...(out.news?.items || []).slice(0, 4), ...(out.social?.items || []).slice(0, 4)]),
      params: { q: list.join(','), tf, ...(cc ? { country: cc } : {}) }
    }, { page: 'trends', payload: { results: out, terms: list.join(', '), country: cc, timeframe: tf, tab: firstTab, trendCountry: cc || 'us', intel: checked.intel } });
  };

  usePageSearch(p => {
    setTerms(p.get('q') || ''); setCountry(p.get('country') || ''); setTimeframe(p.get('tf') || 'today 12-m');
    search({ t: p.get('q') || '', cc: p.get('country') || '', tf: p.get('tf') || 'today 12-m' });
  }, (payload, savedAt) => {
    const d = payload as { results: Record<string, ExploreResponse>; terms: string; country: string; timeframe: string; tab: Tab; trendCountry: string; intel: QueryIntel | null };
    setResults(d.results); setTerms(d.terms); setCountry(d.country); setTimeframe(d.timeframe); setTab(d.tab);
    setTrending(d.results.trending || null); setTrendCountry(d.trendCountry);
    qi.setIntel(d.intel); setError(''); setRestoredAt(savedAt);
  });

  const loadTrending = async () => {
    const out = await trendingRun.run([{ key: 'r', capability: 'trendingNow', query: '', options: { country: trendCountry } }]);
    if (out) setTrending(out.r);
  };

  const extra = results?.trends?.extra || {};
  const timeline = (extra.timeline || []) as Point[];
  const top = (extra.relatedTop || []) as Array<{ query: string; value: string }>;
  const rising = (extra.relatedRising || []) as Array<{ query: string; value: string }>;
  const trendingList = (trending?.extra?.trending || []) as Array<{ query: string; searchVolume: number | null; increasePercentage: number | null; startedAt: string | null; categories: string[] }>;
  const combined = results ? mergeResponses('trends', terms, Object.values(results)) : null;
  // Trending searches that share a word with the topic.
  const topicWords = new Set(terms.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2));
  const matchesTopic = (q: string) => q.toLowerCase().split(/\s+/).some(w => topicWords.has(w));
  const trendingMatches = trendingList.filter(t => matchesTopic(t.query));

  return (
    <ExplorePage title="Trends" subtitle="How public interest in a name, organisation, place or topic changes over time — and what news, social platforms and the web are saying about it."
      actions={results || running ? <button type="button" className="ex-btn ex-btn-ghost" onClick={newSearch}><RotateCcw size={15} /> New search</button> : undefined}>
      <form className="ex-card ex-card-pad ex-form" onSubmit={e => { e.preventDefault(); search(); }}>
        <Field label="Topic, or up to 5 terms to compare (comma-separated)" htmlFor="tr-q" grow>
          <input id="tr-q" className="ex-input" value={terms} onChange={e => setTerms(e.target.value)} placeholder="e.g. recruits passing out, or flooding, drainage" maxLength={200} />
        </Field>
        <Field label="Country" htmlFor="tr-c">
          <select id="tr-c" className="ex-input ex-select" value={country} onChange={e => setCountry(e.target.value)}>
            {COUNTRY_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.code ? o.label : 'Worldwide'}</option>)}
          </select>
        </Field>
        <Field label="Period" htmlFor="tr-t">
          <select id="tr-t" className="ex-input ex-select" value={timeframe} onChange={e => setTimeframe(e.target.value)}>
            {TIMEFRAMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <SearchModeToggle mode={searchMode} onChange={setSearchMode} />
        <button type="submit" className="ex-btn ex-btn-primary" disabled={running || qi.checking}><Search size={16} /> Show trend</button>
        {error && <div className="ex-notice" style={{ width: '100%' }}>{error}</div>}
        <span className="ex-muted ex-small" style={{ width: '100%' }}>Searches Google Trends, the country's Google News edition, each main social platform, Google web search, and what is trending now in that country (about 11 SerpApi searches).</span>
      </form>

      {running || qi.checking ? <SearchLoader query={terms} steps={[...qi.step, ...steps]} onCancel={() => { qi.cancel(); cancel(); }} /> : (
        <>
          <QueryIntelBanner intel={qi.intel} cases={cases} resultCount={combined?.items.length} sources={combined?.engines.map(e => e.label)}
        onSearch={q2 => { setTerms(q2); search({ t: q2, chosen: qi.intel?.corrections.some(c => c.query === q2) ? q2 : undefined }); }}
        onSearchOriginal={() => { if (qi.intel) search({ t: qi.intel.original, keepOriginal: true }); }} />
          {restoredAt && results && <div className="ex-notice">Saved results from {fmtDate(restoredAt, true)} — no searches were used. Search again for the latest results.</div>}
          <EngineStatus response={combined} />
        </>
      )}

      <div className="ex-split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!running && !results && (
            <EmptyState icon={<TrendingUp size={24} />} title="Explore a topic">Enter a topic to chart its popularity on Google and see what is being published about it.</EmptyState>
          )}
          {!running && results && trending && (
            <div className={`ex-notice`} style={{ color: trendingMatches.length ? '#2f7a45' : 'var(--text-secondary)' }}>
              {trendingMatches.length
                ? `Trending now in ${COUNTRY_OPTIONS.find(c => c.code === trendCountry)?.label || trendCountry.toUpperCase()}: ${trendingMatches.map(t => `"${t.query}"`).join(', ')}`
                : `This topic is not among the ${trendingList.length} searches trending on Google in ${COUNTRY_OPTIONS.find(c => c.code === trendCountry)?.label || trendCountry.toUpperCase()} right now.`}
            </div>
          )}
          {!running && results && (
            timeline.length === 0 ? (
              <EmptyState title="Not enough Google Trends data">
                Google Trends has too little search volume for this term in this period and country, so there is no interest chart.
                What news, social platforms and the web say about it is listed below.
              </EmptyState>
            ) : (
              <section className="ex-card">
                <div className="ex-card-head"><h2 className="ex-card-title">Interest over time</h2></div>
                <TrendChart timeline={timeline} />
              </section>
            )
          )}
          {!running && (top.length > 0 || rising.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {([['Top related searches', top], ['Rising related searches', rising]] as const).map(([title, list]) => (
                <section className="ex-card" key={title}>
                  <div className="ex-card-head"><h2 className="ex-card-title">{title}</h2></div>
                  {list.length === 0 ? <div className="ex-pad ex-muted ex-small">None reported.</div> : list.map(q => (
                    <button type="button" key={q.query} className="ex-kv ex-kv-btn" onClick={() => setTerms(q.query)} title="Use this term">
                      <span>{q.query}</span><span className="ex-muted ex-mono">{q.value}</span>
                    </button>
                  ))}
                </section>
              ))}
            </div>
          )}
          {!running && results && (
            <>
              <Segmented<Tab> label="What is being said" value={tab} onChange={setTab}
                options={(['news', 'social', 'web'] as Tab[]).map(t => ({ value: t, label: `${t === 'news' ? 'News' : t === 'social' ? 'Social' : 'Web'} ${results[t]?.items.length ?? 0}` }))} />
              {results[tab] && (
                <ResultList items={results[tab].items} query={results[tab].query} savedFrom={`Trends · ${tab}`} kindFilter={tab !== 'news'}
                  emptyText={`No ${tab} results were found for this topic in this period.`} />
              )}
            </>
          )}
        </div>
        <section className="ex-card">
          <div className="ex-card-head" style={{ flexWrap: 'wrap' }}>
            <h2 className="ex-card-title"><Flame size={15} style={{ verticalAlign: -2, color: 'var(--accent-warm)' }} /> Trending now</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <select className="ex-input ex-select" style={{ height: 32, minWidth: 0 }} value={trendCountry} onChange={e => setTrendCountry(e.target.value)} aria-label="Trending country">
                {COUNTRY_OPTIONS.filter(o => o.code).map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
              </select>
              <button type="button" className="ex-btn ex-btn-ghost ex-btn-sm" onClick={loadTrending} disabled={trendingRun.running}>Load</button>
            </div>
          </div>
          {trendingRun.running ? <div className="ex-pad"><SearchLoader title="Loading trending searches" steps={trendingRun.steps} onCancel={trendingRun.cancel} /></div>
            : !trending ? <div className="ex-pad ex-muted ex-small">Load the searches trending on Google in a country right now (uses 1 search).</div>
            : trendingList.length === 0 ? <div className="ex-pad ex-muted ex-small">No trending searches were returned.</div>
            : trendingList.slice(0, 20).map(t => (
              <button type="button" key={t.query} className="ex-kv ex-kv-btn" style={matchesTopic(t.query) ? { background: 'var(--accent-warm-subtle)', fontWeight: 700 } : undefined} onClick={() => setTerms(t.query)} title={`${t.categories.join(', ')}${t.startedAt ? ` · since ${fmtDate(t.startedAt, true)}` : ''}`}>
                <span>{t.query}</span>
                <span className="ex-muted ex-small">{t.searchVolume ? `${t.searchVolume.toLocaleString()}+` : ''}{t.increasePercentage ? ` · +${t.increasePercentage}%` : ''}</span>
              </button>
            ))}
        </section>
      </div>
    </ExplorePage>
  );
};
