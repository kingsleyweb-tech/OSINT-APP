import React from 'react';
import type { Investigation } from '../../../types/investigation';
import { KeyInfoPanel } from '../KeyInfoPanel';
import { SocialProfilesList } from '../SocialProfilesList';
import { RecentActivityList } from '../RecentActivityList';
import '../../../styles/OverviewTab.css';

interface OverviewTabProps {
  investigation: Investigation;
  onNavigateTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  investigation,
  onNavigateTab
}) => {
  const associations = investigation.associations || [];
  const topAssociations = associations.slice(0, 4);
  const overviewActivities = (investigation.recentActivities || []).slice(0, 4);

  return (
    <div className="overview-tab-pane">
      {/* Clean 2-Column Grid for Overview */}
      <div className="overview-two-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '20px',
        width: '100%'
      }}>
        {/* Left Column */}
        <div className="grid-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          <KeyInfoPanel investigation={investigation} />

          <SocialProfilesList 
            profiles={investigation.socialProfiles || []} 
            onViewAll={() => onNavigateTab('profiles')}
            compact={true}
          />
        </div>

        {/* Right Column */}
        <div className="grid-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          {/* Key Documented Associations */}
          <div className="overview-card associations-summary-card">
            <div className="card-header-row">
              <h4 className="card-heading">Key Documented Associations</h4>
              <button className="view-more-btn" onClick={() => onNavigateTab('associations')}>
                View All ({associations.length}) &rarr;
              </button>
            </div>

            {topAssociations.length > 0 ? (
              <div className="assoc-mini-list">
                {topAssociations.map((assoc, i) => (
                  <div key={i} className="assoc-mini-item">
                    <div className="assoc-mini-header">
                      <span className="assoc-category-tag">{assoc.category}</span>
                      <span className={`assoc-evidence-chip ${assoc.evidenceState.toLowerCase().replace(/\s+/g, '-')}`}>
                        {assoc.evidenceState}
                      </span>
                    </div>
                    <div className="assoc-title">{assoc.name}</div>
                    <div className="assoc-rel">{assoc.relationship}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-mini-text">No high-confidence organizational associations identified yet.</div>
            )}
          </div>

          <RecentActivityList 
            activities={overviewActivities} 
            onViewAll={() => onNavigateTab('activity')}
          />
        </div>
      </div>
    </div>
  );
};
