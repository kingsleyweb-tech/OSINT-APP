import React from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Briefcase, 
  ArrowRight, 
  UserCheck, 
  Search, 
  ExternalLink,
  Globe,
  Building2,
  Newspaper,
  Users
} from 'lucide-react';
import { PlatformIcon } from '../ui/PlatformIcon';
import '../../styles/PossibleIdentities.css';

export type NeutralConfidenceLabel = 'Verified' | 'Strong evidence' | 'Possible match' | 'Mention only' | 'Uncertain';

export interface EvidenceSignal {
  signal: string;
  matched: boolean;
}

export interface DiscoveredIdentity {
  id: string;
  fullName: string;
  publicRole: string;
  location: string;
  avatarUrl?: string;
  summary: string;
  confidenceScore: number;
  confidenceLabel: NeutralConfidenceLabel;
  evidenceChecklist?: EvidenceSignal[];
  profilesCount: number;
  sourcesCount: number;
  activitiesCount: number;
  associationsCount: number;
  /** Accounts with a similar (not the same) username: other people, listed separately. */
  similarAccountsCount?: number;
  matchingPlatforms: string[];
  investigation: any;
}

interface PossibleIdentitiesViewProps {
  query: string;
  identities: DiscoveredIdentity[];
  onSelectIdentity: (identity: DiscoveredIdentity) => void;
  onNewSearch: () => void;
}

export const PossibleIdentitiesView: React.FC<PossibleIdentitiesViewProps> = ({
  query,
  identities,
  onSelectIdentity,
  onNewSearch
}) => {

  // Extract all aggregated category items from identities for complete search results view
  const allProfiles = identities.flatMap(id => id.investigation?.socialProfiles || []);
  const allSources = identities.flatMap(id => id.investigation?.sources || []);
  const allAssociations = identities.flatMap(id => id.investigation?.associations || []);
  const allWebNews = identities.flatMap(id => id.investigation?.activities || []);

  // Deduplicate items by URL
  const dedupedProfiles = Array.from(new Map(allProfiles.map(p => [p.url, p])).values());
  // Accounts whose handle only resembles the username belong to other people: listed separately.
  const isSimilar = (p: any) => p.relation === 'similar' || /^similar username/i.test(p.bio || p.snippet || '');
  const uniqueProfiles = dedupedProfiles.filter(p => !isSimilar(p));
  const similarProfiles = dedupedProfiles.filter(isSimilar);
  const similarUrls = new Set(similarProfiles.map(p => p.url));
  const uniqueSources = Array.from(new Map(allSources.map(s => [s.url, s])).values());
  const uniqueAssociations = Array.from(new Map(allAssociations.map(a => [a.name.toLowerCase(), a])).values());
  const uniqueWebNews = Array.from(new Map(allWebNews.map(w => [w.sourceUrl, w])).values())
    .filter(w => w.relation !== 'similar' && !similarUrls.has(w.sourceUrl) && !/^similar username/i.test(w.briefReport || ''));

  // Image Google returned with a web/news result, matched to the listed item by its URL.
  const normUrl = (u?: string) => (u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
  const thumbByUrl = new Map<string, string>();
  identities.forEach(id => (id.investigation?.webAndNews || []).forEach((w: any) => {
    const raw = Array.isArray(w.metadata?.raw) ? w.metadata.raw : [];
    const t = w.metadata?.thumbnail || raw.find((r: any) => typeof r?.thumbnail === 'string' && /^https?:/.test(r.thumbnail))?.thumbnail;
    if (t) thumbByUrl.set(normUrl(w.url), t);
  }));

  const getConfidenceBadgeClass = (label: NeutralConfidenceLabel) => {
    switch (label) {
      case 'Verified': return 'verified';
      case 'Strong evidence': return 'strong';
      case 'Possible match': return 'possible';
      case 'Mention only': return 'mention';
      default: return 'uncertain';
    }
  };

  return (
    <div className="possible-identities-container">
      {/* Top Header */}
      <div className="identities-header">
        <div>
          <span className="identities-kicker">COMPLETE SEARCH RESULTS</span>
          <h1 className="identities-title">Search Results for "{query}"</h1>
          <p className="identities-subtitle">
            Discovered {identities.length} possible identity cluster{identities.length !== 1 ? 's' : ''}, {uniqueProfiles.length} public profiles, and {uniqueSources.length} evidence sources.
          </p>
        </div>
        <button className="new-search-ghost-btn" onClick={onNewSearch}>
          <Search size={14} /> New Search
        </button>
      </div>

      {/* SECTION 1: POSSIBLE PEOPLE */}
      <div className="search-section-block">
        <div className="section-block-header">
          <Users size={18} className="section-block-icon" />
          <h2 className="section-block-title">POSSIBLE PEOPLE</h2>
          <span className="section-count-tag">{identities.length}</span>
        </div>
        <p className="section-block-sub">
          Distinct identity clusters discovered from public evidence. Hover over a card to view detailed match evidence. Select a person to open their isolated investigation file.
        </p>

        <div className="pi-list">
          {identities.map((item) => {
            const initials = item.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const role = item.publicRole && !/^not stated/i.test(item.publicRole) ? item.publicRole : '';
            const place = item.location && item.location !== 'Not specified' ? item.location : '';
            return (
              <article key={item.id} className="pi-card">
                <div className="pi-avatar">
                  <span>{initials}</span>
                  {item.avatarUrl && (
                    <img src={item.avatarUrl} alt="" referrerPolicy="no-referrer" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
                  )}
                </div>
                <div className="pi-body">
                  <div className="pi-top">
                    <h3 className="pi-name">{item.fullName}</h3>
                    <span className={`confidence-pill ${getConfidenceBadgeClass(item.confidenceLabel)}`}><ShieldCheck size={12} /> {item.confidenceLabel}</span>
                  </div>
                  <div className="pi-meta">
                    <span><Briefcase size={13} /> {role || 'Role not stated'}</span>
                    <span><MapPin size={13} /> {place || 'Location not specified'}</span>
                  </div>
                  {item.summary && <p className="pi-summary">{item.summary}</p>}
                  <div className="pi-foot">
                    {item.matchingPlatforms.length > 0 && (
                      <span className="pi-platforms" aria-label="Known profiles">
                        {item.matchingPlatforms.slice(0, 6).map(plat => (
                          <span key={plat} className="pi-plat" title={plat}><PlatformIcon platform={plat} size={14} /></span>
                        ))}
                      </span>
                    )}
                    <span className="pi-counts">
                      <b>{item.profilesCount}</b> profile{item.profilesCount === 1 ? '' : 's'} · <b>{item.sourcesCount}</b> source{item.sourcesCount === 1 ? '' : 's'} · <b>{item.associationsCount}</b> association{item.associationsCount === 1 ? '' : 's'}
                      {item.similarAccountsCount ? <> · {item.similarAccountsCount} similar account{item.similarAccountsCount === 1 ? '' : 's'} (other people)</> : null}
                    </span>
                  </div>
                </div>
                <button className="pi-view" onClick={() => onSelectIdentity(item)}>
                  <UserCheck size={15} /> View person <ArrowRight size={14} />
                </button>
              </article>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: PROFILES */}
      {uniqueProfiles.length > 0 && (
        <div className="search-section-block">
          <div className="section-block-header">
            <PlatformIcon platform="LinkedIn" size={18} />
            <h2 className="section-block-title">PROFILES</h2>
            <span className="section-count-tag">{uniqueProfiles.length}</span>
          </div>
          <div className="profiles-results-grid">
            {uniqueProfiles.map((p, idx) => (
              <div key={idx} className="result-profile-card">
                <div className="profile-card-top">
                  <div className="platform-brand-badge">
                    <PlatformIcon platform={p.platform} size={18} />
                    <span className="platform-name">{p.platform}</span>
                  </div>
                  <span className="confidence-tag">{p.confidenceLabel || (p.confidenceLevel ? `${p.confidenceLevel} confidence` : 'Unrated')}</span>
                </div>
                <div className="profile-card-body">
                  <div className="profile-handle">
                    {p.thumbnail && <img src={p.thumbnail} alt="" className="pi-profile-photo" referrerPolicy="no-referrer" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                    {p.username ? `@${p.username}` : (p.profileName || p.title || p.platform)}
                  </div>
                  <p className="profile-bio-text">{p.bio || `Public profile on ${p.platform}.`}</p>
                </div>
                <a href={p.profileUrl || p.url} target="_blank" rel="noopener noreferrer" className="profile-visit-link">
                  View Profile <ExternalLink size={13} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {similarProfiles.length > 0 && (
        <div className="search-section-block pi-similar-block">
          <div className="section-block-header">
            <Users size={18} className="section-block-icon" />
            <h2 className="section-block-title">SIMILAR ACCOUNTS — OTHER PEOPLE</h2>
            <span className="section-count-tag">{similarProfiles.length}</span>
          </div>
          <p className="section-block-sub">
            These accounts have a username that resembles "{query}" but is not the same. They most likely belong to other people and are not counted as this person's profiles. Open one to check.
          </p>
          <div className="pi-similar-list">
            {similarProfiles.map((p, idx) => (
              <a key={idx} className="pi-similar-row" href={p.profileUrl || p.url} target="_blank" rel="noopener noreferrer">
                <PlatformIcon platform={p.platform} size={16} />
                <span className="pi-similar-name">{p.username ? `@${p.username}` : (p.profileName || p.title || p.platform)}</span>
                <span className="pi-similar-platform">{p.platform}</span>
                <span className="pi-similar-tag">Other person</span>
                <ExternalLink size={13} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: WEB & NEWS */}
      {uniqueWebNews.length > 0 && (
        <div className="search-section-block">
          <div className="section-block-header">
            <Newspaper size={18} className="section-block-icon" />
            <h2 className="section-block-title">WEB & NEWS</h2>
            <span className="section-count-tag">{uniqueWebNews.length}</span>
          </div>
          <div className="webnews-results-list">
            {uniqueWebNews.map((wn, idx) => (
              <div key={idx} className="webnews-item-row">
                {thumbByUrl.get(normUrl(wn.sourceUrl)) && (
                  <img className="pi-news-thumb" src={thumbByUrl.get(normUrl(wn.sourceUrl))} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />
                )}
                <div className="webnews-item-main">
                  <h4 className="webnews-item-title">{wn.title}</h4>
                  <p className="webnews-item-desc">{wn.briefReport || wn.description}</p>
                  <div className="webnews-item-meta">
                    <span className="meta-tag">{wn.category || 'News Mention'}</span>
                    <span className="meta-source">{wn.sourceName}</span>
                    {wn.date && !/not stated/i.test(wn.date) && <span className="meta-date">{wn.date}</span>}
                  </div>
                </div>
                {wn.sourceUrl && (
                  <a href={wn.sourceUrl} target="_blank" rel="noopener noreferrer" className="webnews-visit-btn">
                    Open Source <ExternalLink size={13} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: ORGANIZATIONS */}
      {uniqueAssociations.length > 0 && (
        <div className="search-section-block">
          <div className="section-block-header">
            <Building2 size={18} className="section-block-icon" />
            <h2 className="section-block-title">ORGANIZATIONS</h2>
            <span className="section-count-tag">{uniqueAssociations.length}</span>
          </div>
          <div className="orgs-results-grid">
            {uniqueAssociations.map((assoc, idx) => (
              <div key={idx} className="org-result-card">
                <div className="org-icon-badge">
                  <Building2 size={16} />
                </div>
                <div className="org-details">
                  <h4 className="org-name">{assoc.name}</h4>
                  <span className="org-category">{assoc.category} &bull; {assoc.relationship}</span>
                  <p className="org-evidence">{assoc.evidenceCitation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: SOURCES */}
      {uniqueSources.length > 0 && (
        <div className="search-section-block">
          <div className="section-block-header">
            <Globe size={18} className="section-block-icon" />
            <h2 className="section-block-title">SOURCES</h2>
            <span className="section-count-tag">{uniqueSources.length}</span>
          </div>
          <div className="sources-results-grid">
            {uniqueSources.map((src, idx) => (
              <div key={idx} className="source-result-card">
                <div className="source-domain-line">
                  <Globe size={14} className="domain-icon" />
                  <span className="domain-name">{src.domain}</span>
                </div>
                <h4 className="source-title">{src.title}</h4>
                <a href={src.url} target="_blank" rel="noopener noreferrer" className="source-link">
                  {src.url} <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
