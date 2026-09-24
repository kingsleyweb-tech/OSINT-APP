import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { IntelligenceSource } from '../../../types/investigation';
import {
  bucketOf, downloadFile, fmtShortDate, hostOf, isOpenableUrl, levelOf, LEVEL_LABEL, newAuditEvent, openUrl,
  safeFileName, shortUrl, toCsv, urlKey, type IndexedSource
} from '../../../lib/workspace';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Empty, LevelBadge, LevelPicker, LinkStatus, Modal } from '../workspace/ui';

const PAGE_SIZE = 10;

export const SourcesTab: React.FC = () => {
  const { inv, d, focus, commit, setLevel, openRecordFinding, newNote, goTab } = useWorkspace();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [level, setLevel2] = useState('all');
  const [link, setLink] = useState('all');
  const [page, setPage] = useState(0);
  const [openKey, setOpenKey] = useState<string | null>(focus);
  const [adding, setAdding] = useState(false);

  const profileByKey = useMemo(() => new Map((inv.socialProfiles || []).map(p => [urlKey(p.profileUrl || p.url), p])), [inv.socialProfiles]);

  const typeOf = (s: IndexedSource): string => {
    if (profileByKey.has(s.key)) return 'Social profile';
    const w = d.webByKey.get(s.key);
    if (w) {
      const b = bucketOf(w);
      return b === 'social' ? 'Social post' : b === 'news' ? 'News' : b === 'page' ? 'Organization page' : 'Web page';
    }
    if (s.source.sourceType === 'Social Profile' || s.source.sourceType === 'Developer Profile') return 'Social profile';
    return s.source.usedFor?.includes('Added by investigator') ? 'Added manually' : 'Web page';
  };
  const linkOf = (s: IndexedSource) => profileByKey.get(s.key)?.linkStatus || 'unchecked';

  const typeCounts = new Map<string, number>();
  d.sources.forEach(s => typeCounts.set(typeOf(s), (typeCounts.get(typeOf(s)) || 0) + 1));

  const q = query.trim().toLowerCase();
  const filtered = d.sources.filter(s =>
    (type === 'all' || typeOf(s) === type) &&
    (level === 'all' || levelOf(inv, s.key) === level) &&
    (link === 'all' || linkOf(s) === link) &&
    (!q || `${s.sid} ${s.source.title} ${s.source.url} ${s.source.domain}`.toLowerCase().includes(q))
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (!focus) return;
    const idx = filtered.findIndex(s => s.key === focus);
    if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
  useEffect(() => { if (page >= pages) setPage(0); }, [page, pages]);

  const shown = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [['ID', 'Title', 'URL', 'Type', 'Platform', 'Published', 'Found', 'Link status', 'Level', 'Findings']];
    d.sources.forEach(s => rows.push([
      s.sid, s.source.title, s.source.url, typeOf(s), s.source.sourceName, s.source.publishedDate || '',
      s.source.discoveredDate, linkOf(s), LEVEL_LABEL[levelOf(inv, s.key)], (d.findingsByKey.get(s.key) || []).join(' ')
    ]));
    downloadFile(`Sources-${safeFileName(inv.name)}.csv`, toCsv(rows), 'text/csv');
  };

  return (
    <>
      <div className="ws-toolbar">
        <div className="ws-chips" style={{ alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 30, fontWeight: 600 }}>{d.sources.length}</span><span className="ws-sub">sources</span>
          {Array.from(typeCounts.entries()).map(([t, n]) => <span key={t} className="ws-tag"><b style={{ marginRight: 6 }}>{n}</b>{t}</span>)}
        </div>
        <div className="ws-chips">
          <button type="button" className="ws-btn" onClick={exportCsv} disabled={d.sources.length === 0}>Export list</button>
          <button type="button" className="ws-btn ws-btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add source</button>
        </div>
      </div>

      {d.sources.length === 0 ? <Empty title="No sources yet">Sources are the pages behind every kept result. Add one manually if you found it elsewhere.</Empty> : (
        <>
          <div className="ws-toolbar">
            <div className="ws-chips">
              <input className="ws-input" style={{ width: 320 }} value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder="Search title, domain or URL" />
              <select className="ws-select" value={type} onChange={e => { setType(e.target.value); setPage(0); }} aria-label="Type">
                <option value="all">Type: All</option>
                {Array.from(typeCounts.keys()).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="ws-select" value={level} onChange={e => { setLevel2(e.target.value); setPage(0); }} aria-label="Level">
                <option value="all">Level: All</option>
                <option value="validated">Validated</option><option value="relevant">Relevant</option><option value="raw">Raw result</option>
              </select>
              <select className="ws-select" value={link} onChange={e => { setLink(e.target.value); setPage(0); }} aria-label="Link status">
                <option value="all">Link status: All</option>
                <option value="reachable">Reachable</option><option value="unavailable">Unreachable</option>
                <option value="unverifiable">Unverifiable</option><option value="unchecked">Not checked</option>
              </select>
            </div>
            <span className="ws-sub">Sorted by ID · link status is checked for profiles only</span>
          </div>

          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr><th>ID</th><th>Source</th><th>Type · platform</th><th>Published</th><th>Found</th><th>Link status</th><th>Level</th><th>Used</th></tr>
              </thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={8} className="ws-cell-muted" style={{ textAlign: 'center', padding: 24 }}>No sources match these filters.</td></tr>}
                {shown.map(s => {
                  const isOpen = openKey === s.key;
                  const used = d.findingsByKey.get(s.key) || [];
                  const w = d.webByKey.get(s.key);
                  const pr = profileByKey.get(s.key);
                  const excerpt = w?.description || pr?.snippet || pr?.bio || '';
                  const assocs = (inv.associations || []).filter(a => a.sourceUrl && urlKey(a.sourceUrl) === s.key);
                  return (
                    <React.Fragment key={s.key}>
                      <tr className={`row${isOpen ? ' selected' : ''}`} onClick={() => setOpenKey(isOpen ? null : s.key)}>
                        <td className="ws-mono ws-cell-muted">{s.sid}</td>
                        <td style={{ maxWidth: 360 }}>
                          <div className="ws-cell-title">{s.source.title}</div>
                          <div className="ws-url ws-trunc" style={{ maxWidth: 340 }}>{shortUrl(s.source.url)}</div>
                        </td>
                        <td><span className="ws-tag">{typeOf(s)}</span><div className="ws-cell-muted" style={{ marginTop: 3 }}>{s.source.sourceName || hostOf(s.source.url)}</div></td>
                        <td className="ws-mono ws-cell-muted">{s.source.publishedDate || '—'}</td>
                        <td className="ws-mono ws-cell-muted">{fmtShortDate(s.source.discoveredDate)}</td>
                        <td><LinkStatus status={linkOf(s)} /></td>
                        <td><LevelBadge level={levelOf(inv, s.key)} /></td>
                        <td className="ws-cell-muted">{used.length ? `${used.length} finding${used.length === 1 ? '' : 's'}` : '—'}</td>
                      </tr>
                      {isOpen && (
                        <tr className="detail">
                          <td />
                          <td colSpan={4}>
                            <div className="ws-label" style={{ marginTop: 6 }}>Evidence captured</div>
                            {excerpt ? <div className="ws-quote" style={{ background: 'var(--ws-bg)', border: '1px solid var(--ws-border)' }}>“{excerpt}”</div> : <div className="ws-sub">No excerpt was captured for this source.</div>}
                            <div className="ws-sub">Excerpt from the search result · full URL <button type="button" className="ws-url" onClick={() => openUrl(s.source.url)}>{s.source.url}</button></div>
                          </td>
                          <td colSpan={3}>
                            <div className="ws-label" style={{ marginTop: 6 }}>Supports</div>
                            {used.length === 0 && assocs.length === 0 && <div className="ws-sub">Not cited by any finding or association.</div>}
                            {used.map(fid => {
                              const f = (inv.findings || []).find(x => x.id === fid);
                              return <div key={fid}><button type="button" className="ws-link" onClick={() => goTab('findings', fid)}>{fid} · {f?.title}</button></div>;
                            })}
                            {assocs.map(a => <div key={a.id}><button type="button" className="ws-link" onClick={() => goTab('associations', `assoc:${a.name.toLowerCase()}`)}>Association · {a.name}</button></div>)}
                            <div style={{ margin: '14px 0 10px' }}>
                              <LevelPicker value={levelOf(inv, s.key)} onChange={l => setLevel(s.key, l, s.source.title, s.sid)} />
                            </div>
                            <div className="ws-panel-actions">
                              <button type="button" className="ws-btn ws-btn-sm" onClick={() => openUrl(s.source.url)} disabled={!isOpenableUrl(s.source.url)}>Open source</button>
                              <button type="button" className="ws-btn ws-btn-sm" onClick={() => newNote([s.key])}>Add note</button>
                              <button type="button" className="ws-btn ws-btn-sm" onClick={() => openRecordFinding({ sourceKeys: [s.key] })}>Record finding</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="ws-table-foot">
              <span>Showing {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of {filtered.length}</span>
              <div className="ws-chips">
                <button type="button" className="ws-btn ws-btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button type="button" className="ws-btn ws-btn-sm" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          </div>
        </>
      )}

      {adding && (
        <AddSourceModal
          onClose={() => setAdding(false)}
          onAdd={src => {
            commit(
              i => ({ ...i, sources: [...(i.sources || []), src] }),
              [newAuditEvent({ action: 'Source added', object: shortUrl(src.url), detail: src.title, group: 'Results', kind: 'investigator' })]
            );
            setAdding(false);
          }}
          exists={url => d.sourceByKey.has(urlKey(url))}
        />
      )}
    </>
  );
};

const AddSourceModal: React.FC<{ onClose: () => void; onAdd: (s: IntelligenceSource) => void; exists: (url: string) => boolean }> = ({ onClose, onAdd, exists }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [published, setPublished] = useState('');
  const valid = isOpenableUrl(url);
  const dup = valid && exists(url);
  return (
    <Modal
      title="Add source"
      onClose={onClose}
      footer={(
        <>
          <span />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="ws-btn" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="ws-btn ws-btn-primary"
              disabled={!valid || dup || !title.trim()}
              onClick={() => onAdd({
                id: `src-manual-${Date.now()}`,
                sourceName: hostOf(url),
                title: title.trim(),
                website: hostOf(url),
                domain: hostOf(url),
                sourceType: 'Web Document',
                publishedDate: published.trim() || undefined,
                discoveredDate: new Date().toISOString(),
                url: url.trim(),
                usedFor: ['Added by investigator'],
                confidenceScore: 0
              })}
            >
              Add source
            </button>
          </div>
        </>
      )}
    >
      <p className="ws-sub" style={{ marginTop: -8, marginBottom: 16 }}>For a public page you found outside the automated searches.</p>
      <label className="ws-field"><span>Title</span><input className="ws-input" value={title} onChange={e => setTitle(e.target.value)} autoFocus /></label>
      <label className="ws-field">
        <span>URL</span>
        <input className="ws-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" />
        {url && !valid && <span style={{ color: 'var(--ws-bad)', fontSize: 13 }}>Enter a full http(s) URL.</span>}
        {dup && <span style={{ color: 'var(--ws-bad)', fontSize: 13 }}>This URL is already a source.</span>}
      </label>
      <label className="ws-field"><span>Published (optional)</span><input className="ws-input" value={published} onChange={e => setPublished(e.target.value)} placeholder="e.g. 2 Jul 2026" /></label>
    </Modal>
  );
};
