import React, { useMemo } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { LevelBadge, SectionHead, SourceLogo } from '../workspace/ui';
import {
  assocKey, fmtDate, fmtShortDate, levelOf, parseLooseDate, profileKey, profileTypeLabel, shortUrl,
  isSimilarProfile, isSimilarActivity, similarProfileKeys
} from '../../../lib/workspace';
import type { EvidenceLevel } from '../../../types/investigation';
import { caseGender } from '../../../lib/genderEvidence';
import { allContacts, summariseContacts } from '../../../lib/contactEvidence';
import { OrgOverview } from './OrgOverview';
import { aiPending, reviewedAnalysis } from '../../../lib/aiReview';
import { bestFact, TIER_LABEL } from '../../../lib/personFacts';
import type { FactSummary } from '../../../types/person';

/** A record value with where it is stated: "Musician · Instagram (own profile) +1 · 88%". */
const FactValue: React.FC<{ fact: FactSummary; label?: string }> = ({ fact, label }) => {
  const src = fact.sources[0];
  const more = fact.sources.length - 1;
  return (
    <>
      {label || fact.value}
      <span className="ws-sub" style={{ display: 'block', fontSize: '0.75rem' }}>
        {src.sourceUrl
          ? <a href={src.sourceUrl} target="_blank" rel="noopener noreferrer" title={src.quote ? `“${src.quote}”` : src.sourceTitle}>{src.sourceName}</a>
          : src.sourceName}
        {` (${TIER_LABEL[fact.tier].toLowerCase()})`}{more > 0 ? ` +${more} more` : ''} · {fact.confidence}%
        {fact.conflicts?.length ? ` · other sources say ${fact.conflicts.join(', ')}` : ''}
      </span>
    </>
  );
};

const LEVEL_RANK: Record<EvidenceLevel, number> = { validated: 2, relevant: 1, raw: 0 };

export const OverviewTab: React.FC = () => {
  const { inv, d, goTab, readOnly } = useWorkspace();
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
  // The person record (search + verified AI findings) first; older cases fall back to the card fields.
  const occFact = bestFact(inv, 'occupation') || bestFact(inv, 'role');
  const placeFact = bestFact(inv, 'location');
  const nationFact = bestFact(inv, 'nationality');
  const roleText = inv.targetProfile?.occupation && !/not stated|no public role|public individual/i.test(inv.targetProfile.occupation)
    ? inv.targetProfile.occupation
    : 'Not stated in sources';
  const placeText = inv.targetProfile?.location && !/not specified|not stated/i.test(inv.targetProfile.location) ? inv.targetProfile.location : 'Not stated in sources';
  const role: React.ReactNode = occFact ? <FactValue fact={occFact} /> : roleText;
  const place: React.ReactNode = placeFact
    ? <FactValue fact={placeFact} />
    : placeText === 'Not stated in sources' && nationFact
      ? <FactValue fact={nationFact} label={`${nationFact.value} (nationality stated)`} />
      : placeText;
  const lastSeen = datedActivity[0];

  const strongest = [...d.sources]
    .sort((a, b) => LEVEL_RANK[levelOf(inv, b.key)] - LEVEL_RANK[levelOf(inv, a.key)]
      || (b.source.confidenceScore || 0) - (a.source.confidenceScore || 0))
    .slice(0, 3);

  const inputs = inv.searchInputs || {};
  const inputChips: Array<[string, string]> = [];
  if (inputs.name) inputChips.push(['Name', inputs.name]);
  if (inputs.username) inputChips.push(['Username', `@${inputs.username}`]);
  if (inputs.email) inputChips.push(['Email', inputs.email]);
  if (inputs.phone) inputChips.push(['Phone', inputs.phone]);
  if (inputs.location) inputChips.push(['Location', inputs.location]);
  if (inputs.organization) inputChips.push(['Organization', inputs.organization]);
  inputChips.push(['Depth', inv.searchDepth || 'deep']);

  const org = inv.entityKind === 'organization' ? inv.organization : undefined;
  const gender = caseGender(inv);
  const genderText = gender.value === 'Conflicting'
    ? `Conflicting — ${gender.evidence.map(x => `${x.e.gender} (${x.platform})`).join(', ')}`
    : gender.evidence.length
      ? `${gender.value} · stated on ${gender.evidence.map(x => x.platform).join(', ')}`
      : 'Not publicly stated';

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

        {(() => {
          const c = summariseContacts(allContacts(inv));
          const emails = c.filter(x => x.kind === 'email').length;
          const phones = c.filter(x => x.kind === 'phone').length;
          const contact = c.length
            ? <button type="button" className="ws-link" onClick={() => goTab('contact')}>{[emails ? `${emails} email${emails === 1 ? '' : 's'}` : '', phones ? `${phones} phone${phones === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')} →</button>
            : 'None found yet (see Contact tab)';
          const common = <>
            <div><div className="k">Main platforms</div><div className="v">{mainPlatforms.join(', ') || 'None found'}</div></div>
            <div>
              <div className="k">Last observed activity</div>
              <div className="v">{lastSeen ? `${fmtDate(lastSeen.date.toISOString())} · ${lastSeen.a.sourceName}` : activities.length ? `${activities.length} item${activities.length === 1 ? '' : 's'}, dates not stated` : 'No activity found'}</div>
            </div>
            <div><div className="k">Documented associations</div><div className="v">{associations.length} ({validatedAssoc} validated)</div></div>
            <div><div className="k">Public contact</div><div className="v">{contact}</div></div>
          </>;

          if (!org) {
            return (
              <div className="ws-infobox">
                <div><div className="k">Name / target</div><div className="v">{inv.targetProfile?.fullName || inv.name}</div></div>
                {inv.person && (
                  <div>
                    <div className="k">Identity match</div>
                    <div className="v" title={inv.person.confidenceReason}>
                      {inv.person.identityConfidence}
                      {inv.correctedName && <span className="ws-sub" style={{ display: 'block', fontSize: '0.75rem' }}>Showing results for {inv.correctedName}{inv.person.searchedName ? ` (searched "${inv.person.searchedName}")` : ''}</span>}
                    </div>
                  </div>
                )}
                <div><div className="k">Location</div><div className="v">{place}</div></div>
                <div><div className="k">Occupation / role</div><div className="v">{role}</div></div>
                {common}
                <div>
                  <div className="k">Gender</div>
                  <div className="v" title="Only from pronouns or a gender field the person's own profiles state. Never inferred from a name or photo.">{genderText}</div>
                </div>
              </div>
            );
          }

          // Organisation case: a summary per section, each linking to the Organisation tab.
          return <OrgOverview contact={contact} platforms={mainPlatforms} />;
        })()}


        {(() => {
          // AI summary, only once an analysis exists (view-only visitors see the reviewed version).
          const ai = readOnly ? reviewedAnalysis(inv) : inv.aiAnalysis;
          if (!ai) return null;
          const pending = aiPending(inv);
          return (
            <div className="ws-section" style={{ marginTop: 24 }}>
              <SectionHead title="AI intelligence summary" right={<button type="button" className="ws-link" onClick={() => goTab('ai')}>{!readOnly && pending ? `${pending} to review →` : 'AI Analysis →'}</button>} />
              <p className="ws-summary">{ai.summary.text}</p>
              <p className="ws-sub">AI-extracted from {ai.evidenceCount} evidence item{ai.evidenceCount === 1 ? '' : 's'} in this case on {fmtDate(ai.runAt, true)}; each statement quotes its source. Check the sources before relying on it.</p>
            </div>
          );
        })()}

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
            {datedActivity.length === 0 && <p className="ws-sub" style={{ paddingTop: 12 }}>{activities.length > 0 ? `${activities.length} item${activities.length === 1 ? '' : 's'}, dates not stated — see the Activity tab.` : 'No activity found in the results.'}</p>}
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
