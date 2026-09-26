import React, { useMemo } from 'react';
import { Search, MapPin, Star, Globe2, RotateCcw } from 'lucide-react';
import { ExplorePage, Field, Segmented, EngineStatus, ResultList, EmptyState } from '../../components/explore/ExploreKit';
import { useSearchRun, type SearchTask } from '../../components/explore/useSearchRun';
import { usePageSearch } from '../../components/explore/usePageSearch';
import { SearchLoader } from '../../components/ui/SearchLoader';
import { recordSearch, topFromItems } from '../../lib/history';
import {
  COUNTRY_OPTIONS, SOCIAL_PLATFORM_OPTIONS, mergeResponses,
  type ExploreResponse, type ExploreItem
} from '../../lib/exploreClient';
import { useSearchRun as useReviewRun } from '../../components/explore/useSearchRun';
import { useQueryIntel, useSearchMode } from '../../components/search/useIntelligentSearch';
import { QueryIntelBanner, SearchModeToggle } from '../../components/search/QueryIntelBanner';
import { intelHistoryFields } from '../../lib/queryIntelClient';
import { useCases } from '../../components/explore/exploreHooks';
import { clearPageState, usePageState } from '../../lib/pageState';
import { useTheme } from '../../context/ThemeContext';
import { fmtDate } from '../../lib/workspace';
import type { QueryIntel } from '../../lib/queryIntelClient';

type Tab = 'places' | 'news' | 'social' | 'web' | 'events' | 'similar';

/** OpenStreetMap embed centred on a point (no API key, no tracking script). */
function osmEmbed(lat: number, lng: number): string {
  const d = 0.012;
  const bbox = [lng - d, lat - d * 0.6, lng + d, lat + d * 0.6].map(n => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/** Google Maps satellite view centred on a point (the keyless embed; 5e1 = satellite imagery). */
function satelliteEmbed(lat: number, lng: number): string {
  return `https://www.google.com/maps/embed?origin=mfe&pb=!1m4!2m1!1s${lat.toFixed(6)},${lng.toFixed(6)}!5e1!6i17`;
}

type MapView = 'map' | 'satellite';

/** Country from the end of an address ("…, Accra, Ghana" → "Ghana"). */
function countryOf(item: ExploreItem): string {
  const parts = (item.location?.address || item.snippet || '').split(',').map(s => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || 'Unknown';
}

const TAB_LABEL: Record<Tab, string> = { places: 'Places', news: 'News', social: 'Social', web: 'Web', events: 'Events', similar: 'Similar places worldwide' };

export const GeoSearchPage: React.FC = () => {
  // Everything on this page is kept when you leave it (until "New search").
  const { run, cancel, running, steps } = useSearchRun('geo:run');
  const [searchMode, setSearchMode] = useSearchMode();
  const qi = useQueryIntel('geo:qi');
  const { cases } = useCases();
  const reviewsRun = useReviewRun('geo:reviews');
  const [keyword, setKeyword] = usePageState('geo:keyword', '');
  const [place, setPlace] = usePageState('geo:place', '');
  const [country, setCountry] = usePageState('geo:country', '');
  const [error, setError] = usePageState('geo:error', '');
  const [results, setResults] = usePageState<Partial<Record<Tab, ExploreResponse>> | null>('geo:results', null);
  const [tab, setTab] = usePageState<Tab>('geo:tab', 'places');
  const [searched, setSearched] = usePageState('geo:searched', '');
  const [selectedId, setSelectedId] = usePageState<string | null>('geo:selectedId', null);
  const [reviews, setReviews] = usePageState<Record<string, ExploreResponse | string>>('geo:reviews', {});
  const [restoredAt, setRestoredAt] = usePageState<string | null>('geo:restoredAt', null);
  const [mapView, setMapView] = usePageState<MapView>('geo:mapView', 'map');
  const { theme } = useTheme();

  const newSearch = () => {
    qi.cancel();
    cancel();
    reviewsRun.cancel();
    clearPageState('geo');
  };

  const search = async (o: { what?: string; where?: string; cc?: string; keepOriginal?: boolean; chosen?: string } = {}) => {
    const what = (o.what ?? keyword).trim();
    const whereTyped = (o.where ?? place).trim();
    const cc = o.cc ?? country;
    if (whereTyped.length < 2) { setError('Enter a place, area or address (at least 2 characters).'); return; }
    setError('');
    setRestoredAt(null);
    // Search intelligence on the place name (e.g. "Kumasii" → "Kumasi"), only with high confidence.
    const checked = await qi.check(whereTyped, 'topic', searchMode, { country: cc || undefined, knownNames: cases.map(c => c.name), keepOriginal: o.keepOriginal, chosen: o.chosen });
    if (!checked) return;
    const where = checked.query;
    const countryName = COUNTRY_OPTIONS.find(c => c.code === cc && c.code)?.label || '';
    // The country is written into the query text: Google Maps has no country filter, so "osu" alone matched Ohio State.
    const placeText = [where, countryName].filter(Boolean).join(', ');
    const topic = `${what ? `${what} ` : ''}"${where}"${countryName ? ` ${countryName}` : ''}`;
    // With a list of site: filters Google drops unquoted words, so every term is quoted for social search.
    const socialTopic = `${what ? `"${what}" ` : ''}"${where}"${countryName ? ` "${countryName}"` : ''}`;
    const tasks: SearchTask[] = [
      // "places in Osu, Ghana" lists the businesses and landmarks there; "Osu, Ghana" alone returns only the area itself.
      { key: 'places', label: 'Places', capability: 'places', query: `${what || 'places'} in ${placeText}` },
      { key: 'news', label: 'News', capability: 'news', query: topic, options: { country: cc || undefined } },
      { key: 'social', label: 'Social', capability: 'social', query: socialTopic, options: { country: cc || undefined, platforms: SOCIAL_PLATFORM_OPTIONS.filter(p => p.default).map(p => p.id) } },
      { key: 'web', label: 'Web', capability: 'web', query: topic, options: { country: cc || undefined } },
      { key: 'events', label: 'Events', capability: 'events', query: `${what || 'events'} in ${placeText}`, options: { country: cc || undefined } }
    ];
    if (!cc) tasks.push({ key: 'similar', label: 'Similar places', capability: 'placeLookup', query: where });
    const out = await run(tasks);
    if (!out) return;
    setResults(out as Partial<Record<Tab, ExploreResponse>>);
    setSearched(placeText + (what ? ` · ${what}` : ''));
    setSelectedId(null);
    setReviews({});
    const firstWithResults = (['places', 'news', 'social', 'web', 'events', 'similar'] as Tab[]).find(t => out[t]?.items.length);
    const searchedText = placeText + (what ? ` · ${what}` : '');
    setTab(firstWithResults || 'places');
    const all = Object.values(out);
    recordSearch({
      ...intelHistoryFields(checked.intel),
      category: 'geo', query: whereTyped, detail: [what, countryName || 'Any country'].filter(Boolean).join(' · '),
      resultCount: all.reduce((n, r) => n + r.items.length, 0), searchesUsed: all.reduce((n, r) => n + r.stats.searchesUsed, 0),
      topResults: topFromItems([...(out.places?.items || []).slice(0, 4), ...(out.news?.items || []).slice(0, 4)]),
      params: { place: whereTyped, ...(what ? { q: what } : {}), ...(cc ? { country: cc } : {}) }
    }, { page: 'geo', payload: { results: out, searched: searchedText, tab: firstWithResults || 'places', keyword: what, place: whereTyped, country: cc, intel: checked.intel } });
  };

  usePageSearch(p => {
    setKeyword(p.get('q') || ''); setPlace(p.get('place') || ''); setCountry(p.get('country') || '');
    search({ what: p.get('q') || '', where: p.get('place') || '', cc: p.get('country') || '' });
  }, (payload, savedAt) => {
    const d = payload as { results: Partial<Record<Tab, ExploreResponse>>; searched: string; tab: Tab; keyword: string; place: string; country: string; intel: QueryIntel | null };
    setResults(d.results); setSearched(d.searched); setTab(d.tab); setKeyword(d.keyword); setPlace(d.place); setCountry(d.country);
    qi.setIntel(d.intel); setSelectedId(null); setReviews({}); setError(''); setRestoredAt(savedAt);
  });

  const loadReviews = async (item: ExploreItem) => {
    const dataId = item.metadata?.dataId;
    if (!dataId) return;
    const out = await reviewsRun.run([{ key: 'r', capability: 'placeReviews', query: '', options: { dataId } }]);
    setReviews(prev => ({ ...prev, [item.id]: out ? out.r : 'Reviews could not be loaded.' }));
  };

  const places = results?.places;
  const located = useMemo(() => (places?.items || []).filter(i => i.location?.lat != null && i.location?.lng != null), [places]);
  const focus = located.find(i => i.id === selectedId) || located[0];
  const similarByCountry = useMemo(() => {
    const m = new Map<string, ExploreItem[]>();
    (results?.similar?.items || []).forEach(i => m.set(countryOf(i), [...(m.get(countryOf(i)) || []), i]));
    return Array.from(m.entries());
  }, [results]);
  const tabs = (Object.keys(TAB_LABEL) as Tab[]).filter(t => results?.[t]);
  const combined = results ? mergeResponses('places', searched, Object.values(results) as ExploreResponse[]) : null;

  return (
    <ExplorePage title="Geo search" subtitle="Everything public about a location: places and businesses, news, social posts, web pages and events. Pick a country to search only there, or Any country to see matching places worldwide."
      actions={results || running ? <button type="button" className="ex-btn ex-btn-ghost" onClick={newSearch}><RotateCcw size={15} /> New search</button> : undefined}>
      <form className="ex-card ex-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={e => { e.preventDefault(); search(); }}>
        <div className="ex-form">
          <Field label="Place, area or address" htmlFor="geo-p" grow>
            <input id="geo-p" className="ex-input" value={place} onChange={e => setPlace(e.target.value)} placeholder="e.g. Osu" maxLength={100} />
          </Field>
          <Field label="Country" htmlFor="geo-c">
            <select id="geo-c" className="ex-input ex-select" value={country} onChange={e => setCountry(e.target.value)}>
              {COUNTRY_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Looking for (optional)" htmlFor="geo-k" grow>
            <input id="geo-k" className="ex-input" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. restaurants, flooding, police station" maxLength={100} />
          </Field>
          <SearchModeToggle mode={searchMode} onChange={setSearchMode} />
          <button type="submit" className="ex-btn ex-btn-primary" disabled={running || qi.checking}><Search size={16} /> Search location</button>
        </div>
        {error && <div className="ex-notice">{error}</div>}
        <span className="ex-muted ex-small">Searches Google Maps, Google News, Bing News, social platforms, Google web and events together (6 SerpApi searches; 7 with Any country). Loading a place's reviews uses 1 more.</span>
      </form>

      {running || qi.checking ? <SearchLoader query={[keyword, place].filter(Boolean).join(' · ')} steps={[...qi.step, ...steps]} onCancel={() => { qi.cancel(); cancel(); }} /> : (
        <>
          <QueryIntelBanner intel={qi.intel} cases={cases} resultCount={combined?.items.length} sources={combined?.engines.map(e => e.label)}
        onSearch={q2 => { setPlace(q2); search({ where: q2, chosen: qi.intel?.corrections.some(c => c.query === q2) ? q2 : undefined }); }}
        onSearchOriginal={() => { if (qi.intel) search({ where: qi.intel.original, keepOriginal: true }); }} />
          {restoredAt && results && <div className="ex-notice">Saved results from {fmtDate(restoredAt, true)} — no searches were used. Search again for the latest results.</div>}
          <EngineStatus response={combined} />
        </>
      )}

      {!running && !results && (
        <EmptyState icon={<MapPin size={24} />} title="Search a location">
          For example "Osu" with Ghana selected returns places in Osu, Accra and what the news, social platforms and the web say about it.
          With Any country you also see places with the same or a similar name in other countries.
        </EmptyState>
      )}

      {!running && results && (
        <>
          <Segmented<Tab> label="Results" value={tab} onChange={setTab}
            options={tabs.map(t => ({ value: t, label: `${TAB_LABEL[t]} ${results[t]?.items.length ?? 0}` }))} />

          {tab === 'places' && (
            <>
              {focus && (
                <section className="ex-card" style={{ overflow: 'hidden' }}>
                  <div className="ex-card-head" style={{ flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <h2 className="ex-card-title">Map · {focus.title}</h2>
                      <span className="ex-muted ex-small">{focus.location?.address}</span>
                    </div>
                    <Segmented<MapView> label="Map view" value={mapView} onChange={setMapView}
                      options={[{ value: 'map', label: 'Map' }, { value: 'satellite', label: 'Satellite' }]} />
                  </div>
                  {/* The street map follows the app theme (darkened in dark mode); satellite imagery is shown as is. */}
                  <iframe key={`${focus.id}-${mapView}`} className={`ex-map${mapView === 'map' && theme === 'dark' ? ' ex-map-dark' : ''}`}
                    title={`${mapView === 'satellite' ? 'Satellite view' : 'Map'} of ${focus.title}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                    src={mapView === 'satellite' ? satelliteEmbed(focus.location!.lat!, focus.location!.lng!) : osmEmbed(focus.location!.lat!, focus.location!.lng!)} />
                </section>
              )}
              <ResultList items={places?.items || []} query={searched} savedFrom="Geo search" kindFilter={false}
                emptyText="Google Maps returned no places for this location."
                renderExtra={item => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="ex-row-meta">
                      {item.metadata?.type && <span>{item.metadata.type}</span>}
                      {item.metadata?.phone && <span>{item.metadata.phone}</span>}
                      {item.metadata?.website && <a href={item.metadata.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-warm)' }}>Website</a>}
                      {item.metadata?.hours && <span>{item.metadata.hours}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {item.location?.lat != null && (
                        <button type="button" className="ex-btn ex-btn-ghost ex-btn-sm" onClick={() => setSelectedId(item.id)}><MapPin size={13} /> Show on map</button>
                      )}
                      {item.metadata?.dataId && !reviews[item.id] && (
                        <button type="button" className="ex-btn ex-btn-ghost ex-btn-sm" disabled={reviewsRun.running} onClick={() => loadReviews(item)}><Star size={13} /> Load public reviews</button>
                      )}
                    </div>
                    {typeof reviews[item.id] === 'string' && <span className="ex-notice">{reviews[item.id] as string}</span>}
                    {typeof reviews[item.id] === 'object' && (
                      <div style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: 10 }}>
                        <ResultList items={(reviews[item.id] as ExploreResponse).items} savedFrom="Place reviews" kindFilter={false} emptyText="This place has no public reviews." />
                      </div>
                    )}
                  </div>
                )} />
              {reviewsRun.running && <SearchLoader title="Loading public reviews" steps={reviewsRun.steps} onCancel={reviewsRun.cancel} overlay />}
            </>
          )}

          {(['news', 'social', 'web', 'events'] as Tab[]).includes(tab) && results[tab] && (
            <ResultList items={results[tab]!.items} query={results[tab]!.query} savedFrom={`Geo search · ${TAB_LABEL[tab]}`}
              kindFilter={tab !== 'news'} emptyText={`No ${TAB_LABEL[tab].toLowerCase()} results were found for this location.`} />
          )}

          {tab === 'similar' && (
            similarByCountry.length === 0 ? (
              <EmptyState icon={<Globe2 size={24} />} title="No similar place names">Google Maps suggested no other places with this name.</EmptyState>
            ) : (
              <section className="ex-card">
                <div className="ex-card-head"><h2 className="ex-card-title">Places with the same or a similar name, by country</h2></div>
                {similarByCountry.map(([c, list]) => (
                  <div key={c} className="ex-kv" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <strong style={{ minWidth: 140 }}>{c}</strong>
                    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                      {list.map(i => (
                        <button type="button" key={i.id} className="ex-chip" title={i.location?.address}
                          onClick={() => { const cc = COUNTRY_OPTIONS.find(o => o.code && o.label.toLowerCase() === c.toLowerCase())?.code || ''; setPlace(i.title); setCountry(cc); search({ where: cc ? i.title : `${i.title}, ${c}`, cc }); }}>
                          <MapPin size={12} /> {i.title}{i.snippet && i.snippet !== c ? ` · ${i.snippet}` : ''}
                        </button>
                      ))}
                    </span>
                  </div>
                ))}
                <div className="ex-pad ex-muted ex-small">Select a place to search that location.</div>
              </section>
            )
          )}
        </>
      )}
    </ExplorePage>
  );
};
