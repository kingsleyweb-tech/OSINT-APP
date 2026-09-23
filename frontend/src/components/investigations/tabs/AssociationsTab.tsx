import React, { useState } from 'react';
import type { Investigation, IntelligenceAssociation, AssociationCategory } from '../../../types/investigation';
import { 
  Building2, 
  ShieldCheck, 
  ExternalLink, 
  GraduationCap, 
  Landmark, 
  Users, 
  Award, 
  FileCheck 
} from 'lucide-react';
import { PlatformIcon } from '../../ui/PlatformIcon';
import '../../../styles/AssociationsTab.css';

interface AssociationsTabProps {
  investigation: Investigation;
}

export const AssociationsTab: React.FC<AssociationsTabProps> = ({ investigation }) => {
  const [selectedCat, setSelectedCat] = useState<string>('ALL');

  const associations: IntelligenceAssociation[] = investigation.associations || (investigation.associationsList as any) || [];

  const categories: AssociationCategory[] = [
    'Political',
    'Education',
    'Companies',
    'Organizations',
    'Professional',
    'Government',
    'Nonprofit',
    'Community'
  ];

  const filtered = associations.filter(a => {
    if (selectedCat === 'ALL') return true;
    return a.category.toLowerCase() === selectedCat.toLowerCase();
  });

  const getCategoryIcon = (cat: AssociationCategory) => {
    switch (cat) {
      case 'Political':
      case 'Government':
        return <Landmark size={18} style={{ color: '#00e5ff' }} />;
      case 'Education':
        return <GraduationCap size={18} style={{ color: '#10b981' }} />;
      case 'Companies':
        return <Building2 size={18} style={{ color: '#f59e0b' }} />;
      case 'Organizations':
      case 'Nonprofit':
      case 'Community':
        return <Users size={18} style={{ color: '#8b5cf6' }} />;
      default:
        return <Award size={18} style={{ color: '#00e5ff' }} />;
    }
  };

  const getEvidenceBadgeClass = (state: string) => {
    const s = state.toLowerCase();
    if (s.includes('documented') || s.includes('strong')) return 'badge-strong';
    if (s.includes('possible')) return 'badge-possible';
    return 'badge-mention';
  };

  return (
    <div className="associations-tab-pane">
      <div className="tab-pane-header">
        <div>
          <h3 className="pane-title">Documented Organizations & Affiliations</h3>
          <p className="pane-sub">Public evidence-based tracking of institutional, political, educational, and corporate associations.</p>
        </div>

        <div className="category-filter-bar">
          <button 
            type="button" 
            className={`cat-filter-btn ${selectedCat === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedCat('ALL')}
          >
            All ({associations.length})
          </button>
          {categories.map(c => (
            <button 
              key={c}
              type="button" 
              className={`cat-filter-btn ${selectedCat === c ? 'active' : ''}`}
              onClick={() => setSelectedCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-pane-box">
          No public organizational or institutional associations documented for this category.
        </div>
      ) : (
        <div className="associations-cards-grid">
          {filtered.map((assoc) => (
            <div key={assoc.id} className="assoc-evidence-card">
              <div className="card-top-row">
                <div className="icon-title-wrap">
                  {getCategoryIcon(assoc.category)}
                  <span className="assoc-cat-label">{assoc.category}</span>
                </div>
                <div className={`evidence-status-pill ${getEvidenceBadgeClass(assoc.evidenceState)}`}>
                  <ShieldCheck size={12} /> {assoc.evidenceState}
                </div>
              </div>

              <h4 className="assoc-entity-name">{assoc.name}</h4>
              <div className="assoc-relationship-text">
                Relationship: <strong>{assoc.relationship}</strong>
              </div>

              <div className="evidence-citation-box">
                <div className="citation-header">
                  <FileCheck size={13} /> <strong>Evidence Record:</strong>
                </div>
                <p className="citation-text">{assoc.evidenceCitation}</p>
              </div>

              <div className="assoc-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PlatformIcon platform={assoc.sourceName || 'Web'} domain={assoc.sourceUrl || ''} size={15} />
                  <span className="source-label">Source: {assoc.sourceName || 'Public Index'}</span>
                </div>
                {assoc.sourceUrl && (
                  <a 
                    href={assoc.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="view-evidence-link"
                  >
                    View Evidence <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
