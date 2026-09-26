import React, { useMemo } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { LevelBadge, SectionHead, SourceLogo } from '../workspace/ui';
import {
  assocKey, fmtDate, fmtShortDate, levelOf, parseLooseDate, profileKey, profileTypeLabel, shortUrl,
  isSimilarProfile, isSimilarActivity, similarProfileKeys
} from '../../../lib/workspace';
import type { EvidenceLevel } from '../../../types/investigation';

const LEVEL_RANK: Record<EvidenceLevel, number> = { validated: 2, relevant: 1, raw: 0 };

export const OverviewTab: React.FC = () => {
  const { inv, d, goTab } = useWorkspace();
  const similarKeys = similarProfileKeys(inv);
  const profiles = (inv.socialProfiles || []).filter(p => !isSimilarProfile(p));
  const activities = (inv.activities || []).filter(a => !isSimilarActivity(a, similarKeys));
  const associations = inv.associations || [];
  const ref = inv.lastSearched || inv.createdAt;

  const datedActivity = useMemo(() => activities
    .map(a => ({ a, date: parseLooseDate(a.date, ref) }))
    .filter((x): x is { a: typeof activities[number]; date: Date } => x.date !== null)
    .sort((x, y) => y.date.getTime() - x.date.getTime()), [activities, ref]);

  const keyProfiles = useMemo(() => [...profiles].sort((a, b) =>
    LEVEL_RANK[levelOf(inv, profileKey(b))] - LEVEL_RANK[levelOf(inv, profileKey(a))] || (b.confidence || 0) - (a.confidence || 0)
  ).slice(0, 3), [profiles, inv]);

  const platformCounts = new Map<string, number>();
  profiles.forEach(p => platformCounts.set(p.platform, (platformCounts.get(p.platform) || 0) + 1));
  const mainPlatforms = Array.from(platformCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p);

  const validatedAssoc = associations.filter(a => levelOf(inv, assocKey(a)) === 'validated').length;
  const role = inv.targetProfile?.occupation && !/not stated|no public role|public individual/i.test(inv.targetProfile.occupation)
    ? inv.targetProfile.occupation
    : 'Not stated in sources';
  const place = inv.targetProfile?.location && inv.targetProfile.location !== 'Not specified' ? inv.targetProfile.location : 'Not stated in sources';
  const lastSeen = datedActivity[0];

  const strongest = [...d.sources]
    .sort((a, b) => LEVEL_RANK[levelOf(inv, b.key)] - LEVEL_RANK[levelOf(inv, a.key)]
      || (b.source.confidenceScore || 0) - (a.source.confidenceScore || 0))
    .slice(0, 3);

  const inputs = inv.searchInputs || {};
  const inputChips: Array<[string, string]> = [];
  if (inputs.name) inputChips.push(['Name', inputs.name]);
  if (inputs.username) inputChips.push(['Username', `@${inputs.username}`]);
  if (inputs.location) inputChips.push(['Location', inputs.location]);
  if (inputs.organization) inputChips.push(['Organization', inputs.organization]);
  inputChips.push(['Depth', inv.searchDepth || 'deep']);

  const p = d.pipeline;
  const coverage = inv.searchCoverage || [];
  const coverageDone = coverage.filter(c => c.status === 'checked').length;
  const max = Math.max(p.raw || 0, p.relevant, 1);
  const pct = (n: number) => `${Math.round((n / max) * 100)}%`;
  const batches = new Set((inv.searchLog || []).map(s => s.batch)).size;

  return (
    <div className="ws-with-rail">
      <div>
        <div className="ws-mobile-pipeline">
          <div><span className="ws-level raw">Raw</span><b>{p.raw ?? '—'}</b></div>
          <div><span className="ws-level relevant">Relevant</span><b>{p.relevant}</b></div>
          <div><span className="ws-level validated">Validated</span><b>{p.validated}</b></div>
          <div><span className="ws-sub">Sources</span><b>{d.sources.length}</b></div>
        </div>

        <SectionHead title="Subject summary" right={<span className="ws-sub">Built from {d.sources.length} kept result{d.sources.length === 1 ? '' : 's'}</span>} />
        <p className="ws-summary">{inv.quickSummary || 'No summary could be built from the search results.'}</p>

        <div className="ws-infobox">
          <div><div className="k">Name / target</div><div className="v">{inv.targetProfile?.fullName || inv.name}</div></div>
          <div><div className="k">Location</div><div className="v">{place}</div></div>
          <div><div className="k">Occupation / role</div><div className="v">{role}</div></div>
          <div><div className="k">Main platforms</div><div className="v">{mainPlatforms.join(', ') || 'None found'}</div></div>
          <div>
            <div className="k">Last observed activity</div>
            <div className="v">{lastSeen ? `${fmtDate(lastSeen.date.toISOString())} · ${lastSeen.a.sourceName}` : 'No dated activity'}</div>
          </div>
          <div><div className="k">Documented associations</div><div className="v">{associations.length} ({validatedAssoc} validated)</div></div>
        </div>

        <div className="ws-inputs">
          <span className="ws-label">Search inputs</span>
          {inputChips.map(([k, v]) => <span key={k} className="ws-tag">{k}<b>{v}</b></span>)}
        </div>

        <div className="ws-two">
          <div className="ws-section">
            <SectionHead title="Key profiles" right={<button type="button" className="ws-link" onClick={() => goTab('profiles')}>All {d.counts.profiles} →</button>} />
            {keyProfiles.length === 0 && <p className="ws-sub" style={{ paddingTop: 12 }}>No profiles were found.</p>}
            {keyProfiles.map(pr => (
              <div key={profileKey(pr)} className="ws-row clickable" onClick={() => goTab('profiles', profileKey(pr))}>
                <SourceLogo url={pr.profileUrl || pr.url} platform={pr.platform} />
                <div className="ws-row-main">
                  <div className="ws-row-title" style={{ fontWeight: 500 }}><b>{pr.platform}</b> · {profileTypeLabel(pr)}</div>
                  <div className="ws-url">{shortUrl(pr.profileUrl || pr.url)}</div>
                </div>
                <LevelBadge level={levelOf(inv, profileKey(pr))} dot />
              </div>
            ))}
          </div>

          <div className="ws-section">
            <SectionHead title="Recent activity" right={<button type="button" className="ws-link" onClick={() => goTab('activity')}>Timeline →</button>} />
            {datedActivity.length === 0 && <p className="ws-sub" style={{ paddingTop: 12 }}>No dated activity. {activities.length > 0 ? `${activities.length} undated item(s) are in the Activity tab.` : ''}</p>}
            {datedActivity.slice(0, 3).map(({ a, date }) => (
              <div key={a.id} className="ws-row clickable" onClick={() => goTab('activity')}>
                <span className="ws-row-date">{fmtShortDate(date.toISOString())}</span>
                <SourceLogo url={a.sourceUrl} platform={a.sourceName} />
                <div className="ws-row-main">
                  <div className="ws-row-title">{a.title}</div>
                  <div className="ws-row-sub">{a.category} · {a.sourceName}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="ws-section">
            <SectionHead title="Associations" right={<button type="button" className="ws-link" onClick={() => goTab('associations')}>All {associations.length} →</button>} />
            {associations.length === 0 && <p className="ws-sub" style={{ paddingTop: 12 }}>No associations were found in the results.</p>}
            {associations.slice(0, 3).map(a => (
              <div key={a.id} className="ws-row clickable" onClick={() => goTab('associations', assocKey(a))}>
                <div className="ws-row-main">
                  <div className="ws-row-cat">{a.category}</div>
                  <div className="ws-row-title">{a.name}</div>
                  <div className="ws-row-sub">{a.relationship}</div>
                </div>
                <LevelBadge level={levelOf(inv, assocKey(a))} />
              </div>
            ))}
          </div>

          <div className="ws-section">
            <SectionHead title="Strongest sources" right={<button type="button" className="ws-link" onClick={() => goTab('sources')}>All {d.sources.length} →</button>} />
            {strongest.length === 0 && <p className="ws-sub" style={{ paddingTop: 12 }}>No sources were collected.</p>}
            {strongest.map(s => {
              return (
                <div key={s.key} className="ws-row clickable" onClick={() => goTab('sources', s.key)}>
                  <span className="ws-row-date">{s.sid}</span>
                  <SourceLogo url={s.source.url} platform={s.source.sourceName} />
                  <div className="ws-row-main">
                    <div className="ws-row-title">{s.source.title}</div>
                    <div className="ws-url">{shortUrl(s.source.url)}</div>
                  </div>
                  <LevelBadge level={levelOf(inv, s.key)} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="ws-rail overview-rail">
        <div className="ws-section">
          <SectionHead title="Evidence pipeline" />
          <p className="ws-pipe-intro">Everything the searches kept starts as Relevant. You can validate a result or mark it as a raw, unconfirmed result.</p>
          <div className="ws-pipe-step">
            <div className="ws-pipe-top"><span className="ws-level raw">Raw results</span><span className="ws-pipe-num">{p.raw ?? '—'}</span></div>
            <div className="ws-bar raw"><i style={{ width: p.raw ? '100%' : '0%' }} /></div>
          </div>
          <div className="ws-pipe-step">
            <div className="ws-pipe-top"><span className="ws-level relevant">Relevant</span><span className="ws-pipe-num">{p.relevant}</span></div>
            <div className="ws-bar relevant"><i style={{ width: pct(p.relevant) }} /></div>
          </div>
          <div className="ws-pipe-step">
            <div className="ws-pipe-top"><span className="ws-level validated">Validated</span><span className="ws-pipe-num">{p.validated}</span></div>
            <div className="ws-bar"><i style={{ width: pct(p.validated) }} /></div>
          </div>
        </div>

        <div className="ws-section">
          <SectionHead
            title="Search coverage"
            right={coverage.length > 0 && <span className="ws-link" style={{ cursor: 'default' }}>{coverageDone} / {coverage.length} complete</span>}
          />
          {coverage.length === 0 && <p className="ws-sub" style={{ paddingTop: 12 }}>No search coverage was recorded for this investigation.</p>}
          {coverage.map(c => (
            <div key={c.provider} className="ws-cov-row">
              {c.status === 'checked' ? <CheckCircle2 size={17} className="ws-cov-ok" /> : <XCircle size={17} className="ws-cov-bad" />}
              <span className="name">{c.provider}</span>
              <span className="n">{c.count}</span>
            </div>
          ))}
        </div>

        <div className="ws-section">
          <SectionHead title="Timeline" />
          <div className="ws-kv-grid">
            <div><div className="k">Created</div><div className="v">{fmtDate(inv.createdAt, true)}</div></div>
            <div><div className="k">Last search</div><div className="v">{fmtDate(inv.lastSearched || inv.createdAt, true)}</div></div>
            <div><div className="k">Searches run</div><div className="v">{batches || 1}</div></div>
            <div><div className="k">Queries sent</div><div className="v">{(inv.searchLog || []).length || '—'}</div></div>
          </div>
        </div>
      </aside>
    </div>
  );
};
