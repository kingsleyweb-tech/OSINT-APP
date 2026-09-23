import React, { useState } from 'react';
import type { Investigation, SocialProfile } from '../../../types/investigation';
import { 
  Share2, 
  Code, 
  Video, 
  UserCheck, 
  CheckCircle2, 
  Eye, 
  ExternalLink,
  Filter 
} from 'lucide-react';
import { ProfileDetailModal } from '../ProfileDetailModal';
import { PlatformIcon } from '../../ui/PlatformIcon';
import '../../../styles/ProfilesTab.css';

interface ProfilesTabProps {
  investigation: Investigation;
}

export const ProfilesTab: React.FC<ProfilesTabProps> = ({ investigation }) => {
  const [selectedProfile, setSelectedProfile] = useState<SocialProfile | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const profiles = investigation.socialProfiles || [];

  const categories = [
    { title: 'Social Media', key: 'Social', icon: <Share2 size={16} /> },
    { title: 'Professional Profiles', key: 'Professional', icon: <UserCheck size={16} /> },
    { title: 'Developer & Code Platforms', key: 'Developer', icon: <Code size={16} /> },
    { title: 'Video & Streaming', key: 'Video & Streaming', icon: <Video size={16} /> }
  ];

  const getProfilesByCategory = (catKey: string) => {
    return profiles.filter(p => {
      const cat = (p as any).category || 'Social';
      return cat === catKey || (catKey === 'Social' && cat !== 'Professional' && cat !== 'Developer' && cat !== 'Video & Streaming');
    });
  };

  const filteredProfiles = filterCategory === 'All' 
    ? profiles 
    : getProfilesByCategory(filterCategory);

  return (
    <div className="profiles-tab-pane">
      <div className="tab-pane-header">
        <div>
          <h3 className="pane-title">Verified Profiles & Handle Intelligence</h3>
          <p className="pane-sub">Legitimate public profiles discovered across connected intelligence sources.</p>
        </div>
        <div className="count-badge-cyan">
          {profiles.length} Profiles Discovered
        </div>
      </div>

      {/* Platform Filter Selector */}
      {profiles.length > 0 && (
        <div className="platform-filter-bar">
          <span className="filter-label"><Filter size={13} /> Filter Category:</span>
          {['All', 'Social', 'Professional', 'Developer', 'Video & Streaming'].map(c => (
            <button 
              key={c} 
              className={`platform-filter-btn ${filterCategory === c ? 'active' : ''}`}
              onClick={() => setFilterCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="empty-pane-box">
          No public profiles verified for this investigation.
        </div>
      ) : filterCategory !== 'All' ? (
        <div className="cat-profiles-grid">
          {filteredProfiles.map((p, idx) => (
            <div 
              key={idx} 
              className="profile-box-card"
              onClick={() => setSelectedProfile(p)}
            >
              <div className="box-card-top">
                <div className="platform-tag-pill-wrap">
                  <PlatformIcon platform={p.platform} size={16} />
                  <span className="platform-tag-pill">{p.platform}</span>
                </div>
                <div className={`conf-chip ${p.confidenceLevel ? p.confidenceLevel.toLowerCase() : 'high'}`}>
                  <CheckCircle2 size={12} /> {p.confidence}% Match
                </div>
              </div>

              <div className="box-card-middle">
                <div className="handle-name">@{p.username}</div>
                {p.bio && <p className="bio-snippet">{p.bio}</p>}
              </div>

              <div className="box-card-bottom">
                <a 
                  href={p.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="view-link-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  Visit Profile <ExternalLink size={12} />
                </a>
                <button className="inspect-btn" onClick={() => setSelectedProfile(p)}>
                  <Eye size={14} /> Inspect
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="category-groups-list">
          {categories.map(cat => {
            const catProfiles = getProfilesByCategory(cat.key);
            if (catProfiles.length === 0) return null;

            return (
              <div key={cat.key} className="profile-cat-card">
                <div className="cat-card-header">
                  {cat.icon}
                  <h4 className="cat-card-title">{cat.title} ({catProfiles.length})</h4>
                </div>

                <div className="cat-profiles-grid">
                  {catProfiles.map((p, idx) => (
                    <div 
                      key={idx} 
                      className="profile-box-card"
                      onClick={() => setSelectedProfile(p)}
                    >
                      <div className="box-card-top">
                        <div className="platform-tag-pill-wrap">
                          <PlatformIcon platform={p.platform} size={16} />
                          <span className="platform-tag-pill">{p.platform}</span>
                        </div>
                        <div className={`conf-chip ${p.confidenceLevel ? p.confidenceLevel.toLowerCase() : 'high'}`}>
                          <CheckCircle2 size={12} /> {p.confidence}% Match
                        </div>
                      </div>

                      <div className="box-card-middle">
                        <div className="handle-name">@{p.username}</div>
                        {p.bio && <p className="bio-snippet">{p.bio}</p>}
                      </div>

                      <div className="box-card-bottom">
                        <a 
                          href={p.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="view-link-btn"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Visit Profile <ExternalLink size={12} />
                        </a>
                        <button className="inspect-btn" onClick={() => setSelectedProfile(p)}>
                          <Eye size={14} /> Inspect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProfileDetailModal 
        profile={selectedProfile} 
        onClose={() => setSelectedProfile(null)} 
      />
    </div>
  );
};
