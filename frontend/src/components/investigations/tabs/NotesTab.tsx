import React, { useEffect, useMemo, useState } from 'react';
import { MoreHorizontal, Plus, X } from 'lucide-react';
import type { InvestigationNote, NoteType } from '../../../types/investigation';
import { currentActor, fmtDate, fmtTime, newAuditEvent, noteTitle, noteType } from '../../../lib/workspace';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Chips, Empty, initials } from '../workspace/ui';

const TYPES: NoteType[] = ['Observation', 'Question', 'Comment', 'Method'];

interface Draft {
  id: string | null;
  type: NoteType;
  title: string;
  text: string;
  links: string[];
}

export const NotesTab: React.FC<{ draftLinks: string[] | null; onDraftConsumed: () => void }> = ({ draftLinks, onDraftConsumed }) => {
  const { inv, d, commit, openRecordFinding, goTab } = useWorkspace();
  const notes = inv.notes || [];
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [comment, setComment] = useState('');
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (draftLinks) {
      setDraft({ id: null, type: 'Observation', title: '', text: '', links: draftLinks });
      onDraftConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftLinks]);

  const sorted = useMemo(() => [...notes].sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt)), [notes]);
  const q = query.trim().toLowerCase();
  const visible = sorted.filter(n => (typeFilter === 'all' || noteType(n) === typeFilter) && (!q || `${n.title || ''} ${n.text}`.toLowerCase().includes(q)));
  const selected = draft ? null : notes.find(n => n.id === selectedId) || visible[0] || null;

  const linkLabel = (link: string): { id: string; label: string; onClick: () => void } => {
    if (/^F-\d+$/.test(link)) {
      const f = (inv.findings || []).find(x => x.id === link);
      return { id: link, label: f?.title || 'Finding', onClick: () => goTab('findings', link) };
    }
    const s = d.sourceByKey.get(link);
    return { id: s?.sid || 'S-?', label: s?.source.title || link, onClick: () => goTab('sources', link) };
  };

  const linkOptions = [
    ...d.sources.map(s => ({ value: s.key, label: `${s.sid} · ${s.source.title}` })),
    ...(inv.findings || []).map(f => ({ value: f.id, label: `${f.id} · ${f.title}` }))
  ];

  const saveDraft = () => {
    if (!draft || !draft.text.trim()) return;
    const now = new Date().toISOString();
    if (draft.id) {
      const id = draft.id;
      commit(
        i => ({ ...i, notes: (i.notes || []).map(n => (n.id === id ? { ...n, type: draft.type, title: draft.title.trim() || undefined, text: draft.text.trim(), links: draft.links, updatedAt: now } : n)) }),
        [newAuditEvent({ action: 'Note edited', object: d.noteIds.get(id) || 'note', detail: `${draft.type} · ${draft.title.trim() || noteTitle({ ...draft, author: '', createdAt: now, id } as InvestigationNote)}`, group: 'Notes', kind: 'investigator' })]
      );
      setSelectedId(id);
    } else {
      const note: InvestigationNote = {
        id: `note-${Date.now()}`, text: draft.text.trim(), author: currentActor(), createdAt: now,
        type: draft.type, title: draft.title.trim() || undefined, links: draft.links, comments: []
      };
      commit(
        i => ({ ...i, notes: [note, ...(i.notes || [])] }),
        [newAuditEvent({ action: 'Note added', object: `N-${String(notes.length + 1).padStart(2, '0')}`, detail: `${draft.type}${draft.links.length ? ` · linked ${draft.links.map(l => linkLabel(l).id).join(', ')}` : ''}`, group: 'Notes', kind: 'investigator' })]
      );
      setSelectedId(note.id);
    }
    setDraft(null);
  };

  const deleteNote = (n: InvestigationNote) => {
    setMenu(false);
    if (!window.confirm('Delete this note?')) return;
    commit(
      i => ({ ...i, notes: (i.notes || []).filter(x => x.id !== n.id) }),
      [newAuditEvent({ action: 'Note deleted', object: d.noteIds.get(n.id) || 'note', detail: noteTitle(n), group: 'Notes', kind: 'removal' })]
    );
    setSelectedId(null);
  };

  const postComment = (n: InvestigationNote) => {
    if (!comment.trim()) return;
    const c = { id: `c-${Date.now()}`, author: currentActor(), text: comment.trim(), createdAt: new Date().toISOString() };
    commit(
      i => ({ ...i, notes: (i.notes || []).map(x => (x.id === n.id ? { ...x, comments: [...(x.comments || []), c] } : x)) }),
      [newAuditEvent({ action: 'Comment added', object: d.noteIds.get(n.id) || 'note', detail: `Comment on "${noteTitle(n)}"`, group: 'Notes', kind: 'investigator' })]
    );
    setComment('');
  };

  const typeChips = [{ key: 'all', label: 'All', count: notes.length }, ...TYPES.map(t => ({ key: t, label: `${t}s`.replace('Methods', 'Method'), count: notes.filter(n => noteType(n) === t).length })).filter(o => o.count > 0)];

  const editor = draft && (
    <div className="ws-detail-pad">
      <div className="ws-linked" style={{ marginTop: 0 }}>
        <select className="ws-select" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as NoteType })} aria-label="Note type">
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <span className="ws-sub">{draft.id ? 'Editing note' : 'New note'}</span>
      </div>
      <input className="ws-input" style={{ width: '100%', marginTop: 14, fontSize: 18, fontWeight: 600 }} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Title (optional)" />
      <textarea className="ws-textarea" style={{ marginTop: 12 }} rows={9} value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} placeholder="What did you observe, question or decide?" autoFocus />
      <div className="ws-linked">
        <span className="ws-label">Linked to</span>
        {draft.links.map(l => {
          const info = linkLabel(l);
          return (
            <span key={l} className="ws-linked-item">
              <span className="ws-mono">{info.id}</span><span>{info.label}</span>
              <button type="button" onClick={() => setDraft({ ...draft, links: draft.links.filter(x => x !== l) })} aria-label="Remove link"><X size={13} /></button>
            </span>
          );
        })}
        {linkOptions.length > 0 && (
          <select className="ws-select" value="" onChange={e => e.target.value && setDraft({ ...draft, links: Array.from(new Set([...draft.links, e.target.value])) })} aria-label="Link item" style={{ height: 32, fontWeight: 500, color: 'var(--ws-accent)' }}>
            <option value="">+ Link item</option>
            {linkOptions.filter(o => !draft.links.includes(o.value)).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>
      <div className="ws-panel-actions" style={{ marginTop: 20 }}>
        <button type="button" className="ws-btn ws-btn-primary" onClick={saveDraft} disabled={!draft.text.trim()}>Save note</button>
        <button type="button" className="ws-btn" onClick={() => setDraft(null)}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="ws-split">
      <div className="ws-split-list">
        <div className="ws-list-tools">
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input className="ws-input" style={{ flex: 1 }} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notes" />
            <button type="button" className="ws-btn ws-btn-primary" onClick={() => setDraft({ id: null, type: 'Observation', title: '', text: '', links: [] })}><Plus size={16} /> New</button>
          </div>
          <Chips options={typeChips} value={typeFilter} onChange={setTypeFilter} />
        </div>
        {visible.length === 0 && <div style={{ padding: 18 }} className="ws-sub">{notes.length ? 'No notes match.' : 'No notes yet.'}</div>}
        {visible.map(n => {
          const links = (n.links || []).map(l => linkLabel(l).id);
          return (
            <div key={n.id} className={`ws-list-item${selected?.id === n.id ? ' active' : ''}`} onClick={() => { setDraft(null); setSelectedId(n.id); }}>
              <div className="top"><span className="ws-tag">{noteType(n)}</span><span className="ws-mono ws-sub">{fmtTime(n.updatedAt || n.createdAt)}</span></div>
              <div className="ttl">{noteTitle(n)}</div>
              <div className="txt">{n.text}</div>
              <div className="foot">{[...links, n.updatedAt ? 'Edited' : 'Saved'].join(' · ')}</div>
            </div>
          );
        })}
      </div>

      <div className="ws-split-detail">
        {editor}
        {!draft && !selected && (
          <div className="ws-detail-pad"><Empty title="No note selected" action={<button type="button" className="ws-btn ws-btn-primary" onClick={() => setDraft({ id: null, type: 'Observation', title: '', text: '', links: [] })}>New note</button>}>Notes record observations, open questions and your method.</Empty></div>
        )}
        {!draft && selected && (
          <>
            <div className="ws-detail-pad">
              <div className="ws-panel-head" style={{ marginBottom: 0 }}>
                <div className="ws-chips" style={{ alignItems: 'center' }}>
                  <span className="ws-mono ws-sub">{d.noteIds.get(selected.id)}</span>
                  <span className="ws-tag">{noteType(selected)}</span>
                  <span className="ws-sub">{selected.updatedAt ? `Edited · saved ${fmtTime(selected.updatedAt)}` : `Saved ${fmtTime(selected.createdAt)}`}</span>
                </div>
                <div className="ws-actions">
                  <button
                    type="button"
                    className="ws-btn"
                    onClick={() => openRecordFinding({ title: noteTitle(selected), statement: selected.text, sourceKeys: (selected.links || []).filter(l => !/^F-\d+$/.test(l)) })}
                  >
                    Convert to finding
                  </button>
                  <button type="button" className="ws-btn ws-icon-btn" onClick={() => setMenu(m => !m)} aria-label="Note actions"><MoreHorizontal size={18} /></button>
                  {menu && (
                    <div className="ws-menu" onMouseLeave={() => setMenu(false)}>
                      <button type="button" onClick={() => { setMenu(false); setDraft({ id: selected.id, type: noteType(selected), title: selected.title || '', text: selected.text, links: selected.links || [] }); }}>Edit note</button>
                      <button type="button" onClick={() => deleteNote(selected)} style={{ color: 'var(--ws-bad)' }}>Delete note</button>
                    </div>
                  )}
                </div>
              </div>
              <h2 className="ws-detail-title">{noteTitle(selected)}</h2>
              <div className="ws-chips ws-sub" style={{ alignItems: 'center', gap: 14 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span className="ws-mini-avatar accent">{initials(selected.author)}</span>{selected.author}</span>
                <span>Created {fmtDate(selected.createdAt, true)}</span>
                {selected.updatedAt && <span>Last edited {fmtDate(selected.updatedAt, true)}</span>}
              </div>
              {(selected.links || []).length > 0 && (
                <div className="ws-linked">
                  <span className="ws-label">Linked to</span>
                  {(selected.links || []).map(l => {
                    const info = linkLabel(l);
                    return (
                      <button key={l} type="button" className="ws-linked-item" onClick={info.onClick}>
                        <span className="ws-mono">{info.id}</span><span>{info.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="ws-note-body" style={{ marginTop: 24 }}>{selected.text}</div>
            </div>
            <div className="ws-comments">
              <div className="ws-label">Comments · {(selected.comments || []).length}</div>
              {(selected.comments || []).map(c => (
                <div key={c.id} className="ws-comment">
                  <span className="ws-mini-avatar">{initials(c.author)}</span>
                  <div><b>{c.author}</b> <span className="ws-sub">· {fmtTime(c.createdAt)}</span><div>{c.text}</div></div>
                </div>
              ))}
              <div className="ws-comment-form">
                <input className="ws-input" value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && postComment(selected)} placeholder="Add a comment" />
                <button type="button" className="ws-btn" onClick={() => postComment(selected)} disabled={!comment.trim()}>Post</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
