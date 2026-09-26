import React, { useMemo, useState } from 'react';
import { Activity, BookOpen, Database, ExternalLink, Filter, Lock, Search, Server, ShieldCheck, Unlock } from 'lucide-react';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import {
  APP_ENDPOINTS, DATA_SOURCES, EXTERNAL_APIS, SOURCE_CATEGORIES, type SourceAccess, type SourceCategory
} from '../../lib/sourceCatalog';
import '../../styles/Sources.css';

type PageTab = 'sources' | 'api';

const ACCESS_NOTE: Record<SourceAccess, string> = {
  SerpApi: 'Uses SerpApi searches',
  'Free public API': 'Free — no SerpApi search',
  'Google site: search': 'Found through Google (SerpApi)',
  'Platform service': 'Account platform'
};

const serpEngineCount = EXTERNAL_APIS.filter(a => a.provider === 'SerpApi' && a.cost === 'SerpApi search').length;
const freeApiCount = EXTERNAL_APIS.filter(a => a.cost === 'Free' && a.provider !== 'SerpApi').length;

export const SourcesPage: React.FC = () => {
  const [tab, setTab] = useState<PageTab>('sources');
  const [category, setCategory] = useState<'All' | SourceCategory>('All');
  const [text, setText] = useState('');

  const q = text.trim().toLowerCase();
  const sources = useMemo(() => DATA_SOURCES.filter(s =>
    (category === 'All' || s.category === category) &&
    (!q || [s.name, s.description, s.category, s.access, ...s.usedIn, ...s.data].some(v => v.toLowerCase().includes(q)))
  ), [category, q]);
  const endpoints = useMemo(() => APP_ENDPOINTS.filter(e => !q || [e.path, e.description, e.usedBy, e.body || ''].some(v => v.toLowerCase().includes(q))), [q]);
  const externals = useMemo(() => EXTERNAL_APIS.filter(e => !q || [e.provider, e.name, e.endpoint, e.usedFor].some(v => v.toLowerCase().includes(q))), [q]);

  return (
    <div className="sources-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sources & Data Providers</h1>
          <p className="page-subtitle">
            Every source the platform searches, what it is used for and what it returns — plus the API endpoints behind each search.
          </p>
        </div>
      </div>

      <div className="serpapi-hero-sponsor-banner">
        <div className="sponsor-banner-left">
          <span className="sponsor-badge-tag">MAIN SEARCH PROVIDER</span>
          <h2 className="sponsor-title">
            Powered by{' '}
            <a href="https://serpapi.com/" target="_blank" rel="noopener noreferrer" className="serpapi-hero-link">SerpApi</a>
          </h2>
          <p className="sponsor-desc">
            {serpEngineCount} SerpApi engines (Google, Bing, DuckDuckGo, Yahoo, YouTube, News, Images, Lens, Maps, Trends, Facebook and Instagram profiles)
            plus {freeApiCount} free public platform APIs. Identical searches are cached for 12 hours so they are not billed twice.
          </p>
        </div>
        <a href="https://serpapi.com/" target="_blank" rel="noopener noreferrer" className="sponsor-visit-btn">
          Visit SerpApi Official Site ↗
        </a>
      </div>

      <div className="src-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'sources'} className={tab === 'sources' ? 'on' : ''} onClick={() => setTab('sources')}>
          <Database size={15} /> Sources <span className="src-count">{DATA_SOURCES.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'api'} className={tab === 'api' ? 'on' : ''} onClick={() => setTab('api')}>
          <Server size={15} /> API endpoints <span className="src-count">{APP_ENDPOINTS.length + EXTERNAL_APIS.length}</span>
        </button>
        <label className="src-search">
          <Search size={15} />
          <input value={text} onChange={e => setText(e.target.value)} placeholder={tab === 'sources' ? 'Filter sources…' : 'Filter endpoints…'} />
        </label>
      </div>

      {tab === 'sources' ? (
        <>
          <div className="sources-filter-bar">
            <div className="filter-label"><Filter size={14} /> Filter Category:</div>
            <div className="filter-pills">
              {(['All', ...SOURCE_CATEGORIES] as const).map(cat => (
                <button key={cat} type="button" className={`filter-pill ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {sources.length === 0 && <p className="src-empty">No sources match this filter.</p>}
          <div className="sources-grid">
            {sources.map(src => (
              <div key={src.id} className="source-health-card">
                <div className="source-card-top">
                  <div className="source-title-group">
                    <PlatformIcon platform={src.name} domain={src.domain} size={22} className="source-brand-icon" />
                    <h3 className="source-name">{src.name}</h3>
                  </div>
                  <span className="status-badge operational"><Activity size={10} /> Active</span>
                </div>

                <p className="source-type">{src.category} · {ACCESS_NOTE[src.access]}</p>
                <p className="source-description">{src.description}</p>

                <div className="extracted-data-section">
                  <span className="extracted-label">Returns:</span>
                  <div className="data-tags-list">
                    {src.data.map(tag => <span key={tag} className="data-tag">{tag}</span>)}
                  </div>
                </div>

                <div className="source-card-footer">
                  <div className="metric">
                    <Database className="metric-icon" size={13} />
                    <span>{src.usedIn.join(' · ')}</span>
                  </div>
                  <div className="security-badge"><ShieldCheck size={12} /> Public data only</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <section className="src-api-card">
            <div className="src-api-head">
              <h2><Server size={17} /> This platform’s backend API</h2>
              <p>
                Every endpoint except <code>/api/health</code> needs a signed-in user: the app sends the Firebase sign-in token as
                <code>Authorization: Bearer …</code> and the backend verifies it. Name and username searches are limited per account
                (30 per 10 minutes by default).
              </p>
            </div>
            <div className="src-table-wrap">
              <table className="src-table">
                <thead><tr><th>Method</th><th>Endpoint</th><th>Access</th><th>What it does</th><th>Used by</th></tr></thead>
                <tbody>
                  {endpoints.map(e => (
                    <tr key={`${e.method} ${e.path}`}>
                      <td><span className={`src-method ${e.method.toLowerCase()}`}>{e.method}</span></td>
                      <td><code>{e.path}</code></td>
                      <td>
                        <span className={`src-auth ${e.auth === 'Public' ? 'public' : ''}`}>
                          {e.auth === 'Public' ? <Unlock size={11} /> : <Lock size={11} />} {e.auth}
                        </span>
                      </td>
                      <td>
                        {e.description}
                        {e.body && <div className="src-body"><span>Body</span><code>{e.body}</code></div>}
                      </td>
                      <td className="src-muted">{e.usedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="src-api-card">
            <div className="src-api-head">
              <h2><BookOpen size={17} /> External APIs and their documentation</h2>
              <p>
                The services the backend calls. SerpApi calls use your monthly search quota; the platform APIs are free public endpoints.
                API keys stay on the server and are never sent to the browser.
              </p>
            </div>
            <div className="src-table-wrap">
              <table className="src-table">
                <thead><tr><th>Provider</th><th>API</th><th>Request</th><th>Used for</th><th>Cost</th><th>Docs</th></tr></thead>
                <tbody>
                  {externals.map(a => (
                    <tr key={`${a.provider} ${a.name}`}>
                      <td><b>{a.provider}</b></td>
                      <td>{a.name}</td>
                      <td><code className="src-endpoint">{a.endpoint}</code></td>
                      <td className="src-muted">{a.usedFor}</td>
                      <td><span className={`src-cost ${a.cost === 'SerpApi search' ? 'paid' : ''}`}>{a.cost}</span></td>
                      <td>
                        {a.docs
                          ? <a href={a.docs} target="_blank" rel="noopener noreferrer" className="src-doc-link">Docs <ExternalLink size={12} /></a>
                          : <span className="src-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {endpoints.length === 0 && externals.length === 0 && <p className="src-empty">No endpoints match this filter.</p>}
        </>
      )}
    </div>
  );
};
