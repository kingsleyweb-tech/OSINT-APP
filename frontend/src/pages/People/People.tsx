import React from 'react';
import { User, Globe, Mail, Phone } from 'lucide-react';
import '../../styles/People.css';

export const PeoplePage: React.FC = () => {
  return (
    <div className="people-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-subtitle">Tracked individuals across investigations</p>
        </div>
      </div>

      <div className="empty-people-state">
        <User className="empty-icon" size={40} />
        <h3>No tracked people yet</h3>
        <p>Individuals discovered during investigations will appear here.</p>
      </div>
    </div>
  );
};
