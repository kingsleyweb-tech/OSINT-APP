import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlusCircle, Trash2, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import '../../styles/InvestigationsList.css';
import type { Investigation } from '../../types/investigation';
import { subscribeToUserInvestigations, deleteInvestigationFromDb } from '../../firebase/firestore';
import { useToast } from '../../components/ui/Toast';

interface InvestigationsListPageProps {
  currentUser?: {
    uid: string;
  };
}

export const InvestigationsListPage: React.FC<InvestigationsListPageProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  
  const [deleteTarget, setDeleteTarget] = useState<Investigation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const userId = currentUser?.uid || '';

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToUserInvestigations(
      userId,
      (list) => {
        setInvestigations(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to investigations:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  const filtered = investigations.filter(inv =>
    inv.name.toLowerCase().includes(filter.toLowerCase()) ||
    (inv.description && inv.description.toLowerCase().includes(filter.toLowerCase()))
  );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteInvestigationFromDb(deleteTarget.id);
      success('Investigation Deleted', `"${deleteTarget.name}" has been permanently removed.`);
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      toastError('Delete Failed', err.message || 'Could not delete investigation.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="investigations-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Investigations</h1>
          <p className="page-subtitle">{investigations.length} case{investigations.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="new-inv-btn" onClick={() => navigate('/search')}>
          <PlusCircle size={15} /> New Investigation
        </button>
      </div>

      <div className="table-controls">
        <div className="search-filter-box">
          <Search className="search-icon" size={14} />
          <input
            type="text"
            className="filter-input"
            placeholder="Filter investigations by target or description..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="investigations-table">
          <thead>
            <tr>
              <th>Target</th>
              <th>Status</th>
              <th>Confidence</th>
              <th>Sources</th>
              <th>Last Searched</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty-row">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px 0' }}>
                    <Loader2 size={18} className="animate-spin" /> Loading investigations...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">
                  {filter ? 'No investigations match your filter.' : 'No investigations yet. Start your first scan.'}
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="table-row"
                  onClick={() => navigate(`/investigations/${inv.id}`, { state: { investigation: inv } })}
                >
                  <td>
                    <div className="entity-cell">
                      <div className="cell-avatar">{inv.targetProfile?.initials || inv.name.substring(0, 2).toUpperCase()}</div>
                      <div className="entity-meta">
                        <span className="entity-name">{inv.name}</span>
                        <span className="entity-handle">{inv.description || inv.targetProfile?.occupation || inv.status}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${inv.status ? inv.status.toLowerCase().replace(' ', '-') : 'completed'}`}>
                      {inv.status || 'Completed'}
                    </span>
                  </td>
                  <td><span className="conf-text">{inv.overallConfidence ?? 85}%</span></td>
                  <td>{inv.sources?.length ?? 0}</td>
                  <td>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="icon-action-btn"
                        onClick={e => { e.stopPropagation(); navigate(`/investigations/${inv.id}`, { state: { investigation: inv } }); }}
                        title="Open Details"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        className="icon-action-btn danger"
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteTarget(inv);
                        }}
                        title="Delete Investigation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(5, 8, 16, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            background: 'var(--card-bg, #0f172a)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            color: 'var(--text-main, #f8fafc)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#ef4444' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>Confirm Deletion</h3>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.92rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete the investigation for <strong>"{deleteTarget.name}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: 'var(--text-main, #fff)',
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
