import React, { useState } from 'react';
import type { Investigation, IntelligenceActivity, ActivityCategory } from '../../../types/investigation';
import { 
  Calendar, 
  ExternalLink, 
  Filter, 
  ArrowUpDown, 
  FileText, 
  MapPin, 
  Tag 
} from 'lucide-react';
import { PlatformIcon } from '../../ui/PlatformIcon';
import '../../../styles/ActivityTab.css';

interface ActivityTabProps {
  investigation: Investigation;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({ investigation }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const rawActivities: IntelligenceActivity[] = investigation.activities || (investigation.recentActivities || []).map((a, i) => ({
    id: `act-legacy-${i}`,
    title: a.title,
    briefReport: `Public activity or news coverage recorded on ${a.platform}.`,
    date: a.timestamp || 'Recently Documented',
    category: (a.type as any) || 'News Mention',
    sourceName: a.platform,
    sourceUrl: a.url || '#'
  }));

  const categoriesList: ActivityCategory[] = [
    'Political',
    'Professional',
    'Business',
    'Public Appearance',
    'Interview',
    'Speech',
    'Conference',
    'Event',
    'Publication',
    'Social Media',
    'News Mention',
    'Organization Activity'
  ];

  // Filter
  const filtered = rawActivities.filter(a => {
    if (selectedCategory === 'ALL') return true;
    return a.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="activity-tab-pane">
      <div className="activity-pane-header">
        <div>
          <h3 className="pane-title">Public Activity & Media Timeline</h3>
          <p className="pane-sub">Chronological intelligence report of verified public appearances, statements, articles, and events.</p>
        </div>

        {/* Filter & Sort Controls */}
        <div className="controls-bar">
          <div className="filter-group">
            <Filter size={14} className="control-icon" />
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="select-dropdown"
            >
              <option value="ALL">All Categories ({rawActivities.length})</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <button 
            type="button" 
            className="sort-toggle-btn"
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
          >
            <ArrowUpDown size={14} /> {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-activity-box">
          No public activities or news items recorded matching the selected filter.
        </div>
      ) : (
        <div className="activity-timeline-list">
          {sorted.map((item) => (
            <div key={item.id} className="timeline-item-card">
              <div className="timeline-badge-column">
                <div className="timeline-dot" />
                <div className="timeline-line" />
              </div>

              <div className="timeline-card-content">
                <div className="timeline-card-header">
                  <div className="category-pill-tag">
                    <Tag size={12} /> {item.category}
                  </div>
                  <div className="date-tag">
                    <Calendar size={12} /> {item.date}
                  </div>
                </div>

                <h4 className="activity-title">{item.title}</h4>

                <div className="brief-report-box">
                  <div className="report-header">
                    <FileText size={13} /> <strong>Brief Report:</strong>
                  </div>
                  <p className="report-text">{item.briefReport}</p>
                </div>

                <div className="activity-meta-footer">
                  <div className="source-info">
                    <PlatformIcon platform={item.sourceName} domain={item.sourceUrl} size={15} />
                    <span>Source: <strong>{item.sourceName}</strong></span>
                    {item.location && (
                      <span className="location-tag">
                        <MapPin size={12} /> {item.location}
                      </span>
                    )}
                  </div>

                  {item.sourceUrl && item.sourceUrl !== '#' && (
                    <a 
                      href={item.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="read-original-btn"
                    >
                      Read Original <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
