import React, { useState } from 'react';
import type { Investigation, IntelligenceSource, SourceType } from '../../../types/investigation';
import { 
  Globe, 
  ExternalLink, 
  Calendar, 
  CheckCircle2, 
  Filter, 
  Shield, 
  FileText, 
  Link 
} from 'lucide-react';
import { PlatformIcon } from '../../ui/PlatformIcon';
import '../../../styles/SourcesTab.css';

interface SourcesTabProps {
  investigation: Investigation;
}

export const SourcesTab: React.FC<SourcesTabProps> = ({ investigation }) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const sources: IntelligenceSource[] = investigation.sources || (investigation.sourceLinks || []).map((l, i) => ({
    id: `src-legacy-${i}`,
    sourceName: l.title.split(':')[0] || 'Public Web Source',
    title: l.title.split(':').slice(1).join(':').trim() || l.title,
    website: new URL(l.url.startsWith('http') ? l.url : `https://${l.url}`).hostname.replace(/^www\./, '') || 'Web',
    domain: 'Web',
    sourceType: 'Web Document',
    discoveredDate: new Date().toLocaleDateString(),
    url: l.url,
    usedFor: ['Identity Verification'],
    confidenceScore: 80
  }));

  const sourceTypesList: SourceType[] = [
    'News Article',
    'Social Profile',
    'Developer Profile',
    'Knowledge Base',
    'Web Document',
    'Organization Page',
    'RSS Feed',
    'Government'
  ];

  const filtered = sources.filter(s => {
    if (selectedType === 'ALL') return true;
    return s.sourceType.toLowerCase() === selectedType.toLowerCase();
  });

  return (
    <div className="sources-tab-pane">
      <div className="sources-pane-header">
        <div>
          <h3 className="pane-title">Evidence & Source Attribution Layer</h3>
          <p className="pane-sub">Complete list of verified public URLs, news publications, knowledge bases, and domain records used in this investigation.</p>
        </div>

        <div className="filter-group">
          <Filter size={14} className="control-icon" />
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            className="select-dropdown"
          >
            <option value="ALL">All Source Types ({sources.length})</option>
            {sourceTypesList.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-sources-box">
          No public sources discovered matching the selected filter.
        </div>
      ) : (
        <div className="sources-table-card">
          <table className="sources-table">
            <thead>
              <tr>
                <th>Source Website</th>
                <th>Title / Document</th>
                <th>Type</th>
                <th>Evidence Usage</th>
                <th>Discovered</th>
                <th>Confidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((src) => (
                <tr key={src.id}>
                  <td>
                    <div className="source-domain-cell">
                      <PlatformIcon platform={src.sourceName} domain={src.url} size={16} className="domain-icon" />
                      <div>
                        <div className="domain-name">{src.website}</div>
                        <div className="source-name-sub">{src.sourceName}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="source-title-cell">
                      {src.title}
                    </div>
                  </td>
                  <td>
                    <span className="source-type-badge">{src.sourceType}</span>
                  </td>
                  <td>
                    <div className="used-for-badges">
                      {(src.usedFor || ['Identity Verification']).map((uf, idx) => (
                        <span key={idx} className="used-for-chip">
                          <Link size={10} /> {uf}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="date-cell">
                      <Calendar size={12} /> {src.discoveredDate}
                    </span>
                  </td>
                  <td>
                    <span className="conf-score-cell">
                      <Shield size={12} className="shield-icon" /> {src.confidenceScore}%
                    </span>
                  </td>
                  <td>
                    <a 
                      href={src.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="open-url-btn"
                    >
                      Open <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
