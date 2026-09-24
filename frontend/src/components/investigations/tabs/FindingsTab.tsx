import React, { useState } from 'react';
import type { Finding } from '../../../types/investigation';
import {
  assocKey, downloadFile, fmtDate, fmtTime, levelOf, noteTitle, openUrl, profileKey, safeFileName, shortUrl, urlKey
} from '../../../lib/workspace';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Empty, LevelBadge, SectionHead } from '../workspace/ui';

export const FindingsTab: React.FC = () => {
  const { inv, d, focus, openRecordFinding, goTab } = useWorkspace();
  const findings = inv.findings || [];
  const [selectedId, setSelectedId] = useState<string | null>(focus);
  const selected = findings.find(f => f.id === selectedId) || findings[0] || null;

  const exportFinding = (f: Finding) => {
    const evidence = f.sourceKeys.map(k => {
      const s = d.sourceByKey.get(k);
      return { id: s?.sid, title: s?.source.title, url: s?.source.url, level: levelOf(inv, k) };
    });
    downloadFile(`${f.id}-${safeFileName(f.title)}.json`, JSON.stringify({ investigation: inv.id, subject: inv.name, ...f, evidence }, null, 2), 'application/json');
  };

  return (
    <div className="ws-split">
      <div className="ws-split-list">
        <div className="ws-list-tools">
          <div className="ws-panel-head" style={{ marginBottom: 6 }}><span className="ws-h2">Recorded findings</span><span className="ws-mono ws-sub">{findings.length}</span></div>
          <div className="ws-sub">Conclusions recorded by an investigator after reviewing evidence. Search results never appear here on their own.</div>
          <button type="button" className="ws-btn ws-btn-primary" style={{ marginTop: 12 }} onClick={() => openRecordFinding()}>Record finding</button>
        </div>
        {findings.map(f => (
          <div key={f.id} className={`ws-list-item${selected?.id === f.id ? ' active' : ''}`} onClick={() => setSelectedId(f.id)}>
            <div style={{ display: 'flex', gap: 12 }}>
              <span className="ws-fid">{f.id}</span>
              <div style={{ minWidth: 0 }}>
                <div className="ttl">{f.title}</div>
                <div className="ws-chips" style={{ gap: 6 }}><span className="ws-conf">{f.confidence}</span><span className="ws-sid">{f.status}</span></div>
                <div className="ws-sub" style={{ marginTop: 8 }}>{f.sourceKeys.length} source{f.sourceKeys.length === 1 ? '' : 's'} · updated {fmtTime(f.updatedAt)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ws-split-detail">
        {!selected ? (
          <div className="ws-detail-pad">
            <Empty title="No findings recorded yet" action={<button type="button" className="ws-btn ws-btn-primary" onClick={() => openRecordFinding()}>Record finding</button>}>
              Review profiles, sources and activity, then record what the evidence supports. Each finding cites its supporting sources.
            </Empty>
          </div>
        ) : (() => {
          const keys = selected.sourceKeys;
          const levels = keys.map(k => levelOf(inv, k));
          const nRelevant = levels.filter(l => l !== 'raw').length;
          const nValidated = levels.filter(l => l === 'validated').length;
          const keySet = new Set(keys);
          const relatedProfiles = (inv.socialProfiles || []).filter(p => keySet.has(profileKey(p)));
          const relatedAssoc = (inv.associations || []).filter(a => a.sourceUrl && keySet.has(urlKey(a.sourceUrl)));
          const relatedActivity = (inv.activities || []).filter(a => keySet.has(urlKey(a.sourceUrl)) && !relatedProfiles.some(p => profileKey(p) === urlKey(a.sourceUrl)));
          const relatedNotes = (inv.notes || []).filter(n => (n.links || []).some(l => l === selected.id || keySet.has(l)));
          return (
            <>
              <div className="ws-finding-hero">
                <div className="ws-panel-head" style={{ marginBottom: 0 }}>
                  <div className="ws-chips" style={{ alignItems: 'center' }}>
                    <span className="ws-fid">{selected.id}</span>
                    <span className="cat">Finding · {selected.category}</span>
                  </div>
                  <div className="ws-chips">
                    <button type="button" className="ws-btn" onClick={() => openRecordFinding({ finding: selected })}>Edit</button>
                    <button type="button" className="ws-btn" onClick={() => exportFinding(selected)}>Export</button>
                  </div>
                </div>
                <h2>{selected.title}</h2>
                {selected.statement && <p>{selected.statement}</p>}
                <div className="facts">
                  <span>Confidence <b>{selected.confidence}</b></span>
                  <span>Status <b>{selected.status}</b></span>
                  <span>Created <b>{fmtDate(selected.createdAt, true)}</b></span>
                  <span>Updated <b>{fmtDate(selected.updatedAt, true)}</b></span>
                  <span>By <b>{selected.createdBy}</b></span>
                </div>
              </div>

              <div className="ws-detail-pad">
                <h3 className="ws-h3">How this finding was reached</h3>
                <div className="ws-stages">
                  <div className="ws-stage"><LevelBadge level="raw" /><div>{d.pipeline.raw ?? '—'} raw results reviewed by the searches</div></div>
                  <div className="ws-stage relevant"><LevelBadge level="relevant" /><div>{nRelevant} of {keys.length} supporting sources kept as relevant</div></div>
                  <div className="ws-stage validated"><LevelBadge level="validated" /><div>{nValidated} validated by an investigator</div></div>
                  <div className="ws-stage finding"><LevelBadge level="finding" /><div>Recorded {fmtDate(selected.createdAt, true)}</div></div>
                </div>

                <SectionHead
                  title="Supporting evidence"
                  count={keys.length}
                  right={<button type="button" className="ws-link" onClick={() => openRecordFinding({ finding: selected })}>+ Attach source</button>}
                />
                {keys.length === 0 && <p className="ws-sub" style={{ padding: '12px 0' }}>No source is attached. A finding should cite at least one source.</p>}
                {keys.map(k => {
                  const s = d.sourceByKey.get(k);
                  const w = d.webByKey.get(k);
                  const p = (inv.socialProfiles || []).find(x => profileKey(x) === k);
                  const excerpt = w?.description || p?.snippet;
                  return (
                    <div key={k} className="ws-row">
                      <span className="ws-sid">{s?.sid || 'removed'}</span>
                      <div className="ws-row-main">
                        <div className="ws-row-title">{s?.source.title || 'Source no longer in this investigation'}</div>
                        {excerpt && <div className="ws-row-sub" style={{ color: 'var(--ws-text-2)' }}>“{excerpt}”</div>}
                        {s && <button type="button" className="ws-url" onClick={() => openUrl(s.source.url)}>{shortUrl(s.source.url)}</button>}
                      </div>
                      <LevelBadge level={levelOf(inv, k)} />
                    </div>
                  );
                })}

                <div className="ws-two" style={{ marginTop: 30 }}>
                  <div>
                    <h3 className="ws-h3" style={{ marginBottom: 10 }}>Related items</h3>
                    {relatedProfiles.length + relatedAssoc.length + relatedActivity.length === 0 && <div className="ws-sub">No profile, association or activity uses these sources.</div>}
                    {relatedProfiles.map(p => <div key={profileKey(p)}><button type="button" className="ws-link" onClick={() => goTab('profiles', profileKey(p))}>Profile · {p.platform} · {p.username || p.profileName}</button></div>)}
                    {relatedAssoc.map(a => <div key={a.id}><button type="button" className="ws-link" onClick={() => goTab('associations', assocKey(a))}>Association · {a.name}</button></div>)}
                    {relatedActivity.slice(0, 5).map(a => <div key={a.id}><button type="button" className="ws-link" onClick={() => goTab('activity')}>Activity · {a.title}</button></div>)}
                  </div>
                  <div>
                    <h3 className="ws-h3" style={{ marginBottom: 10 }}>Notes on this finding</h3>
                    {relatedNotes.length === 0 && <div className="ws-sub">No note links to this finding or its sources.</div>}
                    {relatedNotes.map(n => <div key={n.id}><button type="button" className="ws-link" onClick={() => goTab('notes')}>{d.noteIds.get(n.id)} · {noteTitle(n)}</button></div>)}
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};
