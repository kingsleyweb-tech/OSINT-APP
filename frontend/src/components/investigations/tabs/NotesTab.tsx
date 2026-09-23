import React from 'react';
import type { Investigation } from '../../../types/investigation';
import { MessageSquare, Plus, Calendar, User } from 'lucide-react';
import '../../../styles/OverviewTab.css';

interface NotesTabProps {
  investigation: Investigation;
  onAddNote: (e: React.FormEvent) => void;
  newNoteText: string;
  setNewNoteText: (val: string) => void;
  isSavingNote: boolean;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  investigation,
  onAddNote,
  newNoteText,
  setNewNoteText,
  isSavingNote
}) => {
  const notes = investigation.notes || [];

  return (
    <div className="notes-tab-pane" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <div className="pane-header">
        <h3 className="pane-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Investigator Notes & Verified Findings ({notes.length})
        </h3>
        <p className="pane-sub" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Add custom findings, analytical observations, and verified notes to this investigation file.
        </p>
      </div>

      <div className="investigation-notes-section">
        <form onSubmit={onAddNote} className="add-note-form">
          <input
            type="text"
            placeholder="Add a verified finding or analytical note to this investigation record..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            className="note-input"
          />
          <button type="submit" className="add-note-btn" disabled={isSavingNote || !newNoteText.trim()}>
            <Plus size={16} /> Add Note
          </button>
        </form>

        <div className="notes-list" style={{ marginTop: '16px' }}>
          {notes.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No investigator notes recorded yet. Use the input above to log verified findings.
            </div>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="note-card">
                <div className="note-card-header">
                  <span className="note-author" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} /> {n.author}
                  </span>
                  <span className="note-time" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="note-text">{n.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
