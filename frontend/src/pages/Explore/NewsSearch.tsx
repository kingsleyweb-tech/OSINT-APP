import React, { useState } from 'react';
import { Search, Newspaper } from 'lucide-react';
import { ExplorePage, Field, EngineStatus, ResultList, EmptyState } from '../../components/explore/ExploreKit';
import { useSearchRun } from '../../components/explore/useSearchRun';
import { usePageSearch } from '../../components/explore/usePageSearch';
import { SearchLoader } from '../../components/ui/SearchLoader';
import { recordSearch, topFromItems } from '../../lib/history';
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS, WHEN_OPTIONS, type ExploreResponse, type ExploreOptions } from '../../lib/exploreClient';
import { useQueryIntel, useSearchMode } from '../../components/search/useIntelligentSearch';
import { QueryIntelBanner, SearchModeToggle } from '../../components/search/QueryIntelBanner';
import { intelHistoryFields } from '../../lib/queryIntelClient';
import { useCases } from '../../components/explore/exploreHooks';

export const NewsSearchPage: React.FC = () => {
  const { run, cancel, running, steps } = useSearchRun();
  const [searchMode, setSearchMode] = useSearchMode();
  const qi = useQueryIntel();
  const { cases } = useCases();
  const [query, setQuery] = useState('');
  const [when, setWhen] = useState<ExploreOptions['when'] | ''>('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [error, setError] = useState('');
  const [response, setResponse] = useState<ExploreResponse | null>(null);

  const search = async (o: { q?: string; when?: string; country?: string; keepOriginal?: boolean; chosen?: string } = {}) => {
    const q = (o.q ?? query).trim();
    if (q.length < 2) { setError('Enter at least 2 characters.'); return; }
    setError('');
    const options: ExploreOptions = {
      when: ((o.when ?? when) || undefined) as ExploreOptions['when'],
      country: (o.country ?? country) || undefined,
      language: language || undefined
    };
    const checked = await qi.check(q, 'topic', searchMode, { country: options.country, knownNames: cases.map(c => c.name), keepOriginal: o.keepOriginal, chosen: o.chosen });
    if (!checked) return;
    const out = await run([{ key: 'r', capability: 'news', query: checked.query, options }]);
    if (!out) return;
    setResponse(out.r);
    qi.learnFromResults(checked.query, out.r.items.map(i => `${i.title} ${i.snippet || ''}`), 'articles');
    recordSearch({
      ...intelHistoryFields(checked.intel), sources: out.r.engines.map(e => e.label),
      category: 'news', query: q, resultCount: out.r.items.length, searchesUsed: out.r.stats.searchesUsed, topResults: topFromItems(out.r.items),
      detail: [COUNTRY_OPTIONS.find(c => c.code === options.country)?.label, WHEN_OPTIONS.find(w => w.code === options.when)?.label].filter(Boolean).join(' · ') || undefined,
      params: { q, ...(options.country ? { country: options.country } : {}), ...(options.when ? { when: options.when } : {}) }
    });
  };

  usePageSearch(p => {
    setQuery(p.get('q') || ''); setCountry(p.get('country') || ''); setWhen((p.get('when') as ExploreOptions['when']) || '');
    search({ q: p.get('q') || '', country: p.get('country') || '', when: p.get('when') || '' });
  });

  return (
    <ExplorePage title="News" subtitle="Search news coverage of a person, organisation, place or topic across Google News and Bing News. Only articles from news engines appear here.">
      <form className="ex-card ex-card-pad ex-form" onSubmit={e => { e.preventDefault(); search(); }}>
        <Field label="Person, organisation, place or topic" htmlFor="nw-q" grow>
          <input id="nw-q" className="ex-input" value={query} onChange={e => setQuery(e.target.value)} placeholder='e.g. "Hubert Amponsah" or Osu Accra' maxLength={200} />
        </Field>
        <Field label="Published" htmlFor="nw-when">
          <select id="nw-when" className="ex-input ex-select" value={when} onChange={e => setWhen(e.target.value as ExploreOptions['when'] | '')}>
            {WHEN_OPTIONS.map(o => <option key={o.label} value={o.code}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Country edition" htmlFor="nw-country">
          <select id="nw-country" className="ex-input ex-select" value={country} onChange={e => setCountry(e.target.value)}>
            {COUNTRY_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Language" htmlFor="nw-lang">
          <select id="nw-lang" className="ex-input ex-select" value={language} onChange={e => setLanguage(e.target.value)}>
            {LANGUAGE_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
        </Field>
        <SearchModeToggle mode={searchMode} onChange={setSearchMode} />
        <button type="submit" className="ex-btn ex-btn-primary" disabled={running || qi.checking}><Search size={16} /> Search news</button>
        {error && <div className="ex-notice" style={{ width: '100%' }}>{error}</div>}
        <span className="ex-muted ex-small" style={{ width: '100%' }}>Uses 2 SerpApi searches (Google + Bing). Put a name in quotes for exact matches.</span>
      </form>

      {running || qi.checking ? <SearchLoader query={query} steps={[...qi.step, ...steps]} onCancel={() => { qi.cancel(); cancel(); }} /> : (
        <>
          <QueryIntelBanner intel={qi.intel} cases={cases} resultCount={response?.items.length} sources={response?.engines.map(e => e.label)}
        onSearch={q2 => { setQuery(q2); search({ q: q2, chosen: qi.intel?.corrections.some(c => c.query === q2) ? q2 : undefined }); }}
        onSearchOriginal={() => { if (qi.intel) search({ q: qi.intel.original, keepOriginal: true }); }} />
          <EngineStatus response={response} />
        </>
      )}

      {!running && (response
        ? <ResultList items={response.items} query={response.query} savedFrom="News search" kindFilter={false} emptyText="No news articles matched. Try fewer words or a wider date range." />
        : <EmptyState icon={<Newspaper size={24} />} title="Search news coverage">Articles are ranked by how closely their headline and summary match your terms. Saved articles appear in the case's News tab and timeline.</EmptyState>)}
    </ExplorePage>
  );
};
