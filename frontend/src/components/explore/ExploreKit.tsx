import React, { useMemo, useState } from 'react';
import { ExternalLink, Loader2, Save, CheckSquare, Square, AlertTriangle, Info } from 'lucide-react';
import { PlatformIcon } from '../ui/PlatformIcon';
import type { Investigation } from '../../types/investigation';
import { KIND_LABEL, type ExploreItem, type ExploreResponse } from '../../lib/exploreClient';
import { useQuota, useSaveToCase } from './exploreHooks';
import { fmtDate } from '../../lib/workspace';
import '../../styles/Explore.css';

// ─── Page frame ──────────────────────────────────────────────────────────────

export const ExplorePage: React.FC<{ title: string; subtitle: string; actions?: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, actions, children }) => (
  <div className="ex-page">
    <div className="ex-head">
      <div>
        <h1 className="ex-title">{title}</h1>
        <p className="ex-sub">{subtitle}</p>
      </div>
      {actions && <div className="ex-head-actions">{actions}</div>}
    </div>
    {children}
  </div>
);

export const Field: React.FC<{ label: string; htmlFor?: string; grow?: boolean; children: React.ReactNode }> = ({ label, htmlFor, grow, children }) => (
  <div className={`ex-field ${grow ? 'ex-grow' : ''}`}>
    <label className="ex-label" htmlFor={htmlFor}>{label}</label>
    {children}
  </div>
);

export const Segmented = <T extends string>({ value, options, onChange, label }: {
  value: T; options: Array<{ value: T; label: string; disabled?: boolean }>; onChange: (v: T) => void; label: string;
}) => (
  <div className="ex-seg" role="group" aria-label={label}>
    {options.map(o => (
      <button key={o.value} type="button" className={`ex-seg-btn ${value === o.value ? 'on' : ''}`} aria-pressed={value === o.value} disabled={o.disabled} onClick={() => onChange(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
);

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; children?: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="ex-empty">
    {icon && <div className="ex-empty-icon">{icon}</div>}
    <div className="ex-empty-title">{title}</div>
    {children && <div className="ex-empty-text">{children}</div>}
  </div>
);

// ─── Cases ───────────────────────────────────────────────────────────────────

export const CasePicker: React.FC<{ cases: Investigation[]; value: string; onChange: (id: string) => void; id?: string; allowNew?: boolean }> = ({ cases, value, onChange, id, allowNew }) => (
  <select id={id} className="ex-input ex-select" value={value} onChange={e => onChange(e.target.value)} aria-label={allowNew ? 'Case to save to' : 'Case'}>
    {allowNew
      ? <option value="">+ New case from this search</option>
      : <option value="">{cases.length ? 'Choose a case…' : 'No cases yet'}</option>}
    {cases.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
  </select>
);

// ─── Quota & engine status ───────────────────────────────────────────────────

const STATUS_TEXT: Record<string, string> = { ok: 'Returned results', cached: 'From cache (no search used)', empty: 'No results', error: 'Failed', quota: 'Quota exhausted' };

export const EngineStatus: React.FC<{ response: ExploreResponse | null }> = ({ response }) => {
  const quota = useQuota(response);
  if (!response) {
    return quota?.searchesLeft != null
      ? <div className="ex-status"><span className="ex-status-quota">{quota.searchesLeft} of {quota.searchesPerMonth} SerpApi searches left this month</span></div>
      : null;
  }
  const s = response.stats;
  return (
    <div className="ex-status">
      <div className="ex-status-engines">
        {response.engines.map((e, i) => (
          <span key={`${e.engine}-${i}`} className={`ex-engine ex-engine-${e.status}`} title={`${STATUS_TEXT[e.status]}${e.error ? `: ${e.error}` : ''}`}>
            <span className="ex-dot" /> {e.label} <b>{e.returned}</b>
          </span>
        ))}
      </div>
      <div className="ex-status-stats">
        {s.kept} shown · {s.returned} returned
        {s.duplicates > 0 && <> · {s.duplicates} duplicates merged</>}
        {s.filteredOut > 0 && <> · {s.filteredOut} hidden as unrelated</>}
        {' '}· {s.searchesUsed} search{s.searchesUsed === 1 ? '' : 'es'} used
        {quota?.searchesLeft != null && <> · {quota.searchesLeft} left this month</>}
      </div>
      {response.notices.filter(n => !/hidden because/.test(n)).map(n => (
        <div key={n} className="ex-notice"><AlertTriangle size={14} /> {n}</div>
      ))}
    </div>
  );
};

// ─── Results ─────────────────────────────────────────────────────────────────

export const RelevancePill: React.FC<{ item: ExploreItem }> = ({ item }) => {
  const l = item.relevance.label;
  if (l === 'Not scored') return null;
  const cls = l === 'Strong match' ? 'ok' : l === 'Partial match' ? 'mid' : l === 'Visual match' ? 'info' : 'low';
  return <span className={`ex-pill ex-pill-${cls}`} title={item.relevance.reasons.join(' · ')}>{l}</span>;
};

function dateText(item: ExploreItem): string {
  if (item.publishedAt) return fmtDate(item.publishedAt);
  return item.publishedText || '';
}

export type Feedback = 'relevant' | 'possible' | 'not';
const FEEDBACK_LABEL: Record<Feedback, string> = { relevant: 'Relevant', possible: 'Possible match', not: 'Not relevant' };

export const ResultRow: React.FC<{
  item: ExploreItem; selected?: boolean; onToggle?: () => void; onSave?: () => void; saving?: boolean; extra?: React.ReactNode;
  feedback?: Feedback; onFeedback?: (f: Feedback | undefined) => void;
}> = ({ item, selected, onToggle, onSave, saving, extra, feedback, onFeedback }) => {
  const thumb = item.thumbnail || (item.kind === 'image' ? item.image : undefined);
  const [thumbOk, setThumbOk] = useState(true);
  return (
    <article className={`ex-row ${selected ? 'selected' : ''}`}>
      {onToggle && (
        <button type="button" className="ex-check" onClick={onToggle} aria-pressed={selected} aria-label={selected ? 'Deselect result' : 'Select result'}>
          {selected ? <CheckSquare size={17} /> : <Square size={17} />}
        </button>
      )}
      {thumb && thumbOk
        ? <img className="ex-thumb" src={thumb} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setThumbOk(false)} />
        : <span className="ex-icon"><PlatformIcon platform={item.platform || item.domain} domain={item.domain} size={20} /></span>}
      <div className="ex-row-body">
        <a className="ex-row-title" href={item.url} target="_blank" rel="noopener noreferrer">{item.title} <ExternalLink size={12} /></a>
        <div className="ex-row-meta">
          <span className="ex-kind">{KIND_LABEL[item.kind]}</span>
          <span>{item.platform || item.domain}</span>
          {item.author && item.author !== item.platform && <span>{item.author}</span>}
          {item.username && <span className="ex-mono">@{item.username}</span>}
          {dateText(item) && <span>{dateText(item)}</span>}
          {item.rating != null && <span>★ {item.rating}{item.reviewsCount != null ? ` (${item.reviewsCount})` : ''}</span>}
          {item.location?.address && <span>{item.location.address}</span>}
        </div>
        {item.snippet && <p className="ex-row-snippet">{item.snippet}</p>}
        {extra}
        <div className="ex-row-foot">
          <RelevancePill item={item} />
          {onFeedback && (
            <span className="ex-feedback" role="group" aria-label="Your assessment">
              {(Object.keys(FEEDBACK_LABEL) as Feedback[]).map(f => (
                <button key={f} type="button" className={`ex-fb ex-fb-${f}${feedback === f ? ' on' : ''}`} aria-pressed={feedback === f}
                  onClick={() => onFeedback(feedback === f ? undefined : f)}>{FEEDBACK_LABEL[f]}</button>
              ))}
            </span>
          )}
          <span className="ex-muted ex-small" title="Engines that returned this result">via {item.engines.join(', ')}</span>
          {item.metadata?.linkIsSearch && <span className="ex-muted ex-small">Link opens a Google search for this event</span>}
        </div>
      </div>
      {onSave && (
        <button type="button" className="ex-btn ex-btn-ghost ex-row-save" onClick={onSave} disabled={saving}>
          <Save size={14} /> Save
        </button>
      )}
    </article>
  );
};

export interface ResultListProps {
  items: ExploreItem[];
  savedFrom: string;
  query?: string;
  /** Show kind filter chips. */
  kindFilter?: boolean;
  emptyText?: string;
  renderExtra?: (item: ExploreItem) => React.ReactNode;
  grid?: boolean;
}

/** The account a result belongs to (platform + handle or author), for grouping. Not an identity claim. */
function accountKey(i: ExploreItem): string | null {
  const who = i.username ? `@${i.username.toLowerCase()}` : i.author ? i.author.toLowerCase().trim() : '';
  return who ? `${(i.platform || i.domain).toLowerCase()}|${who}` : null;
}

/** Filterable, selectable result list with "save to case". */
export const ResultList: React.FC<ResultListProps> = ({ items, savedFrom, query, kindFilter = true, emptyText, renderExtra, grid }) => {
  const { cases, caseId, setCaseId, save, saving } = useSaveToCase(savedFrom);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<string>('all');
  const [platform, setPlatform] = useState<string>('all');
  const [text, setText] = useState('');
  const [sort, setSort] = useState<'relevance' | 'newest'>('relevance');
  // Investigator feedback: orders this list (relevant first) and hides "not relevant"; saved with the result.
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [showRejected, setShowRejected] = useState(false);
  const [grouped, setGrouped] = useState(false);
  const withFeedback = (list: ExploreItem[]) => list.map(i => (feedback[i.id] ? { ...i, metadata: { ...(i.metadata || {}), feedback: feedback[i.id] } } : i));

  const kinds = useMemo(() => Array.from(new Set(items.map(i => i.kind))), [items]);
  const platforms = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach(i => { const p = i.platform || i.domain; m.set(p, (m.get(p) || 0) + 1); });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [items]);

  const shown = useMemo(() => {
    const t = text.trim().toLowerCase();
    const list = items.filter(i =>
      (kind === 'all' || i.kind === kind) &&
      (platform === 'all' || (i.platform || i.domain) === platform) &&
      (!t || `${i.title} ${i.snippet || ''} ${i.author || ''} ${i.domain}`.toLowerCase().includes(t)));
    const rank: Record<string, number> = { relevant: 0, possible: 1 };
    let out = list.filter(i => showRejected || feedback[i.id] !== 'not');
    if (sort === 'newest') out = [...out].sort((a, b) => (Date.parse(b.publishedAt || '') || 0) - (Date.parse(a.publishedAt || '') || 0));
    out = [...out].sort((a, b) => (rank[feedback[a.id]] ?? 2) - (rank[feedback[b.id]] ?? 2));
    if (grouped) {
      // Results from the same account together, in order of first appearance.
      const firstAt = new Map<string, number>();
      out.forEach((i, idx) => { const k = accountKey(i) || i.id; if (!firstAt.has(k)) firstAt.set(k, idx); });
      out = [...out].sort((a, b) => (firstAt.get(accountKey(a) || a.id)! - firstAt.get(accountKey(b) || b.id)!));
    }
    return out;
  }, [items, kind, platform, text, sort, feedback, showRejected, grouped]);
  const rejectedCount = items.filter(i => feedback[i.id] === 'not').length;
  const groupSizes = useMemo(() => {
    const m = new Map<string, number>();
    shown.forEach(i => { const k = accountKey(i); if (k) m.set(k, (m.get(k) || 0) + 1); });
    return m;
  }, [shown]);

  const toggle = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const allSelected = shown.length > 0 && shown.every(i => selected.has(i.id));

  if (items.length === 0) return <EmptyState icon={<Info size={22} />} title="No results">{emptyText || 'Nothing matched this search.'}</EmptyState>;

  return (
    <section className="ex-card">
      <div className="ex-toolbar">
        <button type="button" className="ex-btn ex-btn-ghost" onClick={() => setSelected(allSelected ? new Set() : new Set(shown.map(i => i.id)))}>
          {allSelected ? <CheckSquare size={15} /> : <Square size={15} />} {allSelected ? 'Clear' : 'Select all'}
        </button>
        <input className="ex-input ex-filter" placeholder="Filter these results" value={text} onChange={e => setText(e.target.value)} aria-label="Filter results" />
        <select className="ex-input ex-select" value={sort} onChange={e => setSort(e.target.value as 'relevance' | 'newest')} aria-label="Sort results">
          <option value="relevance">Most relevant</option>
          <option value="newest">Newest first</option>
        </select>
        <div className="ex-toolbar-save">
          <CasePicker cases={cases} value={caseId} onChange={setCaseId} allowNew />
          <button type="button" className="ex-btn ex-btn-primary" disabled={saving || selected.size === 0}
            onClick={async () => { if (await save(withFeedback(items.filter(i => selected.has(i.id))), query)) setSelected(new Set()); }}>
            {saving ? <Loader2 size={15} className="ex-spin" /> : <Save size={15} />} Save {selected.size || ''} {caseId ? 'to case' : 'to new case'}
          </button>
        </div>
      </div>
      <div className="ex-chips" style={{ borderBottom: 0, paddingBottom: 0 }}>
        <button type="button" className={`ex-chip ${grouped ? 'on' : ''}`} aria-pressed={grouped} onClick={() => setGrouped(g => !g)}>Group by account</button>
        {rejectedCount > 0 && (
          <button type="button" className={`ex-chip ${showRejected ? 'on' : ''}`} onClick={() => setShowRejected(s => !s)}>
            {showRejected ? 'Hide' : 'Show'} {rejectedCount} marked not relevant
          </button>
        )}
      </div>
      {(kindFilter && kinds.length > 1) || platforms.length > 1 ? (
        <div className="ex-chips">
          {kindFilter && kinds.length > 1 && (
            <>
              <button type="button" className={`ex-chip ${kind === 'all' ? 'on' : ''}`} onClick={() => setKind('all')}>All types</button>
              {kinds.map(k => (
                <button type="button" key={k} className={`ex-chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
                  {KIND_LABEL[k]} {items.filter(i => i.kind === k).length}
                </button>
              ))}
              <span className="ex-chip-sep" />
            </>
          )}
          {platforms.length > 1 && (
            <>
              <button type="button" className={`ex-chip ${platform === 'all' ? 'on' : ''}`} onClick={() => setPlatform('all')}>All sources</button>
              {platforms.map(([p, n]) => (
                <button type="button" key={p} className={`ex-chip ${platform === p ? 'on' : ''}`} onClick={() => setPlatform(p)}>{p} {n}</button>
              ))}
            </>
          )}
        </div>
      ) : null}
      <div className={grid ? 'ex-grid' : 'ex-list'}>
        {shown.map((i, idx) => {
          const k = accountKey(i);
          const header = grouped && k && (groupSizes.get(k) || 0) > 1 && (idx === 0 || accountKey(shown[idx - 1]) !== k);
          return (
            <React.Fragment key={i.id}>
              {header && <div className="ex-group-head">{groupSizes.get(k)} results from {i.username ? `@${i.username}` : i.author} · {i.platform || i.domain}</div>}
              <ResultRow item={i} selected={selected.has(i.id)} onToggle={() => toggle(i.id)}
                onSave={() => save(withFeedback([i]), query)} saving={saving} extra={renderExtra?.(i)}
                feedback={feedback[i.id]} onFeedback={f => setFeedback(prev => { const n = { ...prev }; if (f) n[i.id] = f; else delete n[i.id]; return n; })} />
            </React.Fragment>
          );
        })}
        {shown.length === 0 && <div className="ex-muted ex-pad">No results match these filters.</div>}
      </div>
    </section>
  );
};

