import React, { useState } from 'react';
import { fmtDate, hostOf, kindLabel, levelOf, openUrl, urlKey, type WebItem } from '../../../lib/workspace';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Chips, Empty, LevelBadge, LevelPicker, SectionHead, SourceLogo } from '../workspace/ui';

/** Why a web result was kept, from what the search engine recorded about it. */
export function relevanceText(w: WebItem, isUsername: boolean): string {
  const m = w.metadata || {};
  if (m.ownerProfileUrl) return 'Published by one of this identity\'s profiles';
  if (m.identityLink === 'linked') return 'Mentions this identity\'s organization or @username';
  if (isUsername) return 'The username appears in the result';
  return 'The full name appears in the title or snippet';
}

export const WebCard: React.FC<{ w: WebItem }> = ({ w }) => {
  const { inv, d, setLevel, goTab } = useWorkspace();
  const key = urlKey(w.url);
  const sid = d.sourceByKey.get(key)?.sid;
  const host = hostOf(w.url);
  return (
    <div className="ws-webcard">
      <SourceLogo url={w.url} square lg />
      <div style={{ minWidth: 0 }}>
        <div className="ws-webcard-meta"><span className="ws-mono ws-muted">{host}</span><span className="ws-tag">{kindLabel(w)}</span></div>
        <div className="ws-webcard-title">{w.title}</div>
        {w.description && <div className="ws-webcard-text">{w.description}</div>}
        <div className="ws-relevance"><b>RELEVANCE</b>{relevanceText(w, inv.searchType === 'username')}</div>
      </div>
      <div className="ws-webcard-side">
        <LevelBadge level={levelOf(inv, key)} />
        <div>
          <div className="ws-sub">Discovered by</div>
          <div>{w.metadata?.foundVia || w.metadata?.platform || w.source || 'Search'}{w.discoveredAt ? ` · ${fmtDate(w.discoveredAt)}` : ''}</div>
        </div>
        <button type="button" className="ws-url" onClick={() => openUrl(w.url)}>{w.url}</button>
        <div className="ws-panel-actions">
          <button type="button" className="ws-btn ws-btn-sm" onClick={() => openUrl(w.url)}>Open</button>
          {sid && <button type="button" className="ws-btn ws-btn-sm" onClick={() => goTab('sources', key)}>Source {sid}</button>}
        </div>
        <LevelPicker value={levelOf(inv, key)} onChange={l => setLevel(key, l, w.title, sid || host)} />
      </div>
    </div>
  );
};

export const WebTab: React.FC = () => {
  const { inv, d } = useWorkspace();
  const items = d.buckets.web;
  const [kind, setKind] = useState('all');

  const kinds = new Map<string, number>();
  items.forEach(w => kinds.set(kindLabel(w), (kinds.get(kindLabel(w)) || 0) + 1));
  const visible = items.filter(w => kind === 'all' || kindLabel(w) === kind);
  const hasLinkInfo = items.some(w => w.metadata?.identityLink);
  const linked = visible.filter(w => w.metadata?.identityLink === 'linked' || w.metadata?.ownerProfileUrl);
  const mentions = visible.filter(w => !linked.includes(w));

  if (items.length === 0) {
    return <Empty title="No web pages">No websites or articles (other than news, posts and profiles) were kept for this {inv.searchType === 'username' ? 'username' : 'person'}.</Empty>;
  }

  return (
    <>
      <div className="ws-toolbar">
        <Chips
          options={[{ key: 'all', label: 'All', count: items.length }, ...Array.from(kinds.entries()).map(([k, n]) => ({ key: k, label: k, count: n }))]}
          value={kind}
          onChange={setKind}
        />
        <span className="ws-sub">Public pages that mention or belong to the subject</span>
      </div>
      {hasLinkInfo ? (
        <>
          {linked.length > 0 && (
            <div className="ws-section">
              <SectionHead title="Linked to this identity" count={linked.length} noRule />
              {linked.map(w => <WebCard key={w.id} w={w} />)}
            </div>
          )}
          {mentions.length > 0 && (
            <div className="ws-section">
              <SectionHead title="Mention the name only — unconfirmed" count={mentions.length} noRule right={<span className="ws-sub">May refer to someone else with the same name</span>} />
              {mentions.map(w => <WebCard key={w.id} w={w} />)}
            </div>
          )}
        </>
      ) : (
        <div className="ws-section">
          <SectionHead title="Pages naming the subject" count={visible.length} noRule />
          {visible.map(w => <WebCard key={w.id} w={w} />)}
        </div>
      )}
    </>
  );
};
