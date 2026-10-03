import React, { useRef, useState } from 'react';
import { CostHint } from '../../components/ui/CostHint';
import { addCosts, spellingCheck, trendsRange } from '../../lib/searchCosts';
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
import {
  ALL_PLATFORMS, PLATFORM_FILTERS, PLATFORM_LABEL, WINDOW_OPTIONS, fetchTrends, timelineDirection, trendsSignalCost,
  type CrossPlatformTrend, type TrendSource, type TrendWindow, type TrendsResponse
} from '../../lib/trendsClient';
import { DirectionPill, SourceStrip, TrendRows } from '../../components/trends/TrendList';
import { TrendDetail } from '../../components/trends/TrendDetail';
import '../../styles/Trends.css';

const TIMEFRAMES = [
  { value: 'now 7-d', label: 'Past 7 days' },
  { value: 'today 1-m', label: 'Past 30 days' },
  { value: 'today 3-m', label: 'Past 90 days' },
  { value: 'today 12-m', label: 'Past 12 months' },
  { value: 'today 5-y', label: 'Past 5 years' }
];
const WHEN_FOR: Record<string, 'w' | 'm' | 'y' | undefined> = { 'now 7-d': 'w', 'today 1-m': 'm', 'today 3-m': 'y', 'today 12-m': 'y' };
const SERIES_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)'];
type PlatformFilter = 'all' | TrendSource;
const platformsFor = (f: PlatformFilter): TrendSource[] => (f === 'all' ? [] : [f]);
const regionName = (cc?: string) => (cc ? COUNTRY_OPTIONS.find(c => c.code === cc)?.label || cc.toUpperCase() : 'Worldwide');
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
  const [terms, setTerms] = usePageState('trends:terms', '');
  const [country, setCountry] = usePageState('trends:country', '');
  const [timeframe, setTimeframe] = usePageState('trends:timeframe', 'today 12-m');
  const [error, setError] = usePageState('trends:error', '');
  const [results, setResults] = usePageState<Record<string, ExploreResponse> | null>('trends:results', null);
  const [tab, setTab] = usePageState<Tab>('trends:tab', 'news');
  const [restoredAt, setRestoredAt] = usePageState<string | null>('trends:restoredAt', null);
  // Trend intelligence filters (shared by the scan and the topic's platform signals).
  const [platform, setPlatform] = usePageState<PlatformFilter>('trends:platform', 'all');
  const [win, setWin] = usePageState<TrendWindow>('trends:window', '24h');
  const [scanCountry, setScanCountry] = usePageState('trends:scanCountry', 'gh');
  const [scan, setScan] = usePageState<TrendsResponse | null>('trends:scan', null);
  const [scanError, setScanError] = usePageState('trends:scanError', '');
  const [signals, setSignals] = usePageState<TrendsResponse | null>('trends:signals', null);
  const [signalsError, setSignalsError] = usePageState('trends:signalsError', '');
  const [scanning, setScanning] = useState(false);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [open, setOpen] = useState<{ trend: CrossPlatformTrend; region: string } | null>(null);
  const scanCtrl = useRef<AbortController | null>(null);
  const signalsCtrl = useRef<AbortController | null>(null);

  const newSearch = () => {
    qi.cancel();
    cancel();
    scanCtrl.current?.abort();
    signalsCtrl.current?.abort();
    setOpen(null);
    clearPageState('trends');
  };

  /** Trending topics now: Google's list, news top stories, then the top topics checked on the chosen platforms. */
  const runScan = async () => {
    scanCtrl.current?.abort();
    const ctrl = new AbortController();
    scanCtrl.current = ctrl;
    setScanning(true);
    setScanError('');
    try {
      const out = await fetchTrends({ mode: 'discover', platforms: platformsFor(platform), window: win, country: scanCountry || undefined }, ctrl.signal);
      if (!ctrl.signal.aborted) setScan(out);
    } catch (e) {
      if (!ctrl.signal.aborted) setScanError((e as Error).message);
    } finally {
      if (scanCtrl.current === ctrl) { scanCtrl.current = null; setScanning(false); }
    }
  };

  /** The topic on each selected platform (runs alongside the topic search). */
  const runSignals = async (term: string, cc: string): Promise<TrendsResponse | null> => {
    signalsCtrl.current?.abort();
    const ctrl = new AbortController();
    signalsCtrl.current = ctrl;
    setSignalsLoading(true);
    setSignalsError('');
    try {
      const out = await fetchTrends({ mode: 'topic', term, platforms: platformsFor(platform), window: win, country: cc || undefined }, ctrl.signal);
      if (!ctrl.signal.aborted) setSignals(out);
      return out;
    } catch (e) {
      if (!ctrl.signal.aborted) { setSignals(null); setSignalsError((e as Error).message); }
      return null;
    } finally {
      if (signalsCtrl.current === ctrl) { signalsCtrl.current = null; setSignalsLoading(false); }
    }
  };

  const search = async (o: { t?: string; cc?: string; tf?: string; keepOriginal?: boolean; chosen?: string } = {}) => {
    try {
      await searchTopic(o);
    } catch (e) {
      // Never leave an unhandled rejection: show what went wrong instead.
      setError((e as Error)?.message || 'The search could not be completed. Try again.');
    }
  };

  const searchTopic = async (o: { t?: string; cc?: string; tf?: string; keepOriginal?: boolean; chosen?: string }) => {
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
      { key: 'web', label: 'Web', capability: 'web', query: main, options: { country: cc || undefined, when } }
    ];
    setSignals(null);
    // Platform signals (Google's trending list, news, X, YouTube, Reddit...) run alongside; one failing never stops the other.
    const signalsRun = list.length === 1 ? runSignals(main, cc) : Promise.resolve(null);
    const out = await run(tasks);
    const sig = await signalsRun;
    if (!out) return;
    setResults(out);
    if (list.length === 1) qi.learnFromResults(checked.query, [...(out.news?.items || []), ...(out.web?.items || [])].map(i => `${i.title} ${i.snippet || ''}`), 'results');
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
    }, { page: 'trends', payload: { results: out, terms: list.join(', '), country: cc, timeframe: tf, tab: firstTab, intel: checked.intel, signals: sig } });
  };

  usePageSearch(p => {
    setTerms(p.get('q') || ''); setCountry(p.get('country') || ''); setTimeframe(p.get('tf') || 'today 12-m');
    search({ t: p.get('q') || '', cc: p.get('country') || '', tf: p.get('tf') || 'today 12-m' });
  }, (payload, savedAt) => {
    const d = payload as { results: Record<string, ExploreResponse>; terms: string; country: string; timeframe: string; tab: Tab; intel: QueryIntel | null; signals?: TrendsResponse | null };
    setResults(d.results); setTerms(d.terms); setCountry(d.country); setTimeframe(d.timeframe); setTab(d.tab);
    setSignals(d.signals || null); setSignalsError('');
    qi.setIntel(d.intel); setError(''); setRestoredAt(savedAt);
  });


  const extra = results?.trends?.extra || {};
  const timeline = (extra.timeline || []) as Point[];
  const top = (extra.relatedTop || []) as Array<{ query: string; value: string }>;
  const rising = (extra.relatedRising || []) as Array<{ query: string; value: string }>;
  const byRegion = (extra.byRegion || []) as Array<{ location: string; values: Array<{ query: string; value: number }> }>;
  const topicsTop = (extra.topicsTop || []) as Array<{ title: string; type: string; value: string }>;
  const topicsRising = (extra.topicsRising || []) as Array<{ title: string; type: string; value: string }>;
  const combined = results ? mergeResponses('trends', terms, Object.values(results)) : null;
  const chartDirection = timeline.length && timeline[0].values.length === 1 ? timelineDirection(timeline.map(t => t.values[0]?.value || 0)) : null;
  const deepDive = (topic: string) => {
    const cc = country || scan?.country || '';
    setOpen(null);
    setTerms(topic);
    if (cc !== country) setCountry(cc);
    search({ t: topic, cc });
  };
  const platformNote = platform === 'all'
    ? `All = ${ALL_PLATFORMS.discover.map(p => PLATFORM_LABEL[p]).join(', ')} when scanning; ${ALL_PLATFORMS.topic.map(p => PLATFORM_LABEL[p]).join(', ')} for a topic. Pick one platform to check only that one.`
    : `${PLATFORM_LABEL[platform]} only.`;

  return (
    <ExplorePage title="Trends" subtitle="How public interest in a name, organisation, place or topic changes over time — and what news, social platforms and the web are saying about it."
      actions={results || running || scan ? <button type="button" className="ex-btn ex-btn-ghost" onClick={newSearch}><RotateCcw size={15} /> New search</button> : undefined}>
      <section className="ex-card tr-intel">
        <div className="ex-card-head" style={{ flexWrap: 'wrap' }}>
          <h2 className="ex-card-title"><Flame size={15} style={{ verticalAlign: -2, color: 'var(--accent-warm)' }} /> Trending now</h2>
          <span className="ex-muted ex-small">Google's official list is labelled as such; other platforms are signals measured from search results.</span>
        </div>
        <div className="ex-card-pad tr-filters">
          <Field label="Platform">
            <Segmented<PlatformFilter> label="Platform" value={platform} onChange={setPlatform} options={PLATFORM_FILTERS} />
          </Field>
          <Field label="Time">
            <Segmented<TrendWindow> label="Time window" value={win} onChange={setWin} options={WINDOW_OPTIONS} />
          </Field>
          <Field label="Location" htmlFor="tr-loc">
            <select id="tr-loc" className="ex-input ex-select" value={scanCountry} onChange={e => setScanCountry(e.target.value)}>
              {COUNTRY_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.code ? o.label : 'Worldwide'}</option>)}
            </select>
          </Field>
          <button type="button" className="ex-btn ex-btn-primary" onClick={runScan} disabled={scanning}><Flame size={16} /> {scanning ? 'Scanning…' : 'Scan trends'}</button>
          <span className="ex-muted ex-small tr-note">
            {platformNote}{!scanCountry ? " Google Trends has no worldwide list — choose a country to include it." : ''}
          </span>
          <CostHint range={trendsSignalCost({ mode: 'discover', platforms: platformsFor(platform), country: scanCountry || undefined })} what="A scan"
            note="Trending lists, news and X posts are cached for 30 minutes, so scanning again soon uses nothing." />
        </div>
        {scanning && (
          <div className="ex-pad">
            <SearchLoader title="Scanning trends" steps={[{ id: 'scan', label: 'Google Trends, news top stories and platform checks', state: 'active' }]} onCancel={() => scanCtrl.current?.abort()} />
          </div>
        )}
        {!scanning && scanError && <div className="ex-pad ex-notice">{scanError}</div>}
        {!scanning && !scanError && !scan && (
          <div className="ex-pad ex-muted ex-small">Scan what is trending now in a country, per platform and time window. Click a row for its sources and details.</div>
        )}
        {!scanning && scan && (
          <>
            <SourceStrip sources={scan.sources} />
            {scan.trends.length === 0
              ? <div className="ex-pad ex-muted ex-small">No trends were found for these filters. The source chips above say what each platform returned.</div>
              : <TrendRows trends={scan.trends} selectedId={open?.trend.id} onOpen={t => setOpen({ trend: t, region: regionName(scan.country) })} />}
            <div className="ex-pad ex-muted ex-small tr-foot">
              {regionName(scan.country)} · {WINDOW_OPTIONS.find(w => w.value === scan.window)?.label} · updated {fmtDate(scan.generatedAt, true)} · {scan.searchesUsed} search{scan.searchesUsed === 1 ? '' : 'es'} used
              {scan.notices.slice(1).map(n => <span key={n}> · {n}</span>)}
              {scan.ai.used ? <span> · Grouped and categorised by AI ({scan.ai.model}) from the listed results only</span> : scan.ai.note ? <span> · {scan.ai.note}</span> : null}
            </div>
          </>
        )}
      </section>

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
        {(() => {
          const list = terms.split(',').map(t => t.trim()).filter(Boolean);
          return <CostHint range={addCosts(trendsRange(list[0] || 'x', country || undefined, Math.max(1, list.length), Boolean(WHEN_FOR[timeframe])), list.length > 1 ? { min: 0, max: 0 } : addCosts(spellingCheck(list[0] || 'x', searchMode === 'intelligent'), trendsSignalCost({ mode: 'topic', platforms: platformsFor(platform), country: country || undefined })))}
            note="Google Trends (interest over time, related queries, by region, related topics), news, 6 social platforms and Google web, plus the topic on the platforms chosen above for the chosen time window. Comparing several terms skips related queries, topics and platform signals." />;
        })()}
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

      <div className="tr-col">
          {!running && !results && (
            <EmptyState icon={<TrendingUp size={24} />} title="Explore a topic">Enter a topic to chart its popularity on Google and see what is being published about it on each platform.</EmptyState>
          )}
          {!running && results && (signals || signalsError || signalsLoading) && (
            <section className="ex-card">
              <div className="ex-card-head" style={{ flexWrap: 'wrap' }}>
                <h2 className="ex-card-title">Across platforms</h2>
                {signals && <span className="ex-muted ex-small">{regionName(signals.country)} · {WINDOW_OPTIONS.find(w => w.value === signals.window)?.label} · {signals.searchesUsed} search{signals.searchesUsed === 1 ? '' : 'es'} used</span>}
              </div>
              {signalsLoading ? <div className="ex-pad ex-muted ex-small">Checking platforms…</div>
                : signalsError ? <div className="ex-pad ex-notice">{signalsError}</div>
                : signals && (
                  <>
                    <SourceStrip sources={signals.sources} />
                    {signals.trends.length === 0
                      ? <div className="ex-pad ex-muted ex-small">The topic was not found on the checked platforms in this time window.</div>
                      : <TrendRows trends={signals.trends} selectedId={open?.trend.id} onOpen={t => setOpen({ trend: t, region: regionName(signals.country) })} />}
                  </>
                )}
            </section>
          )}
          {!running && results && (
            timeline.length === 0 ? (
              <EmptyState title="Not enough Google Trends data">
                Google Trends has too little search volume for this term in this period and country, so there is no interest chart.
                What news, social platforms and the web say about it is listed below.
              </EmptyState>
            ) : (
              <section className="ex-card">
                <div className="ex-card-head">
                  <h2 className="ex-card-title">Interest over time</h2>
                  {chartDirection && <DirectionPill direction={chartDirection.direction} basis={chartDirection.basis} />}
                </div>
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
            <section className="ex-card">
              <div className="ex-card-head">
                <h2 className="ex-card-title">Interest by region</h2>
                <span className="ex-muted ex-small">{country ? `Regions of ${COUNTRY_OPTIONS.find(c => c.code === country)?.label || country.toUpperCase()}` : 'Countries'} · 100 = the place with the most interest</span>
              </div>
              {byRegion.length === 0 ? (
                <div className="ex-pad ex-muted ex-small">Google Trends reported no regional breakdown for this term (too little search volume).</div>
              ) : (
                <div className="ex-pad" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {byRegion.filter(r => r.values.some(v => v.value > 0)).slice(0, 15).map(r => (
                    <div key={r.location} className="ex-trend-region">
                      <span className="ex-trend-region-name">{r.location}</span>
                      <span className="ex-trend-region-bars">
                        {r.values.map((v, s2) => (
                          <span key={`${r.location}-${s2}`} className="ex-bar-track" title={`${v.query || terms}: ${v.value}`}>
                            <span className="ex-bar-fill" style={{ width: `${v.value}%`, background: SERIES_COLORS[s2 % SERIES_COLORS.length] }} />
                          </span>
                        ))}
                      </span>
                      <span className="ex-muted ex-mono">{r.values.map(v => v.value).join(' / ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          {!running && (topicsTop.length > 0 || topicsRising.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {([['Top related topics', topicsTop], ['Rising related topics', topicsRising]] as const).map(([title, list]) => (
                <section className="ex-card" key={title}>
                  <div className="ex-card-head"><h2 className="ex-card-title">{title}</h2></div>
                  {list.length === 0 ? <div className="ex-pad ex-muted ex-small">None reported.</div> : list.map(t => (
                    <button type="button" key={`${t.title}-${t.type}`} className="ex-kv ex-kv-btn" onClick={() => setTerms(t.title)} title="Use this topic">
                      <span>{t.title}{t.type ? <span className="ex-muted"> · {t.type}</span> : null}</span><span className="ex-muted ex-mono">{t.value}</span>
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
      {open && <TrendDetail trend={open.trend} region={open.region} onClose={() => setOpen(null)} onSearchTopic={deepDive} />}
    </ExplorePage>
  );
};
