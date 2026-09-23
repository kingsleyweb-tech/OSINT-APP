import React, { useState } from 'react';
import { 
  Globe, 
  Server, 
  ShieldCheck, 
  Cpu, 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';
import '../../styles/DomainInvestigationView.css';

export interface DomainInvestigationData {
  id: string;
  domain: string;
  rawInput: string;
  isPartialQuery?: boolean;
  suggestions?: Array<{
    domain: string;
    tld: string;
    status: 'Active (Resolves)' | 'Registered' | 'Available';
    ipAddress?: string;
  }>;
  status: 'Online' | 'Offline / Unreachable' | 'Unregistered / Available' | string;
  ipAddresses: string[];
  nameservers: string[];
  mxRecords: string[];
  txtRecords: string[];
  httpInfo: {
    statusCode?: number;
    server?: string;
    isHttps: boolean;
    contentType?: string;
    strictTransportSecurity?: boolean;
  };
  websiteInfo: {
    title: string;
    description: string;
    faviconUrl?: string;
    detectedCategory: string;
    detectedBrand: string;
    aboutSummary: string;
    contactInfo?: string;
  };
  technologies: Array<{
    category: 'Framework' | 'CMS' | 'Hosting / CDN' | 'Web Server' | 'Analytics' | 'Library';
    name: string;
    confidence: number;
  }>;
  pages: Array<{
    title: string;
    url: string;
    pageType: string;
    snippet?: string;
  }>;
  newsAndMentions: Array<{
    title: string;
    snippet: string;
    url: string;
    source: string;
  }>;
  sources: Array<{
    title: string;
    url: string;
    sourceType: string;
  }>;
  summary: string;
}

interface DomainInvestigationViewProps {
  data: DomainInvestigationData;
  onSelectSuggestedDomain?: (domain: string) => void;
}

type DomainTab = 'overview' | 'website' | 'domain' | 'technology' | 'pages' | 'news' | 'sources';

export const DomainInvestigationView: React.FC<DomainInvestigationViewProps> = ({ 
  data, 
  onSelectSuggestedDomain 
}) => {
  const [activeTab, setActiveTab] = useState<DomainTab>('overview');

  const isOnline = data.status === 'Online';

  return (
    <div className="domain-investigation-container">
      {/* Partial Domain Suggestion Banner */}
      {data.isPartialQuery && data.suggestions && data.suggestions.length > 0 && (
        <div className="domain-suggestion-banner">
          <div className="suggestion-banner-header">
            <Info size={18} className="suggestion-icon" />
            <span>Did you mean one of these active domains for "<strong>{data.rawInput}</strong>"?</span>
          </div>
          <div className="suggestion-chips-row">
            {data.suggestions.map((sug) => (
              <button
                key={sug.domain}
                className={`suggestion-chip ${sug.domain === data.domain ? 'active' : ''}`}
                onClick={() => onSelectSuggestedDomain && onSelectSuggestedDomain(sug.domain)}
              >
                <Globe size={14} />
                <span>{sug.domain}</span>
                <span className={`status-pill ${sug.status.toLowerCase().includes('active') ? 'active' : ''}`}>
                  {sug.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hero Header Panel */}
      <div className="domain-hero-card">
        <div className="domain-hero-main">
          <div className="domain-icon-ring">
            <Globe size={32} className="domain-globe-icon" />
          </div>

          <div className="domain-hero-text">
            <div className="domain-hero-top-row">
              <h1 className="domain-name-title">{data.domain}</h1>
              <span className={`domain-status-badge ${isOnline ? 'online' : 'offline'}`}>
                {isOnline ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {data.status}
              </span>
              {data.httpInfo.isHttps && (
                <span className="ssl-badge">
                  <ShieldCheck size={14} /> SSL / HTTPS Encrypted
                </span>
              )}
            </div>

            <p className="domain-hero-subtitle">{data.websiteInfo.title}</p>
            <p className="domain-summary-lead">{data.summary}</p>
          </div>
        </div>

        {/* Quick Domain Stats Bar */}
        <div className="domain-stats-grid">
          <div className="domain-stat-box">
            <span className="stat-label">Category</span>
            <span className="stat-value">{data.websiteInfo.detectedCategory}</span>
          </div>
          <div className="domain-stat-box">
            <span className="stat-label">Primary IP</span>
            <span className="stat-value font-mono">{data.ipAddresses[0] || 'Unresolved'}</span>
          </div>
          <div className="domain-stat-box">
            <span className="stat-label">Web Server</span>
            <span className="stat-value">{data.httpInfo.server || 'Standard Gateway'}</span>
          </div>
          <div className="domain-stat-box">
            <span className="stat-label">Indexed Pages</span>
            <span className="stat-value">{data.pages.length} Pages</span>
          </div>
        </div>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="domain-tabs-nav">
        <button 
          className={`domain-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Layers size={16} /> Overview
        </button>

        <button 
          className={`domain-tab-btn ${activeTab === 'website' ? 'active' : ''}`}
          onClick={() => setActiveTab('website')}
        >
          <Globe size={16} /> Website Info
        </button>

        <button 
          className={`domain-tab-btn ${activeTab === 'domain' ? 'active' : ''}`}
          onClick={() => setActiveTab('domain')}
        >
          <Server size={16} /> DNS & Server ({data.ipAddresses.length + data.nameservers.length})
        </button>

        <button 
          className={`domain-tab-btn ${activeTab === 'technology' ? 'active' : ''}`}
          onClick={() => setActiveTab('technology')}
        >
          <Cpu size={16} /> Tech Stack ({data.technologies.length})
        </button>

        <button 
          className={`domain-tab-btn ${activeTab === 'pages' ? 'active' : ''}`}
          onClick={() => setActiveTab('pages')}
        >
          <FileText size={16} /> Pages ({data.pages.length})
        </button>

        <button 
          className={`domain-tab-btn ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => setActiveTab('news')}
        >
          <Info size={16} /> News & Mentions ({data.newsAndMentions.length})
        </button>

        <button 
          className={`domain-tab-btn ${activeTab === 'sources' ? 'active' : ''}`}
          onClick={() => setActiveTab('sources')}
        >
          <Database size={16} /> Sources ({data.sources.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="domain-tab-content">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="overview-tab-stack">
            <div className="overview-grid">
              <div className="info-panel-card">
                <h3 className="panel-title"><Info size={16} /> Executive Summary</h3>
                <p className="panel-text">{data.summary}</p>
                <div className="brand-meta-box">
                  <div><strong>Brand:</strong> {data.websiteInfo.detectedBrand}</div>
                  <div><strong>Category:</strong> {data.websiteInfo.detectedCategory}</div>
                  <div><strong>Status:</strong> {data.status}</div>
                </div>
              </div>

              <div className="info-panel-card">
                <h3 className="panel-title"><Cpu size={16} /> Tech Highlights</h3>
                <div className="tech-badge-list">
                  {data.technologies.map((tech, idx) => (
                    <div key={idx} className="tech-pill-badge">
                      <span className="tech-category">{tech.category}</span>
                      <span className="tech-name">{tech.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="info-panel-card">
              <h3 className="panel-title"><FileText size={16} /> Top Discovered Pages</h3>
              <div className="discovered-pages-list">
                {data.pages.slice(0, 4).map((pg, idx) => (
                  <div key={idx} className="page-item-row">
                    <div className="page-item-type">{pg.pageType}</div>
                    <div className="page-item-info">
                      <a href={pg.url} target="_blank" rel="noopener noreferrer" className="page-item-title">
                        {pg.title} <ExternalLink size={12} />
                      </a>
                      {pg.snippet && <p className="page-item-snippet">{pg.snippet}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WEBSITE INFO */}
        {activeTab === 'website' && (
          <div className="info-panel-card">
            <h3 className="panel-title"><Globe size={16} /> Website Metadata & About</h3>
            <div className="metadata-details">
              <div className="meta-field">
                <label>Website Title</label>
                <p>{data.websiteInfo.title}</p>
              </div>
              <div className="meta-field">
                <label>Description</label>
                <p>{data.websiteInfo.description}</p>
              </div>
              <div className="meta-field">
                <label>About Summary</label>
                <p>{data.websiteInfo.aboutSummary}</p>
              </div>
              <div className="meta-field">
                <label>Official URL</label>
                <a href={`https://${data.domain}`} target="_blank" rel="noopener noreferrer" className="domain-external-link">
                  https://{data.domain} <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DNS & SERVER */}
        {activeTab === 'domain' && (
          <div className="dns-tab-grid">
            <div className="info-panel-card">
              <h3 className="panel-title"><Server size={16} /> IP Addresses (A Records)</h3>
              <ul className="record-list font-mono">
                {data.ipAddresses.length > 0 ? (
                  data.ipAddresses.map((ip, idx) => <li key={idx}>A: {ip}</li>)
                ) : (
                  <li className="empty-record">No A records resolved</li>
                )}
              </ul>
            </div>

            <div className="info-panel-card">
              <h3 className="panel-title"><Server size={16} /> Nameservers (NS)</h3>
              <ul className="record-list font-mono">
                {data.nameservers.length > 0 ? (
                  data.nameservers.map((ns, idx) => <li key={idx}>NS: {ns}</li>)
                ) : (
                  <li className="empty-record">No NS records resolved</li>
                )}
              </ul>
            </div>

            <div className="info-panel-card">
              <h3 className="panel-title"><Server size={16} /> Mail Exchanges (MX)</h3>
              <ul className="record-list font-mono">
                {data.mxRecords.length > 0 ? (
                  data.mxRecords.map((mx, idx) => <li key={idx}>MX: {mx}</li>)
                ) : (
                  <li className="empty-record">No MX mail servers configured</li>
                )}
              </ul>
            </div>

            <div className="info-panel-card">
              <h3 className="panel-title"><ShieldCheck size={16} /> TXT / SPF Records</h3>
              <ul className="record-list font-mono text-sm">
                {data.txtRecords.length > 0 ? (
                  data.txtRecords.map((txt, idx) => <li key={idx}>{txt}</li>)
                ) : (
                  <li className="empty-record">No TXT records found</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* TAB 4: TECHNOLOGY STACK */}
        {activeTab === 'technology' && (
          <div className="info-panel-card">
            <h3 className="panel-title"><Cpu size={16} /> Detected Web Technologies</h3>
            <div className="tech-table">
              {data.technologies.map((tech, idx) => (
                <div key={idx} className="tech-table-row">
                  <div className="tech-cat-tag">{tech.category}</div>
                  <div className="tech-name-bold">{tech.name}</div>
                  <div className="tech-conf-pill">{tech.confidence}% confidence</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PAGES */}
        {activeTab === 'pages' && (
          <div className="info-panel-card">
            <h3 className="panel-title"><FileText size={16} /> Discovered Indexed Pages</h3>
            <div className="discovered-pages-list">
              {data.pages.map((pg, idx) => (
                <div key={idx} className="page-item-row">
                  <div className="page-item-type">{pg.pageType}</div>
                  <div className="page-item-info">
                    <a href={pg.url} target="_blank" rel="noopener noreferrer" className="page-item-title">
                      {pg.title} <ExternalLink size={12} />
                    </a>
                    {pg.snippet && <p className="page-item-snippet">{pg.snippet}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: NEWS & MENTIONS */}
        {activeTab === 'news' && (
          <div className="info-panel-card">
            <h3 className="panel-title"><Info size={16} /> Brand News, Articles & Mentions</h3>
            <div className="news-list">
              {data.newsAndMentions.length > 0 ? (
                data.newsAndMentions.map((item, idx) => (
                  <div key={idx} className="news-item-card">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-item-title">
                      {item.title} <ExternalLink size={12} />
                    </a>
                    <p className="news-item-snippet">{item.snippet}</p>
                    <span className="news-item-source">{item.source}</span>
                  </div>
                ))
              ) : (
                <p className="empty-text">No external news or brand mentions discovered.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: SOURCES */}
        {activeTab === 'sources' && (
          <div className="info-panel-card">
            <h3 className="panel-title"><Database size={16} /> Supporting Investigation Sources</h3>
            <div className="sources-list">
              {data.sources.map((src, idx) => (
                <div key={idx} className="source-item-card">
                  <span className="source-type-tag">{src.sourceType}</span>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="source-title-link">
                    {src.title} <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
