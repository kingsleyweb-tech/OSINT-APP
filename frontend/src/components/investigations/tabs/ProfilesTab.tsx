import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Minus } from 'lucide-react';
import type { SocialProfile } from '../../../types/investigation';
import { checkLinkHealth } from '../../../lib/searchClient';
import { openProfile, UNAVAILABLE_MESSAGE } from '../../../lib/profileDisplay';
import {
  fmtDate, fmtShortDate, hostOf, kindLabel, kindOf, levelOf, openUrl, profileEvidence, profileKey, profileTypeLabel,
  shortUrl, urlKey, isSimilarProfile, type WebItem
} from '../../../lib/workspace';
import { SimilarAccounts } from '../workspace/SimilarAccounts';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Chips, Empty, LevelBadge, LevelPicker, LinkStatus, SectionHead, SourceLogo } from '../workspace/ui';

const RECHECK_AFTER_MS = 24 * 3600 * 1000;

type RowKind = 'person' | 'channel' | 'page' | 'group';

interface Row {
  key: string;
  kind: RowKind;
  name: string;
  platform: string;
  handle: string;
  typeLabel: string;
  url: string;
  basis: string;
  found?: string;
  profile?: SocialProfile;
  web?: WebItem;
}

const GROUPS: Array<{ kinds: RowKind[]; title: string }> = [
  { kinds: ['person'], title: 'Person profiles' },
  { kinds: ['channel'], title: 'Channels' },
  { kinds: ['page', 'group'], title: 'Organization pages & groups' }
];

export const ProfilesTab: React.FC = () => {
  const { inv, d, focus, commit, setLevel, goTab } = useWorkspace();
  const allProfiles = useMemo(() => inv.socialProfiles || [], [inv.socialProfiles]);
  // Similar accounts are other people: listed separately below, not as this person's profiles.
  const profiles = useMemo(() => allProfiles.filter(p => !isSimilarProfile(p)), [allProfiles]);
  const similar = useMemo(() => allProfiles.filter(isSimilarProfile), [allProfiles]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('any');
  const [selectedKey, setSelectedKey] = useState<string | null>(focus);
  const [openError, setOpenError] = useState<string | null>(null);
  const checkedFor = useRef<string | null>(null);

  // Server-side reachability check for profiles not checked in the last 24h. It only annotates; the URL never changes.
  useEffect(() => {
    if (checkedFor.current === inv.id) return;
    checkedFor.current = inv.id;
    const due = profiles.filter(p => (p.profileUrl || p.url) && Date.now() - (p.lastCheckedAt ? Date.parse(p.lastCheckedAt) : 0) > RECHECK_AFTER_MS);
    if (due.length === 0) return;
    checkLinkHealth(due.map(p => (p.profileUrl || p.url) as string))
      .then(results => {
        if (results.length === 0) return;
        const byUrl = new Map(results.map(r => [r.url, r]));
        commit(i => ({
          ...i,
          socialProfiles: (i.socialProfiles || []).map(p => {
            const r = byUrl.get((p.profileUrl || p.url) as string);
            return r ? { ...p, linkStatus: r.status, linkStatusReason: r.reason, lastCheckedAt: r.checkedAt } : p;
          })
        }));
      })
      .catch(() => { /* best effort */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv.id]);

  const rows: Row[] = useMemo(() => {
    const fromProfiles: Row[] = profiles.map(p => ({
      key: profileKey(p),
      kind: profileTypeLabel(p) === 'Channel' ? 'channel' : 'person',
      name: p.profileName || (p.username ? `@${p.username}` : p.platform),
      platform: p.platform,
      handle: p.username ? (p.platform === 'YouTube' ? `@${p.username}` : p.username) : '',
      typeLabel: profileTypeLabel(p),
      url: p.profileUrl || p.url,
      basis: profileEvidence(p)[0] || p.source || '',
      found: p.discoveredAt,
      profile: p
    }));
    const fromPages: Row[] = d.buckets.page.map(w => ({
      key: urlKey(w.url),
      kind: kindOf(w) === 'organization_page' ? 'page' : 'group',
      name: w.title,
      platform: w.metadata?.platform || hostOf(w.url),
      handle: shortUrl(w.url).replace(/^[^/]+\/?/, ''),
      typeLabel: kindLabel(w),
      url: w.url,
      basis: w.metadata?.foundVia ? `Returned by ${w.metadata.foundVia}` : 'Returned by a profile search',
      found: w.discoveredAt,
      web: w
    }));
    return [...fromProfiles, ...fromPages];
  }, [profiles, d.buckets.page]);

  const count = (kinds: RowKind[]) => rows.filter(r => kinds.includes(r.kind)).length;
  const chipOptions = [
    { key: 'all', label: 'All', count: rows.length },
    { key: 'person', label: 'Person profiles', count: count(['person']) },
    { key: 'page', label: 'Pages', count: count(['page']) },
    { key: 'group', label: 'Groups', count: count(['group']) },
    { key: 'channel', label: 'Channels', count: count(['channel']) }
  ].filter(o => o.key === 'all' || o.count > 0);

  const q = query.trim().toLowerCase();
  const visible = rows.filter(r =>
    (filter === 'all' || r.kind === filter) &&
    (status === 'any' || levelOf(inv, r.key) === status) &&
    (!q || `${r.name} ${r.handle} ${r.url} ${r.platform}`.toLowerCase().includes(q))
  );

  const selected = rows.find(r => r.key === selectedKey) || visible[0] || null;

  const open = (r: Row) => {
    if (r.profile) setOpenError(openProfile(r.profile));
    else openUrl(r.url);
  };

  const similarList = <SimilarAccounts what="profiles" items={similar.map(p => ({ key: profileKey(p), title: p.profileName || (p.username ? `@${p.username}` : p.platform), platform: p.platform, url: (p.profileUrl || p.url) as string }))} />;

  if (rows.length === 0 && d.buckets.social.length === 0) {
    return (
      <>
        <Empty title="No profiles were found">The searches returned no profile pages that carry this name or username.</Empty>
        {similarList}
      </>
    );
  }

  return (
    <>
      <div className="ws-toolbar">
        <Chips options={chipOptions} value={filter} onChange={setFilter} />
        <div className="ws-chips">
          <input className="ws-input" style={{ width: 280 }} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, username or URL" />
          <select className="ws-select" value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
            <option value="any">Status: Any</option>
            <option value="validated">Validated</option>
            <option value="relevant">Relevant</option>
            <option value="raw">Raw result</option>
          </select>
        </div>
      </div>

      <div className="ws-with-rail wide-rail">
        <div>
          {rows.length > 0 && (
            <div className="ws-table-wrap">
              <table className="ws-table">
                <thead>
                  <tr><th>Profile</th><th>Type</th><th>Source URL</th><th>Match basis</th><th>Status</th><th>Found</th></tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr><td colSpan={6} className="ws-cell-muted" style={{ textAlign: 'center', padding: 24 }}>No profiles match these filters.</td></tr>
                  )}
                  {GROUPS.map(g => {
                    const inGroup = visible.filter(r => g.kinds.includes(r.kind));
                    if (inGroup.length === 0) return null;
                    return (
                      <React.Fragment key={g.title}>
                        <tr className="group"><td colSpan={6}>{g.title} · {inGroup.length}</td></tr>
                        {inGroup.map(r => (
                          <tr key={r.key} className={`row${selected?.key === r.key ? ' selected' : ''}`} onClick={() => { setSelectedKey(r.key); setOpenError(null); }}>
                            <td>
                              <div className="ws-cell-flex">
                                <SourceLogo url={r.url} platform={r.platform} square={!r.profile} />
                                <div style={{ minWidth: 0 }}>
                                  <div className="ws-cell-title">{r.name}</div>
                                  <div className="ws-cell-sub">{r.platform}{r.handle ? ` · ${r.handle}` : ''}</div>
                                </div>
                              </div>
                            </td>
                            <td><span className="ws-tag">{r.typeLabel}</span></td>
                            <td><span className="ws-url ws-trunc" title={r.url}>{shortUrl(r.url)}</span></td>
                            <td className="ws-cell-muted" style={{ maxWidth: 200 }}>{r.basis}</td>
                            <td><LevelBadge level={levelOf(inv, r.key)} /></td>
                            <td className="ws-mono ws-cell-muted">{fmtShortDate(r.found)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {similarList}

          {d.buckets.social.length > 0 && (
            <div className="ws-section" style={{ marginTop: 32 }}>
              <SectionHead title="Returned by profile searches, but not profiles" count={d.buckets.social.length} noRule right={<span className="ws-sub">Posts and videos · shown in Activity</span>} />
              <div className="ws-table-wrap">
                <table className="ws-table">
                  <tbody>
                    {d.buckets.social.map(w => (
                      <tr key={w.id}>
                        <td>
                          <div className="ws-cell-flex">
                            <SourceLogo url={w.url} platform={w.metadata?.platform} square />
                            <div style={{ minWidth: 0 }}>
                              <div className="ws-cell-title">{w.title}</div>
                              <div className="ws-cell-muted">{w.metadata?.platform || hostOf(w.url)}{w.source ? ` · ${w.source}` : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="ws-tag">{kindLabel(w)}</span></td>
                        <td><button type="button" className="ws-url ws-trunc" onClick={() => openUrl(w.url)} title={w.url}>{shortUrl(w.url)}</button></td>
                        <td><button type="button" className="ws-link" onClick={() => goTab('activity')}>View in Activity →</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {selected && (
          <aside className="ws-rail-plain">
            <div className="ws-panel">
              <div className="ws-panel-sec">
                <div className="ws-panel-head">
                  <span className="ws-label" style={{ margin: 0 }}>Selected {selected.profile ? 'profile' : 'page'}</span>
                  <LevelBadge level={levelOf(inv, selected.key)} />
                </div>
                <div className="ws-cell-flex">
                  <SourceLogo url={selected.url} platform={selected.platform} lg />
                  <div style={{ minWidth: 0 }}>
                    <div className="ws-h3">{selected.name}</div>
                    <div className="ws-cell-sub">{selected.platform}{selected.handle ? ` · ${selected.handle}` : ''}</div>
                  </div>
                </div>
                <div className="ws-urlbox">
                  <span className="ws-url">{selected.url}</span>
                  <button type="button" className="ws-copy" onClick={() => navigator.clipboard?.writeText(selected.url)} aria-label="Copy URL"><Copy size={15} /></button>
                  <button type="button" className="ws-copy" onClick={() => open(selected)} aria-label="Open"><ExternalLink size={15} /></button>
                </div>
                {openError && <p className="ws-sub" style={{ color: 'var(--ws-bad)', marginTop: 8 }}>{openError || UNAVAILABLE_MESSAGE}</p>}
              </div>

              <div className="ws-panel-sec">
                <div className="ws-kv-grid" style={{ marginTop: 0 }}>
                  <div><div className="k">Type</div><div className="v">{selected.typeLabel}</div></div>
                  <div><div className="k">Link status</div><div className="v"><LinkStatus status={selected.profile?.linkStatus} /></div></div>
                  <div><div className="k">Search match</div><div className="v">{selected.profile?.confidenceLabel || '—'}</div></div>
                  <div><div className="k">Discovered</div><div className="v">{fmtDate(selected.found, true)}</div></div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="k ws-sub">Discovered by</div>
                  <div>{selected.profile?.source || selected.web?.metadata?.foundVia || '—'}</div>
                  {selected.profile?.sourceQuery && <div className="ws-cell-sub">{selected.profile.sourceQuery}</div>}
                </div>
              </div>

              <div className="ws-panel-sec">
                <div className="ws-label">Why it matches</div>
                {selected.profile ? (
                  profileEvidence(selected.profile).length > 0
                    ? profileEvidence(selected.profile).map(t => <div key={t} className="ws-check"><Check size={16} />{t}</div>)
                    : <div className="ws-check off"><Minus size={16} />No match evidence was stored for this profile.</div>
                ) : (
                  <div className="ws-check off"><Minus size={16} />Organization pages and groups are kept because a profile search returned them. They are not the subject's own profile.</div>
                )}
              </div>

              <div className="ws-panel-sec">
                <div className="ws-label">Evidence level</div>
                <LevelPicker value={levelOf(inv, selected.key)} onChange={l => setLevel(selected.key, l, selected.name, d.sourceByKey.get(selected.key)?.sid || selected.platform)} />
                <div className="ws-panel-actions" style={{ marginTop: 18 }}>
                  <button type="button" className="ws-btn ws-btn-primary" onClick={() => open(selected)}><ExternalLink size={15} /> Open {selected.profile ? 'profile' : 'page'}</button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </>
  );
};
