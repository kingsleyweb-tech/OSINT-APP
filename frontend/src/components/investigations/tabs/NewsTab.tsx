import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { hostOf, levelOf, openUrl, parseLooseDate, fmtDate, shortUrl, urlKey, type WebItem } from '../../../lib/workspace';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Empty, LevelBadge, LevelPicker, SectionHead, SourceLogo } from '../workspace/ui';
import { relevanceText } from './WebTab';

function thumbnailOf(w: WebItem): string | undefined {
  const raw = w.metadata?.raw;
  if (Array.isArray(raw)) return raw.find((r: any) => typeof r?.thumbnail === 'string' && /^https?:/.test(r.thumbnail))?.thumbnail;
  return undefined;
}

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
        {items.length === 0 && <Empty title="No news coverage was kept">No news article naming the subject was returned by the searches.</Empty>}
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
