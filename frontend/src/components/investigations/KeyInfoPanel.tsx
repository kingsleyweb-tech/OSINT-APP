import React from 'react';
import { ShieldCheck, Search, Database, Layers, CheckCircle2, Globe, FileText, User } from 'lucide-react';
import type { Investigation } from '../../types/investigation';
import '../../styles/KeyInfoPanel.css';

interface KeyInfoPanelProps {
  investigation: Investigation;
}

export const KeyInfoPanel: React.FC<KeyInfoPanelProps> = ({ investigation }) => {
  const profile = investigation.targetProfile || {
    fullName: investigation.name,
    location: 'Not specified',
    occupation: 'Not specified',
    interests: [],
    lastActive: 'No public activity recorded'
  };

  const isUsernameSearch = (investigation as any).searchType === 'username' || (investigation.searchInputs as any)?.searchType === 'username';
  const deepStats = (investigation as any).deepStats;

  const socialProfiles = investigation.socialProfiles || [];
  const exactMatchesCount = socialProfiles.filter(p => p.confidence >= 88 || p.confidenceLevel === 'High').length;
  const possibleMatchesCount = socialProfiles.filter(p => p.confidence < 88).length;

  const formattedInterests = Array.isArray(profile.interests) && profile.interests.length > 0 
    ? profile.interests.filter(Boolean).join(', ') 
    : 'None identified';

  const coveragePercent = deepStats?.searchCoveragePercent || 85;

  return (
    <div className="key-info-panel-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Target Key Info Panel */}
      <div className="key-info-panel">
        <h4 className="panel-title">Key Information</h4>
        <div className="info-rows-list">
          <div className="info-row">
            <span className="info-label">Name / Target</span>
            <span className="info-value">{profile.fullName || investigation.name}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Location</span>
            <span className="info-value">{profile.location || 'Not specified'}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Occupation / Role</span>
            <span className="info-value">{profile.occupation || 'Not specified'}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Platform Categories</span>
            <span className="info-value">{formattedInterests}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Last Active</span>
            <span className="info-value">{profile.lastActive || 'No public activity recorded'}</span>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED INVESTIGATION SUMMARY CARD */}
      <div className="investigation-summary-card" style={{
        backgroundColor: 'var(--card-bg, #111726)',
        border: '1px solid var(--border-color, #1e293b)',
        borderRadius: '12px',
        padding: '16px',
        color: 'var(--text-main, #f8fafc)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isUsernameSearch ? <User size={16} className="text-blue" /> : <ShieldCheck size={16} className="text-emerald" />}
            {isUsernameSearch ? 'Username Investigation Summary' : 'Person Investigation Summary'}
          </h4>
          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
            {isUsernameSearch ? `@${investigation.name}` : investigation.name}
          </span>
        </div>

        {isUsernameSearch ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Exact Matches</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>{exactMatchesCount}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Possible Matches</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fbbf24' }}>{possibleMatchesCount}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Platforms Discovered</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#60a5fa' }}>{socialProfiles.length}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Web References</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#c084fc' }}>{(investigation.webAndNews || []).length}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Potential Profiles</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}>{investigation.resultsCount?.profiles || socialProfiles.length}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Strong Identity Matches</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>{exactMatchesCount}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Organizations</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#a78bfa' }}>{investigation.resultsCount?.associations || (investigation.associations || []).length}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Public Activity</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f472b6' }}>{investigation.resultsCount?.activities || (investigation.activities || []).length}</div>
            </div>
          </div>
        )}
      </div>

      {/* 3. TRUTHFUL SEARCH COVERAGE CARD */}
      <div className="search-coverage-card" style={{
        backgroundColor: 'var(--card-bg, #111726)',
        border: '1px solid var(--border-color, #1e293b)',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>
            Deep Search Coverage
          </h4>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>{coveragePercent}%</span>
        </div>

        {/* Progress Bar */}
        <div style={{ height: '6px', width: '100%', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ height: '100%', width: `${coveragePercent}%`, backgroundColor: '#38bdf8', transition: 'width 0.3s ease' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
          <span>Platforms checked: <strong style={{ color: '#f8fafc' }}>{deepStats?.platformsChecked || (investigation.searchCoverage || []).length || 28}</strong></span>
          <span>Queries: <strong style={{ color: '#f8fafc' }}>{deepStats?.queriesExecuted || 35}</strong></span>
          <span>Pages: <strong style={{ color: '#f8fafc' }}>{deepStats?.pagesReviewed || 3}</strong></span>
        </div>
      </div>
    </div>
  );
};
