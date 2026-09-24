import React, { useMemo, useState } from 'react';
import type { Finding, FindingConfidence, FindingStatus } from '../../../types/investigation';
import { currentActor, levelOf, newAuditEvent, nextFindingId, shortUrl } from '../../../lib/workspace';
import { useWorkspace, type RecordFindingPrefill } from './WorkspaceContext';
import { LevelBadge, Modal } from './ui';

const CATEGORIES = ['Identity', 'Education', 'Employment', 'Location', 'Membership', 'Online presence', 'Activity', 'Other'];

export const RecordFindingModal: React.FC<{ prefill: RecordFindingPrefill; onClose: () => void }> = ({ prefill, onClose }) => {
  const { inv, d, commit } = useWorkspace();
  const editing = prefill.finding;
  const [title, setTitle] = useState(editing?.title || prefill.title || '');
  const [category, setCategory] = useState(editing?.category || 'Identity');
  const [statement, setStatement] = useState(editing?.statement || prefill.statement || '');
  const [confidence, setConfidence] = useState<FindingConfidence>(editing?.confidence || 'Medium');
  const [status, setStatus] = useState<FindingStatus>(editing?.status || 'Needs corroboration');
  const [keys, setKeys] = useState<Set<string>>(new Set(editing?.sourceKeys || prefill.sourceKeys || []));
  const [filter, setFilter] = useState('');

  const sources = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return d.sources.filter(s => !q || `${s.sid} ${s.source.title} ${s.source.url}`.toLowerCase().includes(q));
  }, [d.sources, filter]);

  const toggle = (k: string) => setKeys(prev => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    return next;
  });

  const save = () => {
    const now = new Date().toISOString();
    const findings = inv.findings || [];
    if (editing) {
      const updated: Finding = { ...editing, title: title.trim(), category, statement: statement.trim(), confidence, status, sourceKeys: Array.from(keys), updatedAt: now };
      const changes: string[] = [];
      if (editing.confidence !== confidence) changes.push(`Confidence ${editing.confidence} → ${confidence}`);
      if (editing.status !== status) changes.push(`Status ${editing.status} → ${status}`);
      if (editing.sourceKeys.length !== keys.size) changes.push(`${keys.size} supporting source(s)`);
      commit(
        i => ({ ...i, findings: findings.map(f => (f.id === editing.id ? updated : f)) }),
        [newAuditEvent({ action: 'Finding updated', object: editing.id, detail: changes.join(' · ') || 'Details edited', group: 'Findings', kind: 'finding' })]
      );
    } else {
      const id = nextFindingId(findings);
      const created: Finding = {
        id, title: title.trim(), category, statement: statement.trim(), confidence, status,
        sourceKeys: Array.from(keys), createdAt: now, updatedAt: now, createdBy: currentActor()
      };
      commit(
        i => ({ ...i, findings: [...findings, created] }),
        [newAuditEvent({ action: 'Finding added', object: id, detail: `${created.title} · ${confidence}`, group: 'Findings', kind: 'finding' })]
      );
    }
    onClose();
  };

  const remove = () => {
    if (!editing || !window.confirm(`Delete finding ${editing.id}? This cannot be undone.`)) return;
    commit(
      i => ({ ...i, findings: (i.findings || []).filter(f => f.id !== editing.id) }),
      [newAuditEvent({ action: 'Finding deleted', object: editing.id, detail: editing.title, group: 'Findings', kind: 'removal' })]
    );
    onClose();
  };

  return (
    <Modal
      title={editing ? `Edit finding ${editing.id}` : 'Record finding'}
      onClose={onClose}
      footer={(
        <>
          <div>{editing && <button type="button" className="ws-btn ws-btn-danger" onClick={remove}>Delete</button>}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="ws-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="ws-btn ws-btn-primary" disabled={!title.trim()} onClick={save}>
              {editing ? 'Save finding' : 'Record finding'}
            </button>
          </div>
        </>
      )}
    >
      <p className="ws-sub" style={{ marginTop: -8, marginBottom: 16 }}>
        A finding is your conclusion after reviewing the evidence. Search results never become findings on their own.
      </p>
      <label className="ws-field">
        <span>Finding</span>
        <input className="ws-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Enrolled as a student at …" autoFocus />
      </label>
      <label className="ws-field">
        <span>Explanation</span>
        <textarea className="ws-textarea" rows={3} value={statement} onChange={e => setStatement(e.target.value)} placeholder="What the evidence shows and how the sources agree" />
      </label>
      <div className="ws-grid-2">
        <label className="ws-field">
          <span>Category</span>
          <select className="ws-select" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="ws-field">
          <span>Confidence</span>
          <select className="ws-select" value={confidence} onChange={e => setConfidence(e.target.value as FindingConfidence)}>
            <option>High</option><option>Medium</option><option>Low</option>
          </select>
        </label>
      </div>
      <label className="ws-field">
        <span>Status</span>
        <select className="ws-select" value={status} onChange={e => setStatus(e.target.value as FindingStatus)}>
          <option>Confirmed</option><option>Needs corroboration</option>
        </select>
      </label>
      <div className="ws-field">
        <span>Supporting sources · {keys.size} selected</span>
        <input className="ws-input" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter sources" />
        {d.sources.length === 0 ? (
          <div className="ws-sub">This investigation has no sources yet.</div>
        ) : (
          <div className="ws-pick-list">
            {sources.map(s => (
              <label key={s.key}>
                <input type="checkbox" checked={keys.has(s.key)} onChange={() => toggle(s.key)} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="ws-mono ws-muted">{s.sid}</span> <b>{s.source.title}</b>
                  <div className="ws-cell-sub">{shortUrl(s.source.url)}</div>
                </span>
                <LevelBadge level={levelOf(inv, s.key)} />
              </label>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
