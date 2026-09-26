import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { History, ExternalLink, Play, Trash2, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import { ExplorePage, EmptyState } from '../../components/explore/ExploreKit';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../components/ui/Toast';
import { removeSearchHistoryInDb } from '../../firebase/firestore';
import { CATEGORY_LABEL, CATEGORY_PAGE } from '../../lib/history';
import { fmtDate } from '../../lib/workspace';
import type { SearchCategory, SearchHistoryEntry } from '../../types/user';

const ORDER: SearchCategory[] = ['name', 'username', 'social', 'forums', 'news', 'images', 'videos', 'reverseImage', 'geo', 'trends'];

function runAgainLink(e: SearchHistoryEntry): string {
  const params = new URLSearchParams(e.params || {});
  if (e.category === 'name' || e.category === 'username') {
    params.set('q', e.query);
    params.set('type', e.category === 'username' ? 'Username' : 'Name');
  }
  params.set('run', '1');
  return `${CATEGORY_PAGE[e.category]}?${params.toString()}`;
}

export const SearchHistoryPage: React.FC = () => {
  const { user, profile } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [category, setCategory] = useState<SearchCategory | 'all'>('all');
  const [text, setText] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const history = useMemo(() => profile?.searchHistory || [], [profile?.searchHistory]);

  const counts = useMemo(() => {
    const m = new Map<SearchCategory, number>();
    history.forEach(h => m.set(h.category, (m.get(h.category) || 0) + 1));
    return m;
  }, [history]);

  const shown = history.filter(h =>
    (category === 'all' || h.category === category) &&
    (!text.trim() || `${h.query} ${h.correctedQuery || ''} ${h.detail || ''}`.toLowerCase().includes(text.trim().toLowerCase())));

  const remove = async (ids: string[] | 'all') => {
    if (!user) return;
    try {
      await removeSearchHistoryInDb(user.uid, ids);
      toast.success(ids === 'all' ? 'History cleared' : 'Search removed');
    } catch (e) {
      toast.error('Not removed', e instanceof Error ? e.message : 'The history could not be updated.');
    }
  };

  return (
    <ExplorePage title="Search history" subtitle="Every search you run is saved to your account, grouped by kind. Open one to see the results it found, run it again, or open the case made from it."
      actions={history.length > 0 ? <button type="button" className="ex-btn ex-btn-ghost" onClick={() => { if (window.confirm('Delete your whole search history? This cannot be undone.')) remove('all'); }}><Trash2 size={15} /> Clear history</button> : undefined}>
      <div className="ex-chips ex-card" style={{ borderRadius: 'var(--radius-lg)' }}>
        <button type="button" className={`ex-chip ${category === 'all' ? 'on' : ''}`} onClick={() => setCategory('all')}>All {history.length}</button>
        {ORDER.filter(c => counts.get(c)).map(c => (
          <button type="button" key={c} className={`ex-chip ${category === c ? 'on' : ''}`} onClick={() => setCategory(c)}>{CATEGORY_LABEL[c]} {counts.get(c)}</button>
        ))}
        <input className="ex-input ex-filter" style={{ height: 32, marginLeft: 'auto', maxWidth: 260 }} placeholder="Filter searches" value={text} onChange={e => setText(e.target.value)} aria-label="Filter searches" />
      </div>

      {history.length === 0 ? (
        <EmptyState icon={<History size={24} />} title="No searches yet">
          Name, username, social, news, media, geo and trends searches appear here as soon as you run them.
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState title="No matching searches">Change the filter to see more.</EmptyState>
      ) : (
        <section className="ex-card">
          {shown.map(h => {
            const isOpen = open === h.id;
            return (
              <div key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div className="ex-row" style={{ borderBottom: 0, alignItems: 'center' }}>
                  <button type="button" className="ex-check" onClick={() => setOpen(isOpen ? null : h.id)} aria-expanded={isOpen} aria-label={isOpen ? 'Hide results' : 'Show results'}>
                    {isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                  </button>
                  <div className="ex-row-body">
                    <button type="button" className="ex-row-title" style={{ background: 'none', textAlign: 'left', padding: 0 }} onClick={() => setOpen(isOpen ? null : h.id)}>{h.query}</button>
                    <div className="ex-row-meta">
                      <span className="ex-kind">{CATEGORY_LABEL[h.category]}</span>
                      {h.correctedQuery && <span title="Search intelligence searched a confident correction">→ searched “{h.correctedQuery}”{h.correctionConfidence ? ` (${h.correctionConfidence} confidence)` : ''}</span>}
                      {!h.correctedQuery && h.variants && h.variants.length > 0 && <span>Suggested: {h.variants.join(' · ')}</span>}
                      {h.mode === 'precise' && <span>Precise</span>}
                      {h.detail && <span>{h.detail}</span>}
                      <span>{fmtDate(h.createdAt, true)}</span>
                      <span>{h.resultCount} result{h.resultCount === 1 ? '' : 's'}</span>
                      {h.searchesUsed != null && <span>{h.searchesUsed} search{h.searchesUsed === 1 ? '' : 'es'} used</span>}
                      {h.sources && h.sources.length > 0 && <span title={h.sources.join(', ')}>{h.sources.length} source{h.sources.length === 1 ? '' : 's'}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                    {h.investigationId && <Link className="ex-btn ex-btn-ghost ex-btn-sm" to={`/investigations/${h.investigationId}`}><FolderOpen size={13} /> Open case</Link>}
                    <button type="button" className="ex-btn ex-btn-ghost ex-btn-sm" onClick={() => navigate(runAgainLink(h))}><Play size={13} /> Run again</button>
                    <button type="button" className="ex-btn ex-btn-ghost ex-btn-sm" onClick={() => remove([h.id])} aria-label="Delete this search"><Trash2 size={13} /></button>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 18px 14px 58px' }}>
                    {h.topResults.length === 0 ? <div className="ex-muted ex-small">This search found no results.</div> : h.topResults.map(r => (
                      <div key={r.url} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0' }}>
                        {r.thumbnail ? <img src={r.thumbnail} alt="" className="ex-thumb" style={{ width: 44, height: 34 }} referrerPolicy="no-referrer" loading="lazy" /> : <PlatformIcon platform={r.source} size={16} />}
                        <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{r.title} <ExternalLink size={11} /></a>
                        <span className="ex-muted ex-small" style={{ whiteSpace: 'nowrap' }}>{r.source}</span>
                      </div>
                    ))}
                    {h.resultCount > h.topResults.length && <div className="ex-muted ex-small" style={{ marginTop: 4 }}>Showing the top {h.topResults.length} of {h.resultCount}. Run it again to see all results.</div>}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </ExplorePage>
  );
};
