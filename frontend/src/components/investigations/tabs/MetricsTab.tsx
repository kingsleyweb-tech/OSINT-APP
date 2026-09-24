import React from 'react';
import { fmtDate, fmtTime } from '../../../lib/workspace';
import { useWorkspace, type TabKey } from '../workspace/WorkspaceContext';
import { SectionHead } from '../workspace/ui';

const pct = (a: number, b: number | null) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export const MetricsTab: React.FC = () => {
  const { inv, d, goTab } = useWorkspace();
  const p = d.pipeline;
  const log = inv.searchLog || [];
  const lastBatch = log.reduce((m, s) => Math.max(m, s.batch), 0);
  const latest = log.filter(s => s.batch === lastBatch);
  const batches = new Set(log.map(s => s.batch)).size;

  const categories = latest.length > 0
    ? latest.map(s => ({ name: s.purpose, returned: s.returned, kept: s.kept }))
    : (inv.searchCoverage || []).map(c => ({ name: c.provider, returned: null as number | null, kept: c.count as number | null }));
  const maxReturned = Math.max(1, ...categories.map(c => Math.max(c.returned || 0, c.kept || 0)));

  const sections: Array<{ key: TabKey; label: string }> = [
    { key: 'activity', label: 'Activity' },
    { key: 'profiles', label: 'Profiles' },
    { key: 'sources', label: 'Sources' },
    { key: 'associations', label: 'Associations' },
    { key: 'web', label: 'Web' },
    { key: 'news', label: 'News' }
  ];
  const maxSection = Math.max(1, ...sections.map(s => d.counts[s.key] || 0));

  return (
    <>
      <div className="ws-stats">
        <div className="ws-stat"><b>{p.raw ?? '—'}</b><span>Raw results (last run)</span></div>
        <div className="ws-stat"><b>{p.relevant}</b><span>Kept as relevant</span></div>
        <div className="ws-stat"><b>{p.validated}</b><span>Validated</span></div>
        <div className="ws-stat"><b>{p.findings}</b><span>Findings recorded</span></div>
        <div className="ws-stat"><b>{d.sources.length}</b><span>Sources collected</span></div>
        <div className="ws-stat"><b>{batches || '—'}</b><span>Searches run · {log.length} queries</span></div>
        <div className="ws-stat"><b>{fmtTime(inv.lastSearched || inv.createdAt) || '—'}</b><span>Last search · {fmtDate(inv.lastSearched || inv.createdAt)}</span></div>
      </div>

      <div className="ws-two">
        <div className="ws-section">
          <SectionHead
            title={latest.length ? 'Results by search (last run)' : 'Kept results by search'}
            right={latest.length > 0 && <span className="ws-legend"><span><i style={{ background: 'var(--ws-accent)' }} />Kept</span><span><i style={{ background: 'var(--ws-sunken)' }} />Not kept</span></span>}
          />
          {categories.length === 0 && <p className="ws-sub" style={{ paddingTop: 12 }}>No per-search record was stored for this investigation. Re-run searches to record one.</p>}
          {categories.map(c => {
            const kept = Math.min(c.kept || 0, c.returned ?? c.kept ?? 0);
            const rest = c.returned !== null ? Math.max(0, c.returned - kept) : 0;
            return (
              <div key={c.name} className="ws-hbar">
                <span>{c.name}</span>
                <div className="track" style={{ width: `${Math.max(2, ((kept + rest) / maxReturned) * 100)}%` }}>
                  <div className="kept" style={{ flex: kept }} />
                  <div className="rest" style={{ flex: rest || (kept ? 0 : 1) }} />
                </div>
                <span className="num">{c.kept ?? '—'} / {c.returned ?? '—'}</span>
              </div>
            );
          })}
          {latest.some(s => s.kept === null) && <p className="ws-sub" style={{ marginTop: 8 }}>"—" means the search did not report how many of its results were kept.</p>}
        </div>

        <div>
          <div className="ws-section">
            <SectionHead title="Kept results by section" right={<span className="ws-sub">Tab counts</span>} />
            {sections.map(s => (
              <div key={s.key} className="ws-hbar" style={{ cursor: 'pointer' }} onClick={() => goTab(s.key)}>
                <span>{s.label}</span>
                <div className="track" style={{ width: `${Math.max(2, ((d.counts[s.key] || 0) / maxSection) * 100)}%` }}><div className="kept" style={{ flex: 1 }} /></div>
                <span className="num">{d.counts[s.key] || 0}</span>
              </div>
            ))}
          </div>
          <div className="ws-section">
            <SectionHead title="Evidence conversion" />
            <div className="ws-conv">
              <div><b>{pct(p.relevant, p.raw)}</b><span>of raw results kept as relevant</span></div>
              <div><b>{pct(p.validated, p.relevant)}</b><span>of relevant items validated</span></div>
              <div><b>{(inv.notes || []).length}</b><span>notes written</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="ws-section">
        <SectionHead title="Search log" right={<button type="button" className="ws-link" onClick={() => goTab('audit')}>Full audit →</button>} noRule />
        {log.length === 0 ? <p className="ws-sub">No search log was stored for this investigation (it was created before search logging). Re-run searches to record one.</p> : (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead><tr><th>Run</th><th>Time</th><th>Search</th><th style={{ textAlign: 'right' }}>Returned</th><th style={{ textAlign: 'right' }}>Kept</th><th>Status</th></tr></thead>
              <tbody>
                {log.map(s => (
                  <tr key={s.run}>
                    <td className="ws-mono ws-cell-muted">{String(s.run).padStart(2, '0')}</td>
                    <td className="ws-mono">{fmtTime(s.at)}</td>
                    <td>{s.purpose}{s.batch > 1 && <span className="ws-muted"> (re-run {s.batch - 1})</span>}<div className="ws-cell-sub">{s.query}</div></td>
                    <td style={{ textAlign: 'right' }}>{s.returned}</td>
                    <td style={{ textAlign: 'right' }}>{s.kept ?? '—'}</td>
                    <td className={s.status === 'Failed' ? 'ws-status-bad' : 'ws-status-ok'} title={s.error}>{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};
