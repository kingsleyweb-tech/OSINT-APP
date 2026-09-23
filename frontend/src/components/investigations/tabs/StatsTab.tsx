import React from 'react';
import type { Investigation } from '../../../types/investigation';
import { Layers, Calendar, RefreshCw, CheckCircle2 } from 'lucide-react';
import '../../../styles/OverviewTab.css';

interface StatsTabProps {
  investigation: Investigation;
  onNavigateTab: (tab: string) => void;
}

export const StatsTab: React.FC<StatsTabProps> = ({ investigation, onNavigateTab }) => {
  const scanHistory = investigation.scanHistory || [];

  return (
    <div className="stats-tab-pane" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <div className="pane-header">
        <h3 className="pane-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Investigation Metrics & Scan Audit History
        </h3>
        <p className="pane-sub" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Quantitative metrics, collected source counts, and historical rescan audit logs.
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="stats-mini-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="stat-pill" onClick={() => onNavigateTab('profiles')} style={{ padding: '20px' }}>
          <span className="pill-num" style={{ fontSize: '1.8rem' }}>{investigation.resultsCount?.profiles || 0}</span>
          <span className="pill-label">Verified Profiles</span>
        </div>
        <div className="stat-pill" onClick={() => onNavigateTab('activity')} style={{ padding: '20px' }}>
          <span className="pill-num" style={{ fontSize: '1.8rem' }}>{investigation.resultsCount?.activities || 0}</span>
          <span className="pill-label">Public Activities</span>
        </div>
        <div className="stat-pill" onClick={() => onNavigateTab('associations')} style={{ padding: '20px' }}>
          <span className="pill-num" style={{ fontSize: '1.8rem' }}>{investigation.resultsCount?.associations || 0}</span>
          <span className="pill-label">Documented Associations</span>
        </div>
        <div className="stat-pill" onClick={() => onNavigateTab('sources')} style={{ padding: '20px' }}>
          <span className="pill-num" style={{ fontSize: '1.8rem' }}>{investigation.resultsCount?.sources || 0}</span>
          <span className="pill-label">Evidence Sources</span>
        </div>
      </div>

      {/* Scan History Audit Log */}
      <div className="overview-card">
        <h4 className="card-heading" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>
          <RefreshCw size={18} /> Rescan Audit History ({scanHistory.length})
        </h4>

        {scanHistory.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>
            Initial scan completed on {new Date(investigation.createdAt).toLocaleDateString()}. No subsequent rescans recorded.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {scanHistory.map((scan, idx) => (
              <div key={scan.scanId || idx} style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent-warm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} /> Scan Run #{scanHistory.length - idx}
                  </span>
                  <span>{new Date(scan.scannedAt).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Discovered {scan.newFindingsCount} items (Total: {scan.totalFindingsCount})
                </div>
                {scan.changesSummary && scan.changesSummary.length > 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {scan.changesSummary.join(' • ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
