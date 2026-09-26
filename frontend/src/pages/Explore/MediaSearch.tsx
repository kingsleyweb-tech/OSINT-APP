import React, { useState } from 'react';
import { Search, Image as ImageIcon, Film, ScanSearch, ScanFace } from 'lucide-react';
import { ExplorePage, Field, Segmented, EngineStatus, ResultList, EmptyState } from '../../components/explore/ExploreKit';
import { useSearchRun } from '../../components/explore/useSearchRun';
import { usePageSearch } from '../../components/explore/usePageSearch';
import { SearchLoader } from '../../components/ui/SearchLoader';
import { recordSearch, topFromItems } from '../../lib/history';
import { COUNTRY_OPTIONS, type ExploreResponse } from '../../lib/exploreClient';
import { useQueryIntel, useSearchMode } from '../../components/search/useIntelligentSearch';
import { QueryIntelBanner, SearchModeToggle } from '../../components/search/QueryIntelBanner';
import { intelHistoryFields } from '../../lib/queryIntelClient';
import { useCases } from '../../components/explore/exploreHooks';

type Tab = 'images' | 'videos' | 'reverseImage' | 'faces';

const TAB_INFO: Record<Exclude<Tab, 'faces'>, { cost: string; placeholder: string }> = {
  images: { cost: 'Uses 2 SerpApi searches (Google Images + Bing Images).', placeholder: 'e.g. "Hubert Amponsah"' },
  videos: { cost: 'Uses 2 SerpApi searches (YouTube + Google Videos).', placeholder: 'e.g. Adjoa Tee interview' },
  reverseImage: { cost: 'Uses 2 SerpApi searches (Google Lens + Google Reverse Image).', placeholder: 'https://example.com/photo.jpg' }
};

export const MediaSearchPage: React.FC = () => {
  const { run, cancel, running, steps } = useSearchRun();
  const [searchMode, setSearchMode] = useSearchMode();
  const qi = useQueryIntel();
  const { cases } = useCases();
  const [tab, setTab] = useState<Tab>('images');
  const [query, setQuery] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [response, setResponse] = useState<ExploreResponse | null>(null);

  const switchTab = (t: Tab) => { cancel(); setTab(t); setResponse(null); setError(''); };

  const search = async (o: { tab?: Tab; q?: string; url?: string; keepOriginal?: boolean; chosen?: string } = {}) => {
    const t = o.tab ?? tab;
    if (t === 'faces') return;
    const q = (o.q ?? query).trim();
    const url = (o.url ?? imageUrl).trim();
    setError('');
    if (t === 'reverseImage') {
      if (!/^https?:\/\/\S+$/i.test(url)) { setError('Paste a public image link starting with http:// or https://.'); return; }
    } else if (q.length < 2) { setError('Enter at least 2 characters.'); return; }
    // Reverse image has no text to check.
    const checked = t === 'reverseImage' ? { query: '', intel: null } : await qi.check(q, 'topic', searchMode, { country: country || undefined, knownNames: cases.map(c => c.name), keepOriginal: o.keepOriginal, chosen: o.chosen });
    if (!checked) return;
    const out = await run([{ key: 'r', capability: t, query: checked.query, options: { country: country || undefined, ...(t === 'reverseImage' ? { imageUrl: url } : {}) } }]);
    if (!out) return;
    setResponse(out.r);
    if (t !== 'reverseImage') qi.learnFromResults(checked.query, out.r.items.map(i => i.title), 'results');
    recordSearch({
      ...intelHistoryFields(checked.intel), sources: out.r.engines.map(e => e.label),
      category: t, query: t === 'reverseImage' ? url : q, resultCount: out.r.items.length, searchesUsed: out.r.stats.searchesUsed, topResults: topFromItems(out.r.items),
      params: t === 'reverseImage' ? { tab: t, url } : { tab: t, q }
    });
  };

  usePageSearch(p => {
    const t = (p.get('tab') as Tab) || 'images';
    setTab(t); setQuery(p.get('q') || ''); setImageUrl(p.get('url') || '');
    search({ tab: t, q: p.get('q') || '', url: p.get('url') || '' });
  });

  return (
    <ExplorePage title="Media" subtitle="Find public images and videos, and see where an image is published online.">
      <Segmented<Tab> label="Media type" value={tab} onChange={switchTab} options={[
        { value: 'images', label: 'Images' },
        { value: 'videos', label: 'Videos' },
        { value: 'reverseImage', label: 'Reverse image' },
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
            <p className="ex-sub" style={{ marginTop: 0 }}>
              To see where a specific image is published online, use <button type="button" className="ex-chip" onClick={() => switchTab('reverseImage')}>Reverse image</button>.
              Reverse image search finds copies and similar images — it does not identify people.
            </p>
          </div>
        </section>
      ) : (
        <>
          <form className="ex-card ex-card-pad ex-form" onSubmit={e => { e.preventDefault(); search(); }}>
            {tab === 'reverseImage' ? (
              <Field label="Public image link" htmlFor="md-url" grow>
                <input id="md-url" className="ex-input" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder={TAB_INFO.reverseImage.placeholder} inputMode="url" maxLength={2000} />
              </Field>
            ) : (
              <Field label={tab === 'images' ? 'Search images for' : 'Search videos for'} htmlFor="md-q" grow>
                <input id="md-q" className="ex-input" value={query} onChange={e => setQuery(e.target.value)} placeholder={TAB_INFO[tab].placeholder} maxLength={200} />
              </Field>
            )}
            <Field label="Country" htmlFor="md-country">
              <select id="md-country" className="ex-input ex-select" value={country} onChange={e => setCountry(e.target.value)}>
                {COUNTRY_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
              </select>
            </Field>
            {tab !== 'reverseImage' && <SearchModeToggle mode={searchMode} onChange={setSearchMode} />}
            <button type="submit" className="ex-btn ex-btn-primary" disabled={running || qi.checking}><Search size={16} /> Search</button>
            {error && <div className="ex-notice" style={{ width: '100%' }}>{error}</div>}
            <span className="ex-muted ex-small" style={{ width: '100%' }}>
              {TAB_INFO[tab].cost}{tab === 'reverseImage' && ' Some sites block search engines from reading their images; if nothing is found, try a different copy of the image.'}
            </span>
          </form>

          {running || qi.checking ? <SearchLoader query={tab === 'reverseImage' ? 'where this image appears' : query} steps={[...qi.step, ...steps]} onCancel={() => { qi.cancel(); cancel(); }} /> : (
            <>
              {tab !== 'reverseImage' && <QueryIntelBanner intel={qi.intel} cases={cases} resultCount={response?.items.length} sources={response?.engines.map(e => e.label)}
        onSearch={q2 => { setQuery(q2); search({ q: q2, chosen: qi.intel?.corrections.some(c => c.query === q2) ? q2 : undefined }); }}
        onSearchOriginal={() => { if (qi.intel) search({ q: qi.intel.original, keepOriginal: true }); }} />}
              <EngineStatus response={response} />
            </>
          )}

          {!running && (response ? (
            <ResultList items={response.items} query={response.query} savedFrom={tab === 'images' ? 'Image search' : tab === 'videos' ? 'Video search' : 'Reverse image search'}
              grid={tab === 'images'} kindFilter={tab !== 'images'}
              emptyText={tab === 'reverseImage' ? 'No pages using this image were found.' : undefined} />
          ) : (
            <EmptyState icon={tab === 'images' ? <ImageIcon size={24} /> : tab === 'videos' ? <Film size={24} /> : <ScanSearch size={24} />}
              title={tab === 'images' ? 'Search public images' : tab === 'videos' ? 'Search public videos' : 'Find where an image appears'}>
              {tab === 'reverseImage'
                ? 'Results are pages showing the same or a visually similar image. A visual match is not proof of who is in a photo.'
                : 'Each result links to the page it came from. Save useful results to a case.'}
            </EmptyState>
          ))}
        </>
      )}
    </ExplorePage>
  );
};
