import React, { useMemo, useState } from 'react';
import { Search, MessagesSquare } from 'lucide-react';
import { ExplorePage, Field, Segmented, EngineStatus, ResultList, EmptyState } from '../../components/explore/ExploreKit';
import { topTerms, useCases } from '../../components/explore/exploreHooks';
import { useSearchRun } from '../../components/explore/useSearchRun';
import { usePageSearch } from '../../components/explore/usePageSearch';
import { SearchLoader } from '../../components/ui/SearchLoader';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import { useToast } from '../../components/ui/Toast';
import { recordSearch, topFromItems } from '../../lib/history';
import { useQueryIntel, useSearchMode } from '../../components/search/useIntelligentSearch';
import { QueryIntelBanner, SearchModeToggle } from '../../components/search/QueryIntelBanner';
import { intelHistoryFields } from '../../lib/queryIntelClient';
import {
  SOCIAL_PLATFORM_OPTIONS, COUNTRY_OPTIONS, LANGUAGE_OPTIONS, WHEN_OPTIONS,
  type ExploreResponse, type ExploreOptions
} from '../../lib/exploreClient';

type Mode = 'social' | 'forums';
const DEFAULT_PLATFORMS = SOCIAL_PLATFORM_OPTIONS.filter(p => p.default).map(p => p.id);

export const SocialSearchPage: React.FC = () => {
  const toast = useToast();
  const { run, cancel, running, steps } = useSearchRun();
  const [searchMode, setSearchMode] = useSearchMode();
  const qi = useQueryIntel();
  const { cases } = useCases();
  const [mode, setMode] = useState<Mode>('social');
  const [query, setQuery] = useState('');
  const [when, setWhen] = useState<ExploreOptions['when'] | ''>('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [platforms, setPlatforms] = useState<Set<string>>(() => new Set(DEFAULT_PLATFORMS));
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<ExploreResponse | null>(null);

  const search = async (opts: { q?: string; mode?: Mode; when?: string; country?: string; platforms?: string[]; page?: number; keepOriginal?: boolean; chosen?: string } = {}) => {
    const q = (opts.q ?? query).trim();
    const m = opts.mode ?? mode;
    const plats = opts.platforms ?? Array.from(platforms);
    const nextPage = opts.page ?? 0;
    if (q.length < 2) { setError('Enter at least 2 characters.'); return; }
    if (m === 'social' && plats.length === 0) { setError('Choose at least one platform.'); return; }
    setError('');
    const options: ExploreOptions = {
      when: ((opts.when ?? when) || undefined) as ExploreOptions['when'],
      country: (opts.country ?? country) || undefined,
      language: language || undefined,
      platforms: m === 'social' ? plats : undefined,
      page: nextPage
    };
    // Search intelligence (Intelligent mode): may search a high-confidence correction; "More results" keeps the searched query.
    const checked = nextPage > 0 && response
      ? { query: response.query, intel: qi.intel }
      : await qi.check(q, 'topic', searchMode, { country: options.country, knownNames: cases.map(c => c.name), keepOriginal: opts.keepOriginal, chosen: opts.chosen });
    if (!checked) return;
    const out = await run([{ key: 'r', capability: m, query: checked.query, options }]);
    if (!out) return;
    const r = out.r;
    if (nextPage > 0 && response) {
      const seen = new Set(response.items.map(i => i.url));
      r.items = [...response.items, ...r.items.filter(i => !seen.has(i.url))];
    }
    setResponse(r);
    if (nextPage === 0) qi.learnFromResults(checked.query, r.items.map(i => `${i.title} ${i.snippet || ''}`), 'results');
    setPage(nextPage);
    if (nextPage === 0) {
      recordSearch({
        ...intelHistoryFields(checked.intel), sources: r.engines.map(e => e.label),
        category: m, query: q, resultCount: r.items.length, searchesUsed: r.stats.searchesUsed, topResults: topFromItems(r.items),
        detail: [COUNTRY_OPTIONS.find(c => c.code === options.country)?.label, WHEN_OPTIONS.find(w => w.code === options.when)?.label].filter(Boolean).join(' · ') || undefined,
        params: { q, mode: m, ...(options.country ? { country: options.country } : {}), ...(options.when ? { when: options.when } : {}), ...(m === 'social' ? { platforms: plats.join(',') } : {}) }
      });
    }
    if (r.items.length === 0 && r.engines.some(e => e.status === 'error' || e.status === 'quota')) toast.error('Search problem', r.notices[0] || 'An engine failed. Try again.');
  };

  usePageSearch(p => {
    const m = (p.get('mode') as Mode) || 'social';
    const plats = p.get('platforms')?.split(',').filter(Boolean) || DEFAULT_PLATFORMS;
    setQuery(p.get('q') || ''); setMode(m); setCountry(p.get('country') || ''); setWhen((p.get('when') as ExploreOptions['when']) || ''); setPlatforms(new Set(plats));
    search({ q: p.get('q') || '', mode: m, country: p.get('country') || '', when: p.get('when') || '', platforms: plats });
  });

  const trending = useMemo(() => response ? topTerms(response.items.map(i => `${i.title} ${i.snippet || ''}`), [query], 12) : [], [response, query]);
  const accounts = useMemo(() => {
    if (!response) return [];
    const m = new Map<string, { label: string; platform: string; count: number }>();
    response.items.forEach(i => {
      const who = i.username ? `@${i.username}` : i.author;
      if (!who) return;
      const key = `${i.platform || i.domain}|${who.toLowerCase()}`;
      const cur = m.get(key) || { label: who, platform: i.platform || i.domain, count: 0 };
      cur.count++;
      m.set(key, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [response]);

  const togglePlatform = (id: string) => setPlatforms(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  return (
    <ExplorePage title="Social search" subtitle="Find public posts, pages and discussions that search engines have indexed, by keyword, date, country and language. Private content is never accessed.">
      <form className="ex-card ex-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={e => { e.preventDefault(); search(); }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Segmented<Mode> label="Search in" value={mode} onChange={m => { setMode(m); setResponse(null); }}
            options={[{ value: 'social', label: 'Social platforms' }, { value: 'forums', label: 'Forums & discussions' }]} />
          <SearchModeToggle mode={searchMode} onChange={setSearchMode} />
        </div>
        <div className="ex-form">
          <Field label="Keywords or phrase" htmlFor="ss-q" grow>
            <input id="ss-q" className="ex-input" value={query} onChange={e => setQuery(e.target.value)} placeholder='e.g. Adjoa Tee, or "exact phrase"' maxLength={200} />
          </Field>
          <Field label="Date range" htmlFor="ss-when">
            <select id="ss-when" className="ex-input ex-select" value={when} onChange={e => setWhen(e.target.value as ExploreOptions['when'] | '')} disabled={mode === 'forums'}>
              {WHEN_OPTIONS.map(o => <option key={o.label} value={o.code}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Country" htmlFor="ss-country">
            <select id="ss-country" className="ex-input ex-select" value={country} onChange={e => setCountry(e.target.value)}>
              {COUNTRY_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Language" htmlFor="ss-lang">
            <select id="ss-lang" className="ex-input ex-select" value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGE_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
          </Field>
          <button type="submit" className="ex-btn ex-btn-primary" disabled={running}><Search size={16} /> Search</button>
        </div>
        {mode === 'social' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span className="ex-label" style={{ marginRight: 4 }}>Platforms</span>
            {SOCIAL_PLATFORM_OPTIONS.map(p => (
              <button type="button" key={p.id} className={`ex-chip ${platforms.has(p.id) ? 'on' : ''}`} aria-pressed={platforms.has(p.id)} onClick={() => togglePlatform(p.id)}>
                <PlatformIcon platform={p.label} size={13} /> {p.label}
              </button>
            ))}
          </div>
        )}
        {error && <div className="ex-notice">{error}</div>}
        <span className="ex-muted ex-small">Uses 1 SerpApi search (2 if a broader retry is needed). Several words are searched as an exact phrase; use OR or quotes to control this. Repeating a search within 12 hours is free.</span>
      </form>

      {running || qi.checking ? <SearchLoader query={query} steps={[...qi.step, ...steps]} onCancel={() => { qi.cancel(); cancel(); }} /> : (
        <>
          <QueryIntelBanner intel={qi.intel} cases={cases} resultCount={response?.items.length} sources={response?.engines.map(e => e.label)}
        onSearch={q2 => { setQuery(q2); search({ q: q2, chosen: qi.intel?.corrections.some(c => c.query === q2) ? q2 : undefined }); }}
        onSearchOriginal={() => { if (qi.intel) search({ q: qi.intel.original, keepOriginal: true }); }} />
          <EngineStatus response={response} />
        </>
      )}

      {!running && (!response ? (
        <EmptyState icon={<MessagesSquare size={24} />} title="Search public social content">
          Results are pages indexed on the selected platforms. Accounts with the same name or username are not necessarily the same person — treat every result as requiring verification.
        </EmptyState>
      ) : (
        <div className="ex-split">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ResultList items={response.items} query={response.query} savedFrom={mode === 'social' ? 'Social search' : 'Forum search'} />
            {response.items.length > 0 && page < 4 && (
              <button type="button" className="ex-btn ex-btn-ghost" style={{ alignSelf: 'center' }} onClick={() => search({ page: page + 1 })}>More results (uses 1 search)</button>
            )}
          </div>
          <div className="ex-side">
            <section className="ex-card">
              <div className="ex-card-head"><h2 className="ex-card-title">Common terms in results</h2></div>
              {trending.length === 0 ? <div className="ex-pad ex-muted ex-small">Not enough text to compare yet.</div> : trending.map(t => (
                <button type="button" key={t.term} className="ex-kv ex-kv-btn" onClick={() => setQuery(`${query} ${t.term}`.trim())} title="Add to the search">
                  <span>{t.term}</span><span className="ex-muted ex-mono">{t.count}</span>
                </button>
              ))}
            </section>
            <section className="ex-card">
              <div className="ex-card-head"><h2 className="ex-card-title">Most frequent accounts</h2></div>
              {accounts.length === 0 ? <div className="ex-pad ex-muted ex-small">No account names in these results.</div> : accounts.map(a => (
                <div key={`${a.platform}${a.label}`} className="ex-kv">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PlatformIcon platform={a.platform} size={14} /> {a.label}</span>
                  <span className="ex-muted">{a.count} result{a.count === 1 ? '' : 's'}</span>
                </div>
              ))}
            </section>
          </div>
        </div>
      ))}
    </ExplorePage>
  );
};
