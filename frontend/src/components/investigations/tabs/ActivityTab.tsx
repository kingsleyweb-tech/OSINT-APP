import React, { useMemo, useState } from 'react';
import type { EvidenceLevel, IntelligenceActivity } from '../../../types/investigation';
import {
  ACTIVITY_TYPE_GROUPS, activityType, fmtDate, hostOf, levelOf, openUrl, parseLooseDate, shortUrl, urlKey, type ActivityType
} from '../../../lib/workspace';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Chips, Empty, LevelBadge, SourceLogo } from '../workspace/ui';

interface Item {
  a: IntelligenceActivity;
  key: string;
  type: ActivityType;
  platform: string;
  level: EvidenceLevel;
  date: Date | null;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const ActivityTab: React.FC = () => {
  const { inv, d, goTab } = useWorkspace();
  const activities = inv.activities || [];
  const ref = inv.lastSearched || inv.createdAt;
  const [typeFilter, setTypeFilter] = useState('all');
  const [platforms, setPlatforms] = useState<Set<string>>(new Set());
  const [levels, setLevels] = useState<Set<EvidenceLevel>>(new Set());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest');

  const items: Item[] = useMemo(() => activities.map(a => {
    const key = urlKey(a.sourceUrl);
    const w = d.webByKey.get(key);
    return {
      a,
      key,
      type: activityType(a, d.webByKey, d.profileKeys),
      platform: w?.metadata?.platform || a.sourceName || hostOf(a.sourceUrl) || 'Web',
      level: levelOf(inv, key),
      date: parseLooseDate(a.date, ref)
    };
  }), [activities, d, inv, ref]);

  const groupFor = (t: ActivityType) => ACTIVITY_TYPE_GROUPS.find(g => g.types.includes(t))!.label;
  const typeChips = [
    { key: 'all', label: 'All', count: items.length },
    ...ACTIVITY_TYPE_GROUPS.map(g => ({ key: g.label, label: g.label, count: items.filter(i => g.types.includes(i.type)).length })).filter(o => o.count > 0)
  ];

  const platformCounts = new Map<string, number>();
  items.forEach(i => platformCounts.set(i.platform, (platformCounts.get(i.platform) || 0) + 1));
  const levelCounts: Record<EvidenceLevel, number> = { validated: 0, relevant: 0, raw: 0 };
  items.forEach(i => levelCounts[i.level]++);

  const toggle = <T,>(set: Set<T>, v: T, apply: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    apply(next);
  };

  const filtered = items.filter(i => {
    if (typeFilter !== 'all' && groupFor(i.type) !== typeFilter) return false;
    if (platforms.size && !platforms.has(i.platform)) return false;
    if (levels.size && !levels.has(i.level)) return false;
    if ((from || to) && !i.date) return false;
    if (from && i.date && monthKey(i.date) < from) return false;
    if (to && i.date && monthKey(i.date) > to) return false;
    return true;
  });

  const dated = filtered.filter(i => i.date).sort((x, y) => (order === 'newest' ? -1 : 1) * (x.date!.getTime() - y.date!.getTime()));
  const undated = filtered.filter(i => !i.date);
  const months: Array<{ label: string; items: Item[] }> = [];
  dated.forEach(i => {
    const label = i.date!.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const last = months[months.length - 1];
    if (last && last.label === label) last.items.push(i);
    else months.push({ label, items: [i] });
  });
  if (undated.length) months.push({ label: 'Date not stated', items: undated });

  const allDated = items.filter(i => i.date).map(i => i.date!.getTime());

  if (activities.length === 0) {
    return <Empty title="No activity was found">No posts, videos, articles or mentions were kept for this investigation.</Empty>;
  }

  const renderItem = (i: Item) => {
    const sid = d.sourceByKey.get(i.key)?.sid;
    return (
      <div key={i.a.id} className="ws-tl-item">
        <div className="ws-tl-day">
          {i.date ? (<><b>{String(i.date.getDate()).padStart(2, '0')}</b><span>{i.date.toLocaleDateString('en-GB', { weekday: 'short' })}</span></>) : <span>—</span>}
        </div>
        <div className="ws-tl-axis"><span className={`ws-tl-dot ${i.level}`} /></div>
        <div className="ws-tl-body">
          <div className="ws-tl-head">
            <div className="ws-tl-title">
              <SourceLogo url={i.a.sourceUrl} platform={i.platform} />
              {i.a.title}
              <span className="ws-tag">{i.type}</span>
              <span className="ws-tl-meta">{i.platform}{i.a.category ? ` · ${i.a.category}` : ''}</span>
            </div>
            <LevelBadge level={i.level} />
          </div>
          {i.a.briefReport && <p className="ws-tl-text">{i.a.briefReport}</p>}
          <div className="ws-tl-foot">
            {i.a.sourceUrl && <button type="button" className="ws-url" onClick={() => openUrl(i.a.sourceUrl)}>{shortUrl(i.a.sourceUrl)}</button>}
            {i.a.foundAt && <span>Found {fmtDate(i.a.foundAt, true)}</span>}
            {!i.date && i.a.date && i.a.date !== 'Date not stated' && <span>Listed as "{i.a.date}"</span>}
            {sid && <button type="button" className="ws-link" onClick={() => goTab('sources', i.key)}>Source {sid}</button>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ws-with-rail">
      <div>
        <div className="ws-toolbar">
          <Chips options={typeChips} value={typeFilter} onChange={setTypeFilter} />
          <select className="ws-select" value={order} onChange={e => setOrder(e.target.value as 'newest' | 'oldest')} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        {filtered.length === 0 && <Empty title="Nothing matches these filters" />}
        {months.map(m => (
          <div key={m.label}>
            <div className="ws-month">{m.label}</div>
            {m.items.map(renderItem)}
          </div>
        ))}
      </div>

      <aside className="ws-rail">
        <div className="ws-facet">
          <div className="ws-label">Platform</div>
          {Array.from(platformCounts.entries()).sort((a, b) => b[1] - a[1]).map(([p, n]) => (
            <label key={p}><input type="checkbox" checked={platforms.has(p)} onChange={() => toggle(platforms, p, setPlatforms)} />{p}<span className="n">{n}</span></label>
          ))}
        </div>
        <div className="ws-facet">
          <div className="ws-label">Evidence level</div>
          {(['validated', 'relevant', 'raw'] as EvidenceLevel[]).map(l => (
            <label key={l}><input type="checkbox" checked={levels.has(l)} onChange={() => toggle(levels, l, setLevels)} /><LevelBadge level={l} /><span className="n">{levelCounts[l]}</span></label>
          ))}
        </div>
        <div className="ws-facet">
          <div className="ws-label">Date range</div>
          <div className="ws-date-row">
            <label className="ws-field" style={{ margin: 0 }}><span>From</span><input type="month" className="ws-input" value={from} onChange={e => setFrom(e.target.value)} /></label>
            <label className="ws-field" style={{ margin: 0 }}><span>To</span><input type="month" className="ws-input" value={to} onChange={e => setTo(e.target.value)} /></label>
          </div>
          {(from || to) && <button type="button" className="ws-link" style={{ marginTop: 8 }} onClick={() => { setFrom(''); setTo(''); }}>Clear dates</button>}
        </div>
        <div className="ws-facet" style={{ borderTop: '1px solid var(--ws-border)', paddingTop: 20 }}>
          <div className="ws-label">Span</div>
          {allDated.length ? (
            <>
              <div>Earliest item <b>{fmtDate(new Date(Math.min(...allDated)).toISOString())}</b></div>
              <div>Latest item <b>{fmtDate(new Date(Math.max(...allDated)).toISOString())}</b></div>
            </>
          ) : <div className="ws-sub">No item states a date.</div>}
          {items.length - allDated.length > 0 && <div className="ws-sub" style={{ marginTop: 6 }}>{items.length - allDated.length} undated item(s)</div>}
        </div>
      </aside>
    </div>
  );
};
