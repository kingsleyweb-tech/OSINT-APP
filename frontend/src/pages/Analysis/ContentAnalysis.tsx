import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Download } from 'lucide-react';
import { ExplorePage, Field, EmptyState } from '../../components/explore/ExploreKit';
import { useCases, topTerms } from '../../components/explore/exploreHooks';
import { contentItems, countBy, perMonth } from '../../lib/caseAnalysis';
import { downloadFile, toCsv, hostOf, safeFileName } from '../../lib/workspace';

const Bars: React.FC<{ rows: Array<{ key: string; count: number }>; limit?: number }> = ({ rows, limit = 8 }) => {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <div className="ex-bars">
      {rows.slice(0, limit).map(r => (
        <div key={r.key} className="ex-bar">
          <span title={r.key}>{r.key}</span>
          <div className="ex-bar-track"><div className="ex-bar-fill" style={{ width: `${(r.count / max) * 100}%` }} /></div>
          <span>{r.count}</span>
        </div>
      ))}
      {rows.length === 0 && <span className="ex-muted ex-small">No data.</span>}
    </div>
  );
};

export const ContentAnalysisPage: React.FC = () => {
  const { cases, loading } = useCases();
  const [scope, setScope] = useState('all');
  const selected = scope === 'all' ? cases : cases.filter(c => c.id === scope);
  const items = useMemo(() => contentItems(selected), [selected]);
  const months = useMemo(() => perMonth(items), [items]);
  const byPlatform = useMemo(() => countBy(items, i => i.platform), [items]);
  const byType = useMemo(() => countBy(items, i => i.type), [items]);
  const byDomain = useMemo(() => countBy(items, i => hostOf(i.url)), [items]);
  const names = selected.map(c => c.name);
  const terms = useMemo(() => topTerms(items.map(i => i.text), names, 30), [items, names]);
  const undated = items.filter(i => !i.date).length;
  const maxMonth = Math.max(1, ...months.map(m => m.count));
  const maxTerm = Math.max(1, ...terms.map(t => t.count));

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [['Title', 'Type', 'Platform', 'Date', 'URL']];
    items.forEach(i => rows.push([i.title, i.type, i.platform, i.date ? i.date.toISOString().slice(0, 10) : '', i.url]));
    downloadFile(`content-analysis-${safeFileName(scope === 'all' ? 'all-cases' : names[0] || 'case')}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };

  if (!loading && cases.length === 0) {
    return (
      <ExplorePage title="Content analysis" subtitle="Analyse the content saved in your cases.">
        <EmptyState icon={<BarChart3 size={24} />} title="No cases yet">Create a case with the <Link to="/new-investigation" style={{ color: 'var(--accent-warm)' }}>Profiler</Link> or save results from a search to see analysis here.</EmptyState>
      </ExplorePage>
    );
  }

  return (
    <ExplorePage title="Content analysis" subtitle="Break down the results saved in your cases by platform, type, date and the words they use. Calculated only from saved data — no searches are used."
      actions={<button type="button" className="ex-btn ex-btn-ghost" onClick={exportCsv} disabled={items.length === 0}><Download size={15} /> Export CSV</button>}>
      <section className="ex-card ex-card-pad ex-form">
        <Field label="Analyse" htmlFor="ca-scope" grow>
          <select id="ca-scope" className="ex-input ex-select" value={scope} onChange={e => setScope(e.target.value)}>
            <option value="all">All cases ({cases.length})</option>
            {cases.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </section>

      <div className="ex-stats">
        <div className="ex-stat"><span className="ex-stat-label">Saved results</span><span className="ex-stat-value">{items.length}</span><span className="ex-stat-note">unique links</span></div>
        <div className="ex-stat"><span className="ex-stat-label">Platforms & sites</span><span className="ex-stat-value">{byPlatform.length}</span></div>
        <div className="ex-stat"><span className="ex-stat-label">Websites</span><span className="ex-stat-value">{byDomain.length}</span><span className="ex-stat-note">distinct domains</span></div>
        <div className="ex-stat"><span className="ex-stat-label">News articles</span><span className="ex-stat-value">{byType.find(t => t.key === 'News article')?.count || 0}</span></div>
        <div className="ex-stat"><span className="ex-stat-label">Profiles</span><span className="ex-stat-value">{byType.find(t => t.key === 'Profile')?.count || 0}</span></div>
        <div className="ex-stat"><span className="ex-stat-label">Dated items</span><span className="ex-stat-value">{items.length - undated}</span><span className="ex-stat-note">{undated} have no date</span></div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nothing saved yet">These cases have no saved results to analyse.</EmptyState>
      ) : (
        <>
          <section className="ex-card">
            <div className="ex-card-head"><h2 className="ex-card-title">Results per month</h2><span className="ex-muted ex-small">By the date each result was published, where the source gave one</span></div>
            {months.length === 0 ? <div className="ex-pad ex-muted ex-small">None of these results carry a publication date.</div> : (
              <div className="ex-chart">
                <svg viewBox={`0 0 ${Math.max(300, months.length * 44)} 170`} role="img" aria-label="Results per month">
                  {months.map((m, i) => {
                    const h = (m.count / maxMonth) * 120;
                    return (
                      <g key={m.month}>
                        <rect x={i * 44 + 8} y={140 - h} width={28} height={Math.max(2, h)} rx={4} fill="var(--accent-warm)"><title>{`${m.month}: ${m.count}`}</title></rect>
                        <text className="ex-chart-axis" x={i * 44 + 22} y={134 - h} textAnchor="middle">{m.count}</text>
                        <text className="ex-chart-axis" x={i * 44 + 22} y={158} textAnchor="middle">{m.month.slice(2)}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <section className="ex-card"><div className="ex-card-head"><h2 className="ex-card-title">By platform or source</h2></div><Bars rows={byPlatform} /></section>
            <section className="ex-card"><div className="ex-card-head"><h2 className="ex-card-title">By type</h2></div><Bars rows={byType} /></section>
            <section className="ex-card"><div className="ex-card-head"><h2 className="ex-card-title">Most frequent websites</h2></div><Bars rows={byDomain} /></section>
          </div>

          <section className="ex-card">
            <div className="ex-card-head"><h2 className="ex-card-title">Word cloud</h2><span className="ex-muted ex-small">Words used in 2 or more saved results (case names excluded). Size = number of results.</span></div>
            {terms.length === 0 ? <div className="ex-pad ex-muted ex-small">Not enough repeated words yet.</div> : (
              <div className="ex-cloud">
                {terms.map(t => (
                  <span key={t.term} title={`${t.count} results`} style={{ fontSize: `${0.8 + (t.count / maxTerm) * 1.2}rem`, fontWeight: t.count / maxTerm > 0.5 ? 700 : 500, opacity: 0.55 + (t.count / maxTerm) * 0.45 }}>{t.term}</span>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </ExplorePage>
  );
};
