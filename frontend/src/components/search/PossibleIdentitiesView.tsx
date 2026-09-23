import React, { useState } from 'react';
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
  Check,
  X,
  Info,
  Layers,
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
  const [hoveredIdentityId, setHoveredIdentityId] = useState<string | null>(null);

  // Extract all aggregated category items from identities for complete search results view
  const allProfiles = identities.flatMap(id => id.investigation?.socialProfiles || []);
  const allSources = identities.flatMap(id => id.investigation?.sources || []);
  const allAssociations = identities.flatMap(id => id.investigation?.associations || []);
  const allWebNews = identities.flatMap(id => id.investigation?.activities || []);

  // Deduplicate items by URL
  const uniqueProfiles = Array.from(new Map(allProfiles.map(p => [p.url, p])).values());
  const uniqueSources = Array.from(new Map(allSources.map(s => [s.url, s])).values());
  const uniqueAssociations = Array.from(new Map(allAssociations.map(a => [a.name.toLowerCase(), a])).values());
  const uniqueWebNews = Array.from(new Map(allWebNews.map(w => [w.sourceUrl, w])).values());

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

        <div className="identities-grid">
          {identities.map((item) => {
            const isHovered = hoveredIdentityId === item.id;
            const evidenceList = item.evidenceChecklist || [
              { signal: 'Matching name', matched: true },
              { signal: 'Matching location', matched: item.location !== 'Not specified' },
              { signal: 'Matching organization', matched: item.associationsCount > 0 },
              { signal: 'Matching username', matched: item.matchingPlatforms.length > 0 }
            ];

            return (
              <div 
                key={item.id} 
                className="identity-card-wrapper"
                onMouseEnter={() => setHoveredIdentityId(item.id)}
                onMouseLeave={() => setHoveredIdentityId(null)}
              >
                <div className="identity-card">
                  <div className="card-top-bar">
                    <div className="identity-avatar-wrap">
                      {item.avatarUrl ? (
                        <img src={item.avatarUrl} alt={item.fullName} className="identity-avatar-img" />
                      ) : (
                        <div className="identity-avatar-fallback">
                          {item.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className={`confidence-pill ${getConfidenceBadgeClass(item.confidenceLabel)}`}>
                      <ShieldCheck size={12} />
                      {item.confidenceLabel}
                    </span>
                  </div>

                  <div className="card-body-section">
                    <h3 className="identity-name">{item.fullName}</h3>
                    <div className="identity-meta-row">
                      <span className="meta-item">
                        <Briefcase size={13} className="meta-icon" />
                        {item.publicRole}
                      </span>
                      <span className="meta-item">
                        <MapPin size={13} className="meta-icon" />
                        {item.location}
                      </span>
                    </div>
                    <p className="identity-summary">{item.summary}</p>
                  </div>

                  <div className="card-platforms-row">
                    <span className="platforms-label">Known Profiles:</span>
                    <div className="platform-icons-flex">
                      {item.matchingPlatforms.slice(0, 6).map((plat) => (
                        <div key={plat} className="platform-icon-chip" title={plat}>
                          <PlatformIcon platform={plat} size={15} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card-metrics-grid">
                    <div className="metric-box">
                      <span className="metric-num">{item.profilesCount}</span>
                      <span className="metric-txt">Profiles</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-num">{item.sourcesCount}</span>
                      <span className="metric-txt">Sources</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-num">{item.associationsCount}</span>
                      <span className="metric-txt">Associations</span>
                    </div>
                  </div>

                  <button 
                    className="select-investigation-btn" 
                    onClick={() => onSelectIdentity(item)}
                  >
                    <UserCheck size={16} /> View Person <ArrowRight size={14} className="btn-arrow" />
                  </button>
                </div>

                {/* Hover Evidence Popover Card */}
                {isHovered && (
                  <div className="identity-hover-popover">
                    <div className="popover-header">
                      <div className="popover-title-group">
                        <h4 className="popover-name">{item.fullName}</h4>
                        <span className="popover-role">{item.publicRole} &bull; {item.location}</span>
                      </div>
                      <span className={`confidence-pill ${getConfidenceBadgeClass(item.confidenceLabel)}`}>
                        {item.confidenceLabel}
                      </span>
                    </div>

                    <div className="popover-evidence-section">
                      <span className="popover-evidence-heading">
                        <Info size={13} /> Why this may be the same person
                      </span>
                      <div className="evidence-checklist-grid">
                        {evidenceList.map((ev, i) => (
                          <div key={i} className={`checklist-item ${ev.matched ? 'matched' : 'unmatched'}`}>
                            {ev.matched ? <Check size={13} className="check-icon" /> : <X size={13} className="x-icon" />}
                            <span>{ev.signal}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="popover-footer-stats">
                      <span>Known Profiles: <strong>{item.matchingPlatforms.length}</strong></span>
                      <span>Organizations: <strong>{item.associationsCount}</strong></span>
                      <span>Sources: <strong>{item.sourcesCount}</strong></span>
                    </div>
                  </div>
                )}
              </div>
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
                  <span className="confidence-tag">{p.confidenceLevel || 'High'}</span>
                </div>
                <div className="profile-card-body">
                  <div className="profile-handle">@{p.username}</div>
                  <p className="profile-bio-text">{p.bio || `Public profile on ${p.platform}.`}</p>
                </div>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="profile-visit-link">
                  View Profile <ExternalLink size={13} />
                </a>
              </div>
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
                <div className="webnews-item-main">
                  <h4 className="webnews-item-title">{wn.title}</h4>
                  <p className="webnews-item-desc">{wn.briefReport || wn.description}</p>
                  <div className="webnews-item-meta">
                    <span className="meta-tag">{wn.category || 'News Mention'}</span>
                    <span className="meta-source">{wn.sourceName}</span>
                    <span className="meta-date">{wn.date}</span>
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
