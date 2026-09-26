import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Newspaper } from 'lucide-react';
import type { ExploreItem } from '../../../lib/exploreClient';
import { mergeItemsIntoCase, subjectQuery } from '../../../lib/caseSave';
import { useSearchRun } from '../../explore/useSearchRun';
import { SearchLoader } from '../../ui/SearchLoader';
import { hostOf, levelOf, openUrl, parseLooseDate, fmtDate, shortUrl, urlKey, type WebItem } from '../../../lib/workspace';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Empty, LevelBadge, LevelPicker, SectionHead, SourceLogo } from '../workspace/ui';
import { relevanceText } from './WebTab';

function thumbnailOf(w: WebItem): string | undefined {
  if (typeof w.metadata?.thumbnail === 'string' && /^https?:/.test(w.metadata.thumbnail)) return w.metadata.thumbnail;
  const raw = w.metadata?.raw;
  if (Array.isArray(raw)) return raw.find((r: any) => typeof r?.thumbnail === 'string' && /^https?:/.test(r.thumbnail))?.thumbnail;
  return undefined;
}

/**
 * Gathers news about the subject from Google News and Bing News. Runs by itself the first time the
 * tab is opened; articles whose headline or summary names the subject are added to the case, the
 * rest are listed for the investigator to review.
 */
const NewsGatherer: React.FC = () => {
  const { inv, commit } = useWorkspace();
  const { run, cancel, running, steps } = useSearchRun();
  const [review, setReview] = useState<{ items: ExploreItem[]; picked: Set<string>; query: string; added: number } | null>(null);
  const [error, setError] = useState('');
  const started = useRef(false);

  const gather = useCallback(async () => {
    setError('');
    setReview(null);
    const query = subjectQuery(inv);
    const out = await run([{ key: 'news', label: 'News', capability: 'news', query }]).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'The news search failed.');
      return null;
    });
    if (!out) return;
    const inCase = new Set((inv.webAndNews || []).map(w => urlKey(w.url)));
    const fresh = out.news.items.filter(i => !inCase.has(urlKey(i.url)));
    const confirmed = fresh.filter(i => i.relevance.label === 'Strong match');
    const others = fresh.filter(i => i.relevance.label !== 'Strong match');
    const now = new Date().toISOString();
    commit(current => ({
      ...(confirmed.length ? mergeItemsIntoCase(current, confirmed, 'News search', query).updated : current),
      newsCheckedAt: now
    }));
    setReview({ items: others, picked: new Set(), query, added: confirmed.length });
    if (out.news.engines.every(e => e.status === 'error' || e.status === 'quota')) setError(out.news.notices[0] || 'The news engines could not be reached.');
  }, [inv, run, commit]);

  useEffect(() => {
    if (started.current || inv.newsCheckedAt) return undefined;
    started.current = true;
    const t = setTimeout(() => { gather(); }, 0);
    return () => clearTimeout(t);
  }, [inv.newsCheckedAt, gather]);

  const addPicked = () => {
    if (!review) return;
    const chosen = review.items.filter(i => review.picked.has(i.id));
    if (chosen.length === 0) return;
    commit(current => mergeItemsIntoCase(current, chosen, 'News search (reviewed)', review.query).updated);
    setReview({ ...review, items: review.items.filter(i => !review.picked.has(i.id)), picked: new Set(), added: review.added + chosen.length });
  };

  if (running) return <SearchLoader title={`Gathering news about ${subjectQuery(inv)}`} steps={steps} onCancel={cancel} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="ws-btn" onClick={gather}><Newspaper size={15} /> Check for new articles</button>
        <span className="ws-sub">
          {inv.newsCheckedAt ? `Last checked ${fmtDate(inv.newsCheckedAt, true)} · ` : ''}Google News and Bing News (2 searches). Only articles naming {subjectQuery(inv)} are added automatically.
        </span>
      </div>
      {error && <span style={{ color: '#b45309', fontSize: 14 }}>{error}</span>}
      {review && (
        <div className="ws-empty" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <b>{review.added} article{review.added === 1 ? '' : 's'} naming the subject added{review.items.length ? ` · ${review.items.length} other article${review.items.length === 1 ? '' : 's'} to review` : ''}</b>
          {review.items.length > 0 && (
            <>
              <span className="ws-sub">These articles only partly match the name. Add the ones that are about this person.</span>
              <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {review.items.map(i => (
                  <label key={i.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14.5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={review.picked.has(i.id)} style={{ marginTop: 4, accentColor: 'var(--accent-warm)' }}
                      onChange={() => setReview(r => { if (!r) return r; const n = new Set(r.picked); if (n.has(i.id)) n.delete(i.id); else n.add(i.id); return { ...r, picked: n }; })} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <a href={i.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: 'var(--ws-text)' }}>{i.title}</a>
                      <span className="ws-sub">{i.author || i.domain}{i.publishedAt ? ` · ${fmtDate(i.publishedAt)}` : i.publishedText ? ` · ${i.publishedText}` : ''} · {i.relevance.label}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" className="ws-btn ws-btn-primary" onClick={addPicked} disabled={review.picked.size === 0}>Add {review.picked.size} to case</button>
                <button type="button" className="ws-btn" onClick={() => setReview({ ...review, items: [] })}>Dismiss</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const NewsTab: React.FC = () => {
  const { inv, d, setLevel, goTab } = useWorkspace();
  const ref = inv.lastSearched || inv.createdAt;
  const items = [...d.buckets.news].sort((a, b) =>
    (parseLooseDate(b.metadata?.date, ref)?.getTime() || 0) - (parseLooseDate(a.metadata?.date, ref)?.getTime() || 0));

  const publishers = new Map<string, number>();
  items.forEach(w => {
    const p = w.source || hostOf(w.url);
    publishers.set(p, (publishers.get(p) || 0) + 1);
  });

  return (
    <div className="ws-with-rail">
      <div>
        <SectionHead title="News & articles" count={items.length} noRule right={<span className="ws-sub">Newest first</span>} />
        <div style={{ margin: '4px 0 18px' }}><NewsGatherer /></div>
        {items.length === 0 && <Empty title="No news coverage was kept">No news article naming the subject has been found yet.</Empty>}
        {items.map(w => {
          const key = urlKey(w.url);
          const sid = d.sourceByKey.get(key)?.sid;
          const img = thumbnailOf(w);
          const date = parseLooseDate(w.metadata?.date, ref);
          return (
            <article key={w.id} className="ws-news">
              <div className="ws-news-img">
                {img ? <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" /> : (<><ImageIcon size={22} /><span>No image</span></>)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="ws-tl-head">
                  <div className="ws-webcard-meta ws-sub">
                    <SourceLogo url={w.url} platform={w.source} /><b style={{ color: 'var(--ws-text)' }}>{w.source || hostOf(w.url)}</b>
                    {(date || w.metadata?.date) && <span>· {date ? fmtDate(date.toISOString()) : w.metadata?.date}</span>}
                    <span>· {w.metadata?.pageKindLabel || 'Article'}</span>
                  </div>
                  <LevelBadge level={levelOf(inv, key)} />
                </div>
                <h3 className="ws-news-title">{w.title}</h3>
                {w.description && <div className="ws-webcard-text">{w.description}</div>}
                <div className="ws-news-rel ws-relevance" style={{ marginTop: 10 }}><b>RELEVANCE</b>{relevanceText(w, inv.searchType === 'username')}</div>
                <div className="ws-tl-foot">
                  <button type="button" className="ws-url" onClick={() => openUrl(w.url)}>{shortUrl(w.url)}</button>
                  {sid ? <button type="button" className="ws-link" onClick={() => goTab('sources', key)}>Saved as {sid}</button> : <span>Not saved as source</span>}
                  <LevelPicker value={levelOf(inv, key)} onChange={l => setLevel(key, l, w.title, sid || hostOf(w.url))} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <aside className="ws-rail">
        <div className="ws-facet">
          <div className="ws-label">Shown here when</div>
          <p className="ws-sub" style={{ fontSize: 14.5, lineHeight: 1.6 }}>
            Google listed the result under Top Stories, or its address has a news-article path, and it names the subject.
            Other pages are in the Web tab.
          </p>
        </div>
        {publishers.size > 0 && (
          <div className="ws-facet" style={{ borderTop: '1px solid var(--ws-border)', paddingTop: 20 }}>
            <div className="ws-label">Publishers</div>
            {Array.from(publishers.entries()).sort((a, b) => b[1] - a[1]).map(([p, n]) => (
              <div key={p} className="ws-cov-row" style={{ padding: '6px 0' }}><SourceLogo url={items.find(w => (w.source || hostOf(w.url)) === p)?.url} platform={p} /><span className="name">{p}</span><span className="n">{n}</span></div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
};
