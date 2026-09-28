import React from 'react';
import { Search, Image as ImageIcon, Film, ScanFace, RotateCcw } from 'lucide-react';
import { ExplorePage, Field, Segmented, EngineStatus, ResultList, EmptyState } from '../../components/explore/ExploreKit';
import { useSearchRun } from '../../components/explore/useSearchRun';
import { usePageSearch } from '../../components/explore/usePageSearch';
import { SearchLoader } from '../../components/ui/SearchLoader';
import { recordSearch, topFromItems } from '../../lib/history';
import { COUNTRY_OPTIONS, type ExploreResponse } from '../../lib/exploreClient';
import { useQueryIntel, useSearchMode } from '../../components/search/useIntelligentSearch';
import { QueryIntelBanner, SearchModeToggle } from '../../components/search/QueryIntelBanner';
import { intelHistoryFields, type QueryIntel } from '../../lib/queryIntelClient';
import { clearPageState, usePageState } from '../../lib/pageState';
import { fmtDate } from '../../lib/workspace';
import { useCases } from '../../components/explore/exploreHooks';

type Tab = 'images' | 'videos' | 'faces';
const TABS: Tab[] = ['images', 'videos', 'faces'];
/** A tab kept from an older version of the page (e.g. the removed reverse image tab) falls back to Images. */
const validTab = (t: unknown): Tab => (TABS.includes(t as Tab) ? (t as Tab) : 'images');

const TAB_INFO: Record<Exclude<Tab, 'faces'>, { cost: string; placeholder: string }> = {
  images: { cost: 'Uses 2 SerpApi searches (Google Images + Bing Images).', placeholder: 'e.g. "Hubert Amponsah"' },
  videos: { cost: 'Uses 2 SerpApi searches (YouTube + Google Videos).', placeholder: 'e.g. Adjoa Tee interview' }
};

export const MediaSearchPage: React.FC = () => {
  // Everything on this page is kept when you leave it (until "New search").
  const { run, cancel, running, steps } = useSearchRun('media:run');
  const [searchMode, setSearchMode] = useSearchMode();
  const qi = useQueryIntel('media:qi');
  const { cases } = useCases();
  const [storedTab, setTab] = usePageState<Tab>('media:tab', 'images');
  const tab = validTab(storedTab);
  const [query, setQuery] = usePageState('media:query', '');
  const [country, setCountry] = usePageState('media:country', '');
  const [error, setError] = usePageState('media:error', '');
  const [response, setResponse] = usePageState<ExploreResponse | null>('media:response', null);
  const [restoredAt, setRestoredAt] = usePageState<string | null>('media:restoredAt', null);

  const switchTab = (t: Tab) => { cancel(); setTab(t); setResponse(null); setError(''); setRestoredAt(null); };
  const newSearch = () => {
    qi.cancel();
    cancel();
    clearPageState('media');
  };

  const search = async (o: { tab?: Tab; q?: string; keepOriginal?: boolean; chosen?: string } = {}) => {
    const t = validTab(o.tab ?? tab);
    if (t === 'faces') return;
    const q = (o.q ?? query).trim();
    setError('');
    setRestoredAt(null);
    if (q.length < 2) { setError('Enter at least 2 characters.'); return; }
    const checked = await qi.check(q, 'topic', searchMode, { country: country || undefined, knownNames: cases.map(c => c.name), keepOriginal: o.keepOriginal, chosen: o.chosen });
    if (!checked) return;
    const out = await run([{ key: 'r', capability: t, query: checked.query, options: { country: country || undefined } }]);
    if (!out) return;
    setResponse(out.r);
    qi.learnFromResults(checked.query, out.r.items.map(i => i.title), 'results');
    recordSearch({
      ...intelHistoryFields(checked.intel), sources: out.r.engines.map(e => e.label),
      category: t, query: q, resultCount: out.r.items.length, searchesUsed: out.r.stats.searchesUsed, topResults: topFromItems(out.r.items),
      params: { tab: t, q }
    }, { page: 'media', payload: { response: out.r, tab: t, query: q, country, intel: checked.intel } });
  };

  usePageSearch(p => {
    const t = validTab(p.get('tab'));
    setTab(t); setQuery(p.get('q') || '');
    search({ tab: t, q: p.get('q') || '' });
  }, (payload, savedAt) => {
    const d = payload as { response: ExploreResponse; tab: Tab; query: string; country: string; intel: QueryIntel | null };
    setResponse(d.response); setTab(validTab(d.tab)); setQuery(d.query); setCountry(d.country || '');
    qi.setIntel(d.intel); setError(''); setRestoredAt(savedAt);
  });

  return (
    <ExplorePage title="Media" subtitle="Find public images and videos."
      actions={response || running ? <button type="button" className="ex-btn ex-btn-ghost" onClick={newSearch}><RotateCcw size={15} /> New search</button> : undefined}>
      <Segmented<Tab> label="Media type" value={tab} onChange={switchTab} options={[
        { value: 'images', label: 'Images' },
        { value: 'videos', label: 'Videos' },
        { value: 'faces', label: 'Facial recognition' }
      ]} />

      {tab === 'faces' ? (
        <section className="ex-card ex-soon">
          <ScanFace size={28} style={{ color: 'var(--accent-warm)', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <h2 className="ex-card-title">Facial recognition</h2>
              <span className="ex-soon-badge">Coming soon — API required</span>
            </div>
            <p className="ex-sub" style={{ marginTop: 0 }}>
              Face matching is not enabled. No photos are uploaded and no face comparisons are made. It needs a dedicated
              facial-recognition provider, which has not been connected yet.
            </p>
          </div>
        </section>
      ) : (
        <>
          <form className="ex-card ex-card-pad ex-form" onSubmit={e => { e.preventDefault(); search(); }}>
            <Field label={tab === 'images' ? 'Search images for' : 'Search videos for'} htmlFor="md-q" grow>
              <input id="md-q" className="ex-input" value={query} onChange={e => setQuery(e.target.value)} placeholder={TAB_INFO[tab].placeholder} maxLength={200} />
            </Field>
            <Field label="Country" htmlFor="md-country">
              <select id="md-country" className="ex-input ex-select" value={country} onChange={e => setCountry(e.target.value)}>
                {COUNTRY_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
              </select>
            </Field>
            <SearchModeToggle mode={searchMode} onChange={setSearchMode} />
            <button type="submit" className="ex-btn ex-btn-primary" disabled={running || qi.checking}><Search size={16} /> Search</button>
            {error && <div className="ex-notice" style={{ width: '100%' }}>{error}</div>}
            <span className="ex-muted ex-small" style={{ width: '100%' }}>{TAB_INFO[tab].cost}</span>
          </form>

          {running || qi.checking ? <SearchLoader query={query} steps={[...qi.step, ...steps]} onCancel={() => { qi.cancel(); cancel(); }} /> : (
            <>
              <QueryIntelBanner intel={qi.intel} cases={cases} resultCount={response?.items.length} sources={response?.engines.map(e => e.label)}
                onSearch={q2 => { setQuery(q2); search({ q: q2, chosen: qi.intel?.corrections.some(c => c.query === q2) ? q2 : undefined }); }}
                onSearchOriginal={() => { if (qi.intel) search({ q: qi.intel.original, keepOriginal: true }); }} />
              {restoredAt && response && <div className="ex-notice">Saved results from {fmtDate(restoredAt, true)} — no searches were used. Search again for the latest results.</div>}
              <EngineStatus response={response} />
            </>
          )}

          {!running && (response ? (
            <ResultList items={response.items} query={response.query} savedFrom={tab === 'images' ? 'Image search' : 'Video search'}
              grid={tab === 'images'} kindFilter={tab !== 'images'} />
          ) : (
            <EmptyState icon={tab === 'images' ? <ImageIcon size={24} /> : <Film size={24} />}
              title={tab === 'images' ? 'Search public images' : 'Search public videos'}>
              Each result links to the page it came from. Save useful results to a case.
            </EmptyState>
          ))}
        </>
      )}
    </ExplorePage>
  );
};
