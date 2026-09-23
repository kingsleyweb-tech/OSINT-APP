import React from 'react';
import { ArrowRight, MessageSquare, Code, Users, FileText } from 'lucide-react';
import type { PublicActivity } from '../../types/investigation';
import '../../styles/RecentActivityList.css';

interface RecentActivityListProps {
  activities: PublicActivity[];
  onViewAll?: () => void;
}

export const RecentActivityList: React.FC<RecentActivityListProps> = ({ 
  activities, 
  onViewAll 
}) => {
  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'commit':
      case 'repository':
        return <Code size={16} className="act-icon" />;
      case 'post':
      case 'comment':
        return <MessageSquare size={16} className="act-icon" />;
      case 'group':
        return <Users size={16} className="act-icon" />;
      default:
        return <FileText size={16} className="act-icon" />;
    }
  };

  return (
    <div className="recent-activity-panel">
      <div className="panel-header">
        <h4 className="panel-title">Recent Activity</h4>
        <button className="view-all-link" onClick={onViewAll}>
          View all <ArrowRight size={12} />
        </button>
      </div>

      <div className="activity-list">
        {activities.map((act, idx) => (
          <div key={idx} className="activity-item-row">
            <div className="activity-icon-badge">
              {getIcon(act.type)}
            </div>
            <div className="activity-meta">
              <div className="activity-title">{act.title}</div>
              <div className="activity-sub">
                <span>{act.timestamp}</span>
                <span className="bullet">•</span>
                <span>{act.platform}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
