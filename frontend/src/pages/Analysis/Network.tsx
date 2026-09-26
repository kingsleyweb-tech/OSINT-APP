import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Share2, GitCompare, ExternalLink } from 'lucide-react';
import { ExplorePage, Field, Segmented, EmptyState, CasePicker } from '../../components/explore/ExploreKit';
import { useCases } from '../../components/explore/exploreHooks';
import { caseConnections, compareCases, crossReferences, type Connection } from '../../lib/caseAnalysis';
import { shortUrl } from '../../lib/workspace';
import type { Investigation } from '../../types/investigation';

type View = 'graph' | 'table' | 'compare';

const TYPE_COLOR: Record<string, string> = { Organisation: 'var(--accent-warm)', Username: '#0ea5e9', Website: '#10b981', Link: '#a855f7' };

/** Radial graph: the case subject in the centre, its saved connections around it. */
const Graph: React.FC<{ inv: Investigation; nodes: Connection[]; crossKeys: Set<string>; selected: string | null; onSelect: (k: string) => void }> = ({ inv, nodes, crossKeys, selected, onSelect }) => {
  const W = 820, H = 520, cx = W / 2, cy = H / 2;
  const shown = nodes.slice(0, 36);
  const ring = (i: number) => (shown.length > 18 && i % 2 ? 220 : 165);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`Connections saved in ${inv.name}`}>
      {shown.map((n, i) => {
        const a = (i / shown.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * ring(i) * 1.45, y = cy + Math.sin(a) * ring(i);
        const on = selected === n.key;
        return (
          <g key={n.key} onClick={() => onSelect(n.key)} style={{ cursor: 'pointer' }}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={TYPE_COLOR[n.type]} strokeOpacity={on ? 0.9 : 0.35} strokeWidth={on ? 2 : 1.2}
              strokeDasharray={/Possible|Mention|Low/.test(n.evidence) ? '4 4' : undefined} />
            <circle cx={x} cy={y} r={on ? 9 : 7} fill="var(--bg-card)" stroke={TYPE_COLOR[n.type]} strokeWidth={2} />
            {crossKeys.has(n.key) && <circle cx={x} cy={y} r={13} fill="none" stroke="var(--accent-warm)" strokeWidth={1.5} strokeDasharray="2 3" />}
            <text x={x} y={y + (y > cy ? 22 : -14)} textAnchor="middle" fontSize={11} fill="var(--text-secondary)" fontWeight={on ? 700 : 500}>
              {n.label.length > 22 ? `${n.label.slice(0, 21)}…` : n.label}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={34} fill="var(--accent-warm)" />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff">{inv.targetProfile?.initials || inv.name.slice(0, 2).toUpperCase()}</text>
      <text x={cx} y={cy + 56} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text-primary)">{inv.name}</text>
    </svg>
  );
};

export const NetworkPage: React.FC = () => {
  const { cases, loading } = useCases();
  const [view, setView] = useState<View>('graph');
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [types, setTypes] = useState<Set<string>>(new Set(['Organisation', 'Username', 'Website']));
  const [selected, setSelected] = useState<string | null>(null);

  const a = cases.find(c => c.id === aId) || cases[0];
  const b = cases.find(c => c.id === bId && c.id !== a?.id);
  const connections = useMemo(() => (a ? caseConnections(a) : []), [a]);
  const filtered = connections.filter(c => types.has(c.type));
  const cross = useMemo(() => (a ? crossReferences(a, cases) : []), [a, cases]);
  const crossKeys = new Set(cross.map(c => c.connection.key));
  const comparison = useMemo(() => (a && b ? compareCases(a, b) : null), [a, b]);
  const sel = connections.find(c => c.key === selected);

  if (!loading && cases.length === 0) {
    return (
      <ExplorePage title="Network" subtitle="See how the people, usernames, organisations and websites saved in your cases connect.">
        <EmptyState icon={<Share2 size={24} />} title="No cases yet">Create a case with the <Link to="/new-investigation" style={{ color: 'var(--accent-warm)' }}>Profiler</Link> first. The network is built only from what your cases contain.</EmptyState>
      </ExplorePage>
    );
  }

  return (
    <ExplorePage title="Network" subtitle="See how the organisations, usernames and websites saved in your cases connect, and compare two cases. Built only from data already in your cases — no searches are used.">
      <section className="ex-card ex-card-pad ex-form">
        <Field label="Case" htmlFor="nw-a" grow>
          <CasePicker id="nw-a" cases={cases} value={a?.id || ''} onChange={id => { setAId(id); setSelected(null); }} />
        </Field>
        <Field label="Show" htmlFor="nw-types">
          <div id="nw-types" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Organisation', 'Username', 'Website'].map(t => (
              <button type="button" key={t} className={`ex-chip ${types.has(t) ? 'on' : ''}`} aria-pressed={types.has(t)}
                onClick={() => setTypes(prev => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n; })}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLOR[t] }} /> {t}s
              </button>
            ))}
          </div>
        </Field>
        <Segmented<View> label="View" value={view} onChange={setView} options={[
          { value: 'graph', label: 'Graph' }, { value: 'table', label: 'Table' }, { value: 'compare', label: 'Compare two cases' }
        ]} />
      </section>

      {a && view === 'graph' && (
        <div className="ex-split">
          <section className="ex-card">
            <div className="ex-card-head">
              <h2 className="ex-card-title">{filtered.length} connection{filtered.length === 1 ? '' : 's'} in {a.name}</h2>
              <span className="ex-muted ex-small">Dashed line = possible or mention only · dotted ring = also in another case</span>
            </div>
            {filtered.length === 0
              ? <div className="ex-pad ex-muted">This case has no saved organisations, usernames or websites of the selected types.</div>
              : <div className="ex-pad"><Graph inv={a} nodes={filtered} crossKeys={crossKeys} selected={selected} onSelect={setSelected} /></div>}
            {filtered.length > 36 && <div className="ex-pad ex-muted ex-small">Showing 36 of {filtered.length}. Use the Table view for all.</div>}
          </section>
          <div className="ex-side">
            <section className="ex-card">
              <div className="ex-card-head"><h2 className="ex-card-title">Selected</h2></div>
              {!sel ? <div className="ex-pad ex-muted ex-small">Select a node in the graph.</div> : (
                <div className="ex-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <strong>{sel.label}</strong>
                  <span className="ex-small ex-muted">{sel.type}{sel.detail ? ` · ${sel.detail}` : ''}</span>
                  <span className="ex-pill ex-pill-mid" style={{ alignSelf: 'flex-start' }}>{sel.evidence}</span>
                  {sel.urls.slice(0, 5).map(u => (
                    <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="ex-small" style={{ color: 'var(--accent-warm)', overflowWrap: 'anywhere' }}>{shortUrl(u)} <ExternalLink size={11} /></a>
                  ))}
                </div>
              )}
            </section>
            <section className="ex-card">
              <div className="ex-card-head"><h2 className="ex-card-title">Also in your other cases</h2></div>
              {cross.length === 0 ? <div className="ex-pad ex-muted ex-small">No connection in this case appears in another case.</div> : cross.map(x => (
                <div key={x.connection.key} className="ex-kv" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span><b>{x.connection.label}</b> <span className="ex-muted ex-small">{x.connection.type}</span></span>
                  <span className="ex-small">{x.otherCases.map((o, i) => <React.Fragment key={o.id}>{i > 0 && ', '}<Link to={`/investigations/${o.id}`} style={{ color: 'var(--accent-warm)' }}>{o.name}</Link></React.Fragment>)}</span>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}

      {a && view === 'table' && (
        <section className="ex-card ex-table-wrap">
          <table className="ex-table">
            <thead><tr><th>Connection</th><th>Type</th><th>Details</th><th>Evidence in case</th><th>Sources</th><th>Other cases</th></tr></thead>
            <tbody>
              {filtered.map(c => {
                const x = cross.find(r => r.connection.key === c.key);
                return (
                  <tr key={c.key}>
                    <td style={{ fontWeight: 600 }}>{c.label}</td>
                    <td className="ex-muted">{c.type}</td>
                    <td className="ex-muted">{c.detail || '—'}</td>
                    <td><span className="ex-pill ex-pill-low">{c.evidence}</span></td>
                    <td>{c.urls[0] ? <a href={c.urls[0]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-warm)' }}>{c.urls.length} link{c.urls.length === 1 ? '' : 's'}</a> : '—'}</td>
                    <td>{x ? x.otherCases.map(o => o.name).join(', ') : '—'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="ex-muted">No connections of the selected types.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {a && view === 'compare' && (
        <>
          <section className="ex-card ex-card-pad ex-form">
            <Field label="Compare with" htmlFor="nw-b" grow>
              <CasePicker id="nw-b" cases={cases.filter(c => c.id !== a.id)} value={b?.id || ''} onChange={setBId} />
            </Field>
          </section>
          {!comparison || !b ? (
            <EmptyState icon={<GitCompare size={24} />} title="Choose a second case">Shows the organisations, usernames, websites and exact pages that both cases contain.</EmptyState>
          ) : (
            <>
              <section className="ex-card">
                <div className="ex-venn">
                  <div className="ex-venn-c ex-venn-a"><b>{comparison.onlyA.length}</b>only in<br />{a.name}</div>
                  <div className="ex-venn-mid"><b>{comparison.shared.length}</b>shared</div>
                  <div className="ex-venn-c ex-venn-b"><b>{comparison.onlyB.length}</b>only in<br />{b.name}</div>
                </div>
                <div className="ex-pad ex-muted ex-small" style={{ paddingTop: 0, textAlign: 'center' }}>
                  A shared username or organisation shows both cases mention it. It does not prove the two subjects are connected — verify from the sources.
                </div>
              </section>
              <section className="ex-card ex-table-wrap">
                <div className="ex-card-head"><h2 className="ex-card-title">Shared connections</h2></div>
                <table className="ex-table">
                  <thead><tr><th>Connection</th><th>Type</th><th>In {a.name}</th><th>In {b.name}</th></tr></thead>
                  <tbody>
                    {comparison.shared.map(s => (
                      <tr key={s.a.key}><td style={{ fontWeight: 600 }}>{s.a.label}</td><td className="ex-muted">{s.a.type}</td><td>{s.a.evidence}</td><td>{s.b.evidence}</td></tr>
                    ))}
                    {comparison.shared.length === 0 && <tr><td colSpan={4} className="ex-muted">The two cases have no organisations, usernames or websites in common.</td></tr>}
                  </tbody>
                </table>
              </section>
              {comparison.sharedLinks.length > 0 && (
                <section className="ex-card">
                  <div className="ex-card-head"><h2 className="ex-card-title">The same page saved in both cases</h2></div>
                  {comparison.sharedLinks.map(u => (
                    <div key={u} className="ex-kv"><a href={u} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-warm)', overflowWrap: 'anywhere' }}>{shortUrl(u)}</a></div>
                  ))}
                </section>
              )}
            </>
          )}
        </>
      )}
    </ExplorePage>
  );
};
