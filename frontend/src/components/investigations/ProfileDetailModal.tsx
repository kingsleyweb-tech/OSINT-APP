import React from 'react';
import { X, ExternalLink, Code, Globe, Calendar, MapPin, Building, ShieldCheck, User } from 'lucide-react';
import type { SocialProfile } from '../../types/investigation';
import '../../styles/ProfileDetailModal.css';

interface ProfileDetailModalProps {
  profile: SocialProfile | null;
  onClose: () => void;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({ profile, onClose }) => {
  if (!profile) return null;

  const metadata = (profile as any).metadata || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-detail-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <span className="platform-tag">{profile.platform} Intelligence</span>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="profile-detail-hero">
          {profile.avatarUrl || metadata.avatarUrl || metadata.profileImage ? (
            <img 
              src={profile.avatarUrl || metadata.avatarUrl || metadata.profileImage} 
              alt={profile.username} 
              className="hero-avatar-img"
            />
          ) : (
            <div className="hero-avatar-fallback">
              <User size={32} />
            </div>
          )}

          <div className="hero-meta">
            <h2 className="hero-username">@{profile.username}</h2>
            <div className="confidence-chip high">
              <ShieldCheck size={14} />
              <span>{profile.confidenceLevel} Match ({profile.confidence}%)</span>
            </div>
          </div>
        </div>

        <div className="profile-detail-body">
          {metadata.bio || profile.bio ? (
            <div className="detail-section">
              <h4 className="detail-label">Bio / Overview</h4>
              <p className="detail-text">{metadata.bio || profile.bio}</p>
            </div>
          ) : null}

          <div className="stats-grid">
            {metadata.publicRepos !== undefined && (
              <div className="stat-box">
                <Code size={16} className="stat-icon" />
                <span className="stat-num">{metadata.publicRepos}</span>
                <span className="stat-name">Public Repos</span>
              </div>
            )}

            {metadata.followers !== undefined && (
              <div className="stat-box">
                <User size={16} className="stat-icon" />
                <span className="stat-num">{metadata.followers}</span>
                <span className="stat-name">Followers</span>
              </div>
            )}

            {metadata.createdAt && (
              <div className="stat-box">
                <Calendar size={16} className="stat-icon" />
                <span className="stat-num">{new Date(metadata.createdAt).getFullYear()}</span>
                <span className="stat-name">Member Since</span>
              </div>
            )}
          </div>

          <div className="info-list-group">
            {metadata.company && (
              <div className="info-item">
                <Building size={14} className="item-icon" />
                <span>Organization: <strong>{metadata.company}</strong></span>
              </div>
            )}

            {metadata.location && (
              <div className="info-item">
                <MapPin size={14} className="item-icon" />
                <span>Location: <strong>{metadata.location}</strong></span>
              </div>
            )}

            {metadata.blog && (
              <div className="info-item">
                <Globe size={14} className="item-icon" />
                <span>Website: <a href={metadata.blog.startsWith('http') ? metadata.blog : `https://${metadata.blog}`} target="_blank" rel="noreferrer" className="text-cyan">{metadata.blog}</a></span>
              </div>
            )}
          </div>
        </div>

        <div className="profile-modal-footer">
          <a 
            href={profile.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="open-source-btn"
          >
            <span>Open Verified Source Profile</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};
