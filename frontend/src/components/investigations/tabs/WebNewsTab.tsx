import React, { useState } from 'react';
import type { Investigation } from '../../../types/investigation';
import { 
  Newspaper, 
  ExternalLink, 
  Info, 
  Filter, 
  Globe, 
  Calendar,
  Search
} from 'lucide-react';
import '../../../styles/ActivityTab.css';

interface WebNewsTabProps {
  investigation: Investigation;
}

export const WebNewsTab: React.FC<WebNewsTabProps> = ({ investigation }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const items = investigation.webAndNews || (investigation.sources || []).map((s, idx) => ({
    id: s.id || `wn-${idx}`,
    source: s.sourceName || s.website,
    sourceType: s.sourceType || 'Websites & News',
    title: s.title,
    description: `Public web finding for ${investigation.name} collected from ${s.sourceName || s.website}.`,
    url: s.url,
    discoveredAt: s.discoveredDate || s.publishedDate
  }));

  const filteredItems = items.filter(item => {
    if (selectedCategory === 'ALL') return true;
    return (item.sourceType || '').toLowerCase().includes(selectedCategory.toLowerCase());
  });

  return (
    <div className="activity-tab-pane">
      {/* Contextual Notice Banner */}
      <div style={{
        background: 'rgba(234, 88, 12, 0.08)',
        border: '1px solid rgba(234, 88, 12, 0.25)',
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <Info size={20} style={{ color: 'var(--accent-warm)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Related Public Coverage (Contextual Information)
          </h4>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            This section contains broader web results, news articles, publications, and public mentions matching the searched query name. These findings provide contextual coverage and may reference multiple individuals or public events.
          </p>
        </div>
      </div>

      <div className="activity-pane-header">
        <div>
          <h3 className="pane-title">Web & News Intelligence ({filteredItems.length})</h3>
          <p className="pane-sub">Public web mentions, articles, news coverage, and digital footprint discoveries.</p>
        </div>

        <div className="activity-filter-bar">
          <Filter size={14} className="filter-icon" />
          {['ALL', 'Websites & News', 'Knowledge'].map((cat) => (
            <button
              key={cat}
              className={`activity-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No broader web or news findings recorded for this investigation.
        </div>
      ) : (
        <div className="activity-timeline-list">
          {filteredItems.map((item, index) => (
            <div key={item.id || index} className="activity-card-row">
              <div className="activity-card-icon-col">
                <div className="activity-icon-badge">
                  <Newspaper size={16} />
                </div>
              </div>

              <div className="activity-card-content">
                <div className="activity-card-top flex-between">
                  <div className="activity-meta-tags">
                    <span className="activity-category-pill">{item.sourceType || 'Web & News'}</span>
                    <span className="activity-source-name">
                      <Globe size={12} /> {item.source}
                    </span>
                  </div>
                  {item.discoveredAt && (
                    <span className="activity-date">
                      <Calendar size={12} /> {item.discoveredAt}
                    </span>
                  )}
                </div>

                <h4 className="activity-item-title">{item.title}</h4>
                <p className="activity-brief-report">{item.description}</p>

                {item.url && (
                  <div className="activity-card-footer">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="activity-source-link">
                      Open Original Web Source <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
