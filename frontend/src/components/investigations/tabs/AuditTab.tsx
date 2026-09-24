import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import type { AuditEvent } from '../../../types/investigation';
import { allAuditEvents, downloadFile, fmtDate, fmtTime, safeFileName, toCsv } from '../../../lib/workspace';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Chips, Empty } from '../workspace/ui';

const GROUPS = ['Searches', 'Results', 'Findings', 'Notes', 'Investigation'] as const;
const PAGE = 25;

function windowLabel(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  return `${fmtDate(iso)} · ${String(h).padStart(2, '0')}:00 – ${String((h + 1) % 24).padStart(2, '0')}:00`;
}

export const AuditTab: React.FC = () => {
  const { inv } = useWorkspace();
  const events = useMemo(() => allAuditEvents(inv), [inv]);
  const [group, setGroup] = useState('all');
  const [limit, setLimit] = useState(PAGE);

  const filtered = events.filter(e => group === 'all' || e.group === group);
  const shown = filtered.slice(0, limit);
  const actors = new Map<string, number>();
  events.forEach(e => actors.set(e.by, (actors.get(e.by) || 0) + 1));

  const windows: Array<{ label: string; items: AuditEvent[] }> = [];
  shown.forEach(e => {
    const label = windowLabel(e.at);
    const last = windows[windows.length - 1];
    if (last && last.label === label) last.items.push(e);
    else windows.push({ label, items: [e] });
  });

  const exportCsv = () => {
    const rows: Array<Array<string>> = [['Time', 'Action', 'Object', 'By', 'Detail', 'Group']];
    events.forEach(e => rows.push([e.at, e.action, e.object, e.by, e.detail, e.group]));
    downloadFile(`Audit-${safeFileName(inv.name)}.csv`, toCsv(rows), 'text/csv');
  };

  const times = events.map(e => Date.parse(e.at)).filter(t => !Number.isNaN(t));

  return (
    <div className="ws-with-rail">
      <div>
        <div className="ws-toolbar">
          <Chips
            options={[{ key: 'all', label: 'All', count: events.length }, ...GROUPS.map(g => ({ key: g, label: g, count: events.filter(e => e.group === g).length })).filter(o => o.count > 0)]}
            value={group}
            onChange={g => { setGroup(g); setLimit(PAGE); }}
          />
          <button type="button" className="ws-btn" onClick={exportCsv}><Download size={16} /> Export CSV</button>
        </div>
        {filtered.length === 0 ? <Empty title="No events" /> : (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead><tr><th>Time</th><th>Action</th><th>Object</th><th>By</th><th>Detail</th></tr></thead>
              <tbody>
                {windows.map(w => (
                  <React.Fragment key={w.label}>
                    <tr className="group"><td colSpan={5}>{w.label}</td></tr>
                    {w.items.map(e => (
                      <tr key={e.id}>
                        <td className="ws-mono">{fmtTime(e.at)}</td>
                        <td><span className="ws-key" style={{ padding: 0 }}><i className={`ws-key-${e.kind}`} /><b>{e.action}</b></span></td>
                        <td className="ws-mono ws-cell-muted">{e.object}</td>
                        <td>{e.by}</td>
                        <td className="ws-cell-muted" style={{ maxWidth: 360 }}>{e.detail}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            <div className="ws-table-foot">
              <span>Showing {shown.length} of {filtered.length} events</span>
              {shown.length < filtered.length && <button type="button" className="ws-btn ws-btn-sm" onClick={() => setLimit(l => l + PAGE)}>Load earlier</button>}
            </div>
          </div>
        )}
      </div>
      <aside className="ws-rail">
        <div className="ws-facet">
          <div className="ws-label">Actors</div>
          {Array.from(actors.entries()).map(([a, n]) => <div key={a} className="ws-actor"><span>{a}</span><span className="ws-mono">{n}</span></div>)}
        </div>
        <div className="ws-facet">
          <div className="ws-label">Key</div>
          <div className="ws-key"><i className="ws-key-system" />Automated search event</div>
          <div className="ws-key"><i className="ws-key-investigator" />Investigator change</div>
          <div className="ws-key"><i className="ws-key-finding" />Finding change</div>
          <div className="ws-key"><i className="ws-key-removal" />Removal or downgrade</div>
        </div>
        {times.length > 0 && (
          <div className="ws-facet" style={{ borderTop: '1px solid var(--ws-border)', paddingTop: 20 }}>
            <div className="ws-label">Range</div>
            <div>{fmtDate(new Date(Math.min(...times)).toISOString(), true)}</div>
            <div>– {fmtDate(new Date(Math.max(...times)).toISOString(), true)}</div>
          </div>
        )}
        <p className="ws-sub">Search events come from the stored search log. Investigator events are recorded from the moment this workspace was introduced; earlier edits were not logged.</p>
      </aside>
    </div>
  );
};
