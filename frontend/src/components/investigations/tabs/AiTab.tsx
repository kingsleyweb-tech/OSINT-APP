import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Loader2, RotateCw, Search, Undo2, X } from 'lucide-react';
import type {
  AIAnalysis, AIConfidence, AIField, AIFinding, AIRelationship, AISource, AITimelineEvent, AssociationCategory, IntelligenceAssociation, Investigation, OrgClaim, OrgField
} from '../../../types/investigation';
import { fetchAiStatus, getAiRun, runAiResearch, startAiAnalysis, subscribeAiRun, type AiRun, type AiStatus } from '../../../lib/aiClient';
import { AI_CONFIDENCE_RULE, AI_EVENT_LABEL, AI_FIELD_LABEL, AI_TIER_LABEL, AI_TIER_ORDER, aiTone, reviewedAnalysis } from '../../../lib/aiReview';
import { orgProfile } from '../../../lib/organizationProfile';
import { fmtDate, newAuditEvent, openUrl, shortUrl } from '../../../lib/workspace';
import { useConfirm } from '../../ui/ConfirmModal';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Chips, Empty, SectionHead } from '../workspace/ui';

const EMPTY_VALUE = /^(not\b|unknown|n\/a|none|-+$)/i;
const hasValue = (v?: string) => Boolean(v && v.trim() && !EMPTY_VALUE.test(v.trim()));
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const KIND_LABEL: Record<string, string> = {
  profile: 'profiles', web: 'web pages', news: 'news articles', activity: 'activities', association: 'associations', 'org-fact': 'knowledge-panel / Wikidata facts',
  'org-claim': 'organisation source facts', location: 'location references', contact: 'contact references', image: 'image pages', website: 'official website pages',
  listing: 'business listings', research: 'targeted search results'
};

/** How findings are grouped on the page (locations have their own section). */
const CATEGORIES: Array<[string, AIField[]]> = [
  ['Identity', ['official_name', 'alias', 'entity_type', 'industry', 'sector', 'description', 'mission', 'legal_status', 'founded', 'employees', 'nationality', 'date_of_birth', 'language']],
  ['Work & education', ['occupation', 'role', 'employer', 'organization', 'membership', 'education', 'skill', 'interest']],
  ['Leadership & people', ['leadership']],
  ['Structure', ['parent', 'subsidiary', 'unit', 'affiliate']],
  ['Products, services & programmes', ['product', 'service', 'program', 'project']],
  ['Website & online presence', ['website', 'social_profile']],
  ['Contact', ['contact']],
  ['Other', ['other']]
];
const LOCATION_FIELDS: AIField[] = ['headquarters', 'location'];

/** Organisation tab field for an AI field (accepted findings become sourced facts there). */
const ORG_FIELD: Partial<Record<AIField, OrgField>> = {
  official_name: 'official_name', alias: 'alt_name', entity_type: 'type', industry: 'industry', sector: 'sector', description: 'description',
  mission: 'mission', legal_status: 'legal_status', founded: 'founded', headquarters: 'headquarters', location: 'address', product: 'product',
  service: 'service', program: 'program', project: 'project', leadership: 'person', website: 'website', social_profile: 'social',
  parent: 'parent', subsidiary: 'subsidiary', unit: 'unit', affiliate: 'affiliate', employees: 'employees'
};
/** Fields where the Organisation tab expects one answer: a different accepted value shows there as a conflict. */
const ORG_SINGLE: OrgField[] = ['official_name', 'type', 'founded', 'headquarters', 'website', 'parent', 'legal_status'];

/** Where an accepted person finding goes in the case (fields that have no place in the case stay accepted AI findings). */
function targetOf(f: AIFinding): { kind: 'profile'; key: 'occupation' | 'location'; label: string } | { kind: 'association'; category: AssociationCategory } | { kind: 'interest' } | null {
  if (f.field === 'occupation' || f.field === 'role') return { kind: 'profile', key: 'occupation', label: 'Occupation' };
  if (f.field === 'location') return { kind: 'profile', key: 'location', label: 'Location' };
  if (f.field === 'employer') return { kind: 'association', category: 'Companies' };
  if (f.field === 'organization') return { kind: 'association', category: 'Organizations' };
  if (f.field === 'membership') return { kind: 'association', category: 'Community' };
  if (f.field === 'education') return { kind: 'association', category: 'Education' };
  if (f.field === 'leadership') return { kind: 'association', category: 'Professional' };
  if (f.field === 'interest') return { kind: 'interest' };
  return null;
}

/** One organisation fact per source of an accepted finding, each with the source's own words. */
function orgClaimsOf(f: AIFinding): OrgClaim[] {
  let field = ORG_FIELD[f.field];
  if (f.field === 'contact') field = /@/.test(f.value) ? 'email' : /\d{6,}/.test(f.value.replace(/\D/g, '')) ? 'phone' : undefined;
  if (!field) return [];
  // Role: the leader's role, the location's type, the account's platform.
  const role = f.field === 'social_profile' ? f.detail?.split(' · ')[0] : ['leadership', 'location'].includes(f.field) ? f.detail : undefined;
  return f.sources.map(s => ({
    field: field!, value: f.value, ...(role ? { role } : {}), source: `${s.source} (AI-read, accepted)`, sourceKind: 'ai',
    ...(s.url ? { sourceUrl: s.url } : {}), quote: s.quote
  }));
}

const evidenceState = (c: AIConfidence): IntelligenceAssociation['evidenceState'] =>
  c === 'Verified' || c === 'Strong evidence' ? 'Strong evidence' : c === 'Possible' ? 'Possible association' : 'Mention only';

function aiAssociation(id: string, name: string, category: AssociationCategory, relationship: string, c: AIConfidence, s: AISource): IntelligenceAssociation {
  return {
    id: `ai-${id}`, name, category, relationship, evidenceState: evidenceState(c),
    evidenceCitation: `“${s.quote}” (AI-extracted from ${s.source}, ${c})`, sourceUrl: s.url || undefined, sourceName: s.source
  };
}

const Confidence: React.FC<{ c: AIConfidence }> = ({ c }) => <span className={`ws-level ${aiTone(c)}`} title={`${c}: ${AI_CONFIDENCE_RULE[c]}`}>{c}</span>;

/** The sources of an item: the two strongest shown, the rest behind "more". */
const Sources: React.FC<{ sources: AISource[] }> = ({ sources }) => {
  const [all, setAll] = useState(false);
  const list = all ? sources : sources.slice(0, 2);
  return (
    <div className="ws-ai-sources">
      {list.map((s, i) => (
        <div key={`${s.evidenceId}-${i}`} className="ws-ai-source">
          <div className="ws-quote">“{s.quote}”</div>
          <div className="ws-sub">
            {s.tier && <span className="ws-ai-tier">{AI_TIER_LABEL[s.tier]}</span>}
            {s.source}{s.date ? ` · ${s.date}` : ''}
            {s.url ? <> · <button type="button" className="ws-url" onClick={() => openUrl(s.url)}>{shortUrl(s.url)}</button></> : ' · from the case record'}
          </div>
        </div>
      ))}
      {sources.length > 2 && (
        <button type="button" className="ws-ai-why" onClick={() => setAll(v => !v)}>
          {all ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {all ? 'Show fewer sources' : `Show ${sources.length - 2} more source${sources.length - 2 === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  );
};

type Filter = 'pending' | 'accepted' | 'ignored' | 'all';

export const AiTab: React.FC = () => {
  const { inv, commit, readOnly } = useWorkspace();
  const confirm = useConfirm();
  const [status, setStatus] = useState<AiStatus | null | undefined>(undefined);
  const [run, setRun] = useState<AiRun | undefined>(() => getAiRun(inv.id));
  const [filter, setFilter] = useState<Filter>('pending');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<AIField>>(new Set());
  const [wantNews, setWantNews] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchMsg, setResearchMsg] = useState<{ text: string; warn?: boolean } | null>(null);
  const isOrg = inv.entityKind === 'organization';

  useEffect(() => subscribeAiRun(inv.id, setRun), [inv.id]);
  useEffect(() => {
    if (readOnly) return;
    let live = true;
    fetchAiStatus().then(s => { if (live) setStatus(s); });
    return () => { live = false; };
  }, [readOnly, run?.status, researching]);

  // A view-only visitor sees only what the investigator accepted.
  const analysis: AIAnalysis | null = readOnly ? reviewedAnalysis(inv) : inv.aiAnalysis || null;
  const review = useMemo(() => inv.aiReview || {}, [inv.aiReview]);
  const stateOf = (id: string) => review[id];
  const shown = <T extends { id: string }>(items: T[]) => items.filter(x =>
    readOnly || filter === 'all' || (filter === 'pending' ? !stateOf(x.id) : stateOf(x.id) === filter));
  const running = run?.status === 'running';

  const counts = useMemo(() => {
    const all = analysis ? [...analysis.findings, ...analysis.timeline, ...analysis.relationships] : [];
    return {
      pending: all.filter(x => !review[x.id]).length, accepted: all.filter(x => review[x.id] === 'accepted').length,
      ignored: all.filter(x => review[x.id] === 'ignored').length, all: all.length
    };
  }, [analysis, review]);

  const runAnalysis = (next: Investigation = inv) => {
    if (running || readOnly) return;
    commit(i => i, [newAuditEvent({ action: 'AI analysis started', object: inv.name, detail: 'Analysis of the evidence already in this case', group: 'Investigation', kind: 'investigator' })]);
    startAiAnalysis(next);
  };

  const toggle = (id: string) => setOpen(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const setReview = (id: string, state: 'accepted' | 'ignored', mutate: (i: Investigation) => Investigation, action: string, object: string, detail: string) => commit(
    i => mutate({ ...i, aiReview: { ...(i.aiReview || {}), [id]: state } }),
    [newAuditEvent({ action, object, detail, group: 'Results', kind: state === 'ignored' ? 'removal' : 'investigator' })]
  );
  const ignore = (id: string, object: string, detail: string) => setReview(id, 'ignored', i => i, 'AI finding ignored', object, detail);
  const undoIgnore = (id: string, object: string) => commit(i => {
    const next = { ...(i.aiReview || {}) };
    delete next[id];
    return { ...i, aiReview: next };
  }, [newAuditEvent({ action: 'AI finding restored', object, detail: 'Ignored finding returned to review', group: 'Results', kind: 'investigator' })]);

  const acceptOrgFinding = async (f: AIFinding, detail: string) => {
    const claims = orgClaimsOf(f);
    if (!claims.length) { setReview(f.id, 'accepted', i => i, 'AI finding accepted', f.value, detail); return; }
    const field = claims[0].field;
    // A one-answer field that already shows another value: the new one is added beside it as a conflict to review.
    const current = orgProfile(inv).facts[field]?.[0];
    if (ORG_SINGLE.includes(field) && current && !same(current.value, f.value) && !current.value.toLowerCase().includes(f.value.toLowerCase())) {
      const ok = await confirm({
        title: `Add a second ${AI_FIELD_LABEL[f.field].toLowerCase()}?`,
        message: `The Organisation tab shows “${current.value}” (${plural(current.independent, 'source')}). “${f.value}” will be added beside it, with its source, and shown as a conflict for you to resolve. Nothing is overwritten.`,
        confirmLabel: 'Add as conflicting value'
      });
      if (!ok) return;
    }
    const key = (c: OrgClaim) => `${c.field}|${c.value.toLowerCase()}|${c.sourceUrl || c.source}`;
    setReview(f.id, 'accepted', i => {
      const have = new Set((i.aiClaims || []).map(key));
      const add = claims.filter(c => !have.has(key(c)));
      const next = add.length ? { ...i, aiClaims: [...(i.aiClaims || []), ...add] } : i;
      // The case header's location stays as it was unless it was empty.
      return f.field === 'headquarters' && !hasValue(i.targetProfile?.location) ? { ...next, targetProfile: { ...next.targetProfile, location: f.value } } : next;
    }, 'AI finding accepted', f.value, `${detail} · added to the Organisation tab (${claims.length} source${claims.length === 1 ? '' : 's'} kept)`);
  };

  const acceptFinding = async (f: AIFinding) => {
    const label = AI_FIELD_LABEL[f.field];
    const detail = `${label}: ${f.value}${f.detail ? ` (${f.detail})` : ''} · ${f.confidence} · ${plural(f.siteCount, 'source')}`;
    if (isOrg) { await acceptOrgFinding(f, detail); return; }
    const target = targetOf(f);
    if (target?.kind === 'profile') {
      const current = inv.targetProfile?.[target.key];
      if (hasValue(current) && !same(current, f.value)) {
        const ok = await confirm({
          title: `Replace ${target.label.toLowerCase()}?`,
          message: `The case already says “${current}”. Replace it with “${f.value}” (${f.confidence}, ${plural(f.siteCount, 'source')})? The old value is kept in the audit log.`,
          confirmLabel: 'Replace'
        });
        if (!ok) return;
      }
      setReview(f.id, 'accepted', i => ({ ...i, targetProfile: { ...i.targetProfile, [target.key]: f.value } }), 'AI finding accepted', f.value,
        `${detail} · ${target.label} set${hasValue(current) ? ` (was “${current}”)` : ''}`);
    } else if (target?.kind === 'association') {
      const exists = (inv.associations || []).some(a => same(a.name, f.value));
      setReview(f.id, 'accepted', i => exists ? i : { ...i, associations: [...(i.associations || []), aiAssociation(f.id, f.value, target.category, f.detail || label, f.confidence, f.sources[0])] },
        'AI finding accepted', f.value, `${detail}${exists ? ' · already in Associations' : ' · added to Associations'}`);
    } else if (target?.kind === 'interest') {
      setReview(f.id, 'accepted', i => ({ ...i, targetProfile: { ...i.targetProfile, interests: Array.from(new Set([...(i.targetProfile?.interests || []), f.value])) } }),
        'AI finding accepted', f.value, `${detail} · added to interests`);
    } else {
      setReview(f.id, 'accepted', i => i, 'AI finding accepted', f.value, detail);
    }
  };

  const acceptEvent = (t: AITimelineEvent) => {
    const s = t.sources[0];
    setReview(t.id, 'accepted', i => (i.activities || []).some(a => a.id === `ai-${t.id}`) ? i : {
      ...i,
      activities: [...(i.activities || []), {
        id: `ai-${t.id}`, relation: 'subject', title: t.event, date: t.date,
        briefReport: `${t.kind && t.kind !== 'other' ? `${AI_EVENT_LABEL[t.kind]}. ` : ''}“${s.quote}” (AI-extracted, ${t.confidence})`,
        category: !t.kind || t.kind === 'event' || t.kind === 'other' ? 'Event' : t.kind === 'statement' ? 'News Mention' : isOrg ? 'Organization Activity' : 'Professional',
        sourceName: s.source, sourceUrl: s.url, foundAt: analysis?.runAt
      }]
    }, 'AI finding accepted', t.event, `Timeline · ${t.date} · ${t.confidence} · added to Activity`);
  };

  const acceptRelationship = (r: AIRelationship) => {
    const aboutSubject = analysis && (same(r.from, analysis.subject) || analysis.subject.toLowerCase().includes(r.from.toLowerCase()) || r.from.toLowerCase().includes(analysis.subject.toLowerCase()));
    const category: AssociationCategory = r.toType === 'organization' ? 'Organizations' : r.toType === 'group' ? 'Community' : 'Other';
    const exists = (inv.associations || []).some(a => same(a.name, r.to));
    const add = aboutSubject && !exists;
    setReview(r.id, 'accepted', i => add ? { ...i, associations: [...(i.associations || []), aiAssociation(r.id, r.to, category, r.relation, r.confidence, r.sources[0])] } : i,
      'AI finding accepted', `${r.from} → ${r.to}`, `Relationship · ${r.relation} · ${r.confidence}${add ? ' · added to Associations' : ''}`);
  };

  // ── Targeted searches for missing fields ──
  const steps = analysis?.research || [];
  const chosenSteps = steps.filter(s => (s.fields.length ? s.fields.some(f => picked.has(f)) : wantNews)).slice(0, 4);
  const researchLeft = status?.researchLimit != null ? status.researchLimit - (status.researchUsedToday || 0) : undefined;
  const runResearch = async () => {
    if (!chosenSteps.length || researching || running || readOnly) return;
    setResearching(true);
    setResearchMsg(null);
    try {
      const { research, run: r } = await runAiResearch(inv, Array.from(picked), wantNews);
      const kept = r.steps.reduce((n, s) => n + s.kept, 0);
      const failed = r.steps.filter(s => s.status === 'failed');
      commit(i => ({ ...i, aiResearch: research }), [newAuditEvent({
        action: 'Missing-information searches run', object: inv.name,
        detail: r.steps.map(s => `${s.label}: ${s.status === 'failed' ? `failed (${s.error || 'error'})` : `${s.kept} of ${s.results} results name the subject${s.fromCache ? ', cached' : ''}`}`).join(' · '),
        group: 'Investigation', kind: 'investigator'
      })]);
      setPicked(new Set());
      setWantNews(false);
      if (kept) {
        setResearchMsg({ text: `${plural(kept, 'new result')} that name the subject were saved as evidence. Re-analysing the case with them…${failed.length ? ` (${plural(failed.length, 'search')} failed)` : ''}` });
        startAiAnalysis({ ...inv, aiResearch: research });
      } else {
        setResearchMsg({ text: failed.length === r.steps.length ? `The searches failed: ${failed[0]?.error || 'search service error'}. The case is unchanged.` : 'No new result names the subject. Those fields stay “Not found in available sources”.', warn: true });
      }
    } catch (e) {
      setResearchMsg({ text: (e as Error).message, warn: true });
    }
    setResearching(false);
  };

  const actions = (id: string, onAccept: () => void, object: string, detail: string) => {
    if (readOnly) return null;
    const s = stateOf(id);
    return (
      <div className="ws-ai-actions">
        {s === 'accepted' ? <span className="ws-level validated"><Check size={13} /> Accepted</span> : s === 'ignored' ? (
          <>
            <span className="ws-level raw">Ignored</span>
            <button type="button" className="ws-btn ws-btn-sm ws-btn-ghost" onClick={() => undoIgnore(id, object)}><Undo2 size={14} /> Undo</button>
          </>
        ) : (
          <>
            <button type="button" className="ws-btn ws-btn-sm" onClick={onAccept}><Check size={14} /> Accept</button>
            <button type="button" className="ws-btn ws-btn-sm ws-btn-ghost" onClick={() => ignore(id, object, detail)}><X size={14} /> Ignore</button>
          </>
        )}
      </div>
    );
  };

  const why = (id: string, text: string, c: AIConfidence, sites: number) => (
    <>
      <button type="button" className="ws-ai-why" onClick={() => toggle(id)} aria-expanded={open.has(id)}>
        {open.has(id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Why this finding?
      </button>
      {open.has(id) && (
        <p className="ws-sub ws-ai-why-text">
          {text} Confidence “{c}”: {AI_CONFIDENCE_RULE[c]} ({sites} independent site{sites === 1 ? '' : 's'} here).
        </p>
      )}
    </>
  );

  // ── Header / states ──
  const header = (
    <div className="ws-section">
      <SectionHead title="AI analysis" noRule right={!readOnly && (
        <button type="button" className="ws-btn ws-btn-primary" onClick={() => runAnalysis()} disabled={running || researching || status?.configured === false}>
          {running ? <Loader2 size={16} className="spinning" /> : <RotateCw size={16} />} {running ? 'Analysing…' : inv.aiAnalysis ? 'Re-run AI Analysis' : 'Run AI Analysis'}
        </button>
      )} />
      <p className="ws-sub ws-ai-intro">
        {readOnly
          ? 'The investigator’s reviewed AI findings. Each one quotes the public source it comes from.'
          : 'Reads the evidence already in this case and lists what it states about the subject. Every item quotes its source, and anything the evidence does not support is discarded. Nothing is added to the case until you accept it.'}
      </p>
      {analysis && (
        <p className="ws-sub">
          Last analysed {fmtDate(analysis.runAt, true)} · {analysis.model}
          {!readOnly && status ? ` · ${status.usedToday} of ${status.dailyLimit} analyses used today` : ''}
        </p>
      )}
      {running && <div className="ws-ai-note">Analysing the case’s evidence… this usually takes 15–90 seconds. You can keep working in the other tabs.</div>}
      {run?.status === 'error' && !running && <div className="ws-ai-note warn">{run.error}</div>}
      {!readOnly && status === null && <div className="ws-ai-note warn">The AI service could not be reached. The rest of the case works as usual.</div>}
      {!readOnly && status?.configured === false && <div className="ws-ai-note warn">AI analysis is not set up on the server yet (Gemini key missing). The rest of the case works as usual.</div>}
    </div>
  );

  if (!analysis) {
    return (
      <div className="ws-ai">
        {header}
        {!running && <Empty title={readOnly ? 'No reviewed AI findings' : 'No AI analysis yet'}>
          {readOnly ? 'The investigator has not shared any AI findings for this case.' : 'Press “Run AI Analysis” to read the profiles, web and news results, the official website, listings and other evidence saved in this case.'}
        </Empty>}
      </div>
    );
  }

  const m = analysis.metrics;
  const findings = shown(analysis.findings);
  const keyFindings = findings.filter(f => !LOCATION_FIELDS.includes(f.field));
  const locations = findings.filter(f => LOCATION_FIELDS.includes(f.field))
    .sort((a, b) => (a.field === 'headquarters' ? 0 : 1) - (b.field === 'headquarters' ? 0 : 1));
  const timeline = shown(analysis.timeline);
  const relationships = shown(analysis.relationships);
  const conflicts = analysis.comparisons.filter(c => c.status === 'conflict');
  const consistent = analysis.comparisons.filter(c => c.status === 'consistent');
  const notFound = analysis.missing.filter(x => x.status === 'not_found');
  const searchable = new Set(steps.flatMap(s => s.fields));
  const newsStep = steps.find(s => !s.fields.length);
  const coverage = [...(analysis.coverage || [])].sort((a, b) => AI_TIER_ORDER.indexOf(a.tier) - AI_TIER_ORDER.indexOf(b.tier));

  const findingCard = (f: AIFinding) => (
    <div key={f.id} className={`ws-ai-item${stateOf(f.id) === 'ignored' ? ' ignored' : ''}`}>
      <div className="ws-ai-item-head">
        <div className="ws-ai-item-main">
          {LOCATION_FIELDS.includes(f.field) && <div className="ws-row-cat">{f.field === 'headquarters' ? 'Headquarters' : f.detail || 'Location mentioned'}</div>}
          <div className="ws-ai-value">{f.value}</div>
          {f.detail && !LOCATION_FIELDS.includes(f.field) && <div className="ws-ai-detail">{f.detail}</div>}
          <div className="ws-ai-meta">
            <Confidence c={f.confidence} />
            <span className="ws-sub">{plural(f.siteCount, 'source')}</span>
            <span className="ws-sub">{f.inCase === 'new' ? 'Not yet in the case' : f.inCase === 'same' ? 'Already in the case' : `Case says: ${f.existing}`}</span>
            {f.asOf && <span className="ws-sub">Newest source: {f.asOf}</span>}
          </div>
          {f.derived && <div className="ws-sub ws-ai-derived">Classified from the sources’ words (not a direct quote) — check the quotes below.</div>}
          {f.field === 'leadership' && <div className="ws-sub ws-ai-derived">A role stated by a source{f.asOf ? ` dated ${f.asOf}` : ''} — check that it is still current.</div>}
        </div>
        {actions(f.id, () => acceptFinding(f), f.value, `${AI_FIELD_LABEL[f.field]}: ${f.value} · ${f.confidence}`)}
      </div>
      <Sources sources={f.sources} />
      {why(f.id, f.why, f.confidence, f.siteCount)}
    </div>
  );

  const stat = (n: number, label: string) => <div className="ws-ai-stat"><div className="ws-ai-stat-n">{n}</div><div className="ws-ai-stat-l">{label}</div></div>;

  return (
    <div className="ws-ai">
      {header}

      <div className="ws-section">
        <SectionHead title="Intelligence summary" noRule />
        <p className="ws-ai-summary">{analysis.summary.text}</p>
        {analysis.summary.sources.length > 0 && (
          <div className="ws-sub">Based on: {Array.from(new Map(analysis.summary.sources.map(s => [s.url || s.source, s])).values()).slice(0, 6).map((s, i) => (
            <React.Fragment key={i}>{i > 0 && ' · '}{s.url ? <button type="button" className="ws-url" onClick={() => openUrl(s.url)}>{s.source}</button> : s.source}</React.Fragment>
          ))}</div>
        )}
      </div>

      <div className="ws-section">
        <SectionHead title="Analysis statistics" noRule />
        <div className="ws-ai-stats">
          {stat(m.evidenceReviewed, 'evidence items reviewed')}
          {stat(m.findings, 'findings')}
          {stat(m.newInformation, 'not yet in the case')}
          {stat(notFound.length, 'fields not found')}
          {stat(m.conflicts, 'source conflicts')}
          {stat(m.timeline, 'dated events')}
          {stat(m.relationships, 'relationships')}
          {!readOnly && stat(counts.accepted, 'accepted')}
          {!readOnly && stat(counts.ignored, 'ignored')}
          {!readOnly && stat(m.discarded, 'AI statements discarded (unsupported)')}
        </div>
      </div>

      <div className="ws-section">
        <SectionHead title="Missing information" noRule right={<span className="ws-sub">Compared with what the case already shows</span>} />
        <div className="ws-table-wrap">
          <table className="ws-table">
            <tbody>
              {analysis.missing.map(x => (
                <tr key={x.field}>
                  <td className="ws-cell-title" style={{ width: '32%' }}>
                    {!readOnly && x.status === 'not_found' && searchable.has(x.field) ? (
                      <label className="ws-ai-pick">
                        <input type="checkbox" checked={picked.has(x.field)} onChange={() => setPicked(prev => { const n = new Set(prev); if (n.has(x.field)) n.delete(x.field); else n.add(x.field); return n; })} />
                        {x.label}
                      </label>
                    ) : x.label}
                  </td>
                  <td className={x.status === 'not_found' ? 'ws-cell-muted' : ''}>
                    {x.status === 'in_case' ? <>In the case: {(x.caseValue || '').split(' | ').slice(0, 3).join(', ')}</>
                      : x.status === 'found' ? <>Found in {plural(x.foundIn, 'source')} — {analysis.findings.filter(f => x.findingIds.includes(f.id)).map(f => f.value).slice(0, 3).join(', ')}</>
                        : 'Not found in available sources'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!readOnly && steps.length > 0 && (
          <div className="ws-ai-research">
            <p className="ws-sub">
              Tick fields above to search public sources for them. Each search is one query through the existing search provider, built from the subject’s name; only results that name the subject are kept, saved as evidence and re-analysed.
            </p>
            {newsStep && (
              <label className="ws-ai-pick"><input type="checkbox" checked={wantNews} onChange={() => setWantNews(v => !v)} /> Recent activities (news search — no dated events were found)</label>
            )}
            <div className="ws-ai-meta">
              <button type="button" className="ws-btn ws-btn-sm" disabled={!chosenSteps.length || researching || running || researchLeft === 0} onClick={runResearch}>
                {researching ? <Loader2 size={14} className="spinning" /> : <Search size={14} />} {researching ? 'Searching…' : `Search for missing information${chosenSteps.length ? ` (${plural(chosenSteps.length, 'search', 'searches')})` : ''}`}
              </button>
              {chosenSteps.length > 0 && <span className="ws-sub">{chosenSteps.map(s => s.label).join(' · ')}</span>}
              {researchLeft != null && <span className="ws-sub">{researchLeft} of {status?.researchLimit} search runs left today</span>}
            </div>
          </div>
        )}
        {researchMsg && <div className={`ws-ai-note${researchMsg.warn ? ' warn' : ''}`}>{researchMsg.text}</div>}
        {!readOnly && (inv.aiResearch?.results.length || 0) > 0 && (
          <p className="ws-sub">{plural(inv.aiResearch!.results.length, 'result')} from earlier missing-information searches are saved in this case as evidence.</p>
        )}
      </div>

      {!readOnly && (
        <Chips value={filter} onChange={k => setFilter(k as Filter)} options={[
          { key: 'pending', label: 'To review', count: counts.pending }, { key: 'accepted', label: 'Accepted', count: counts.accepted },
          { key: 'ignored', label: 'Ignored', count: counts.ignored }, { key: 'all', label: 'All', count: counts.all }
        ]} />
      )}

      <div className="ws-section" style={{ marginTop: 18 }}>
        <SectionHead title="Key findings" count={keyFindings.length} noRule />
        {keyFindings.length === 0 ? <Empty title={readOnly ? 'No accepted findings' : 'Nothing here'}>{analysis.findings.length ? 'Change the filter above to see the other findings.' : 'Not enough evidence: the AI found no supported facts in this case.'}</Empty> : (
          CATEGORIES.map(([cat, fields]) => {
            const list = keyFindings.filter(f => fields.includes(f.field));
            if (!list.length) return null;
            return (
              <div key={cat} className="ws-ai-group">
                <h4 className="ws-ai-cat">{cat}</h4>
                {fields.filter(fl => list.some(f => f.field === fl)).map(fl => (
                  <div key={fl} className="ws-ai-field">
                    <div className="ws-label">{AI_FIELD_LABEL[fl]}</div>
                    {list.filter(f => f.field === fl).map(findingCard)}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      <div className="ws-section">
        <SectionHead title="Location findings" count={locations.length} noRule right={<span className="ws-sub">An address is called headquarters only when a source says so</span>} />
        {locations.length === 0 ? <Empty title="No locations">{analysis.findings.some(f => LOCATION_FIELDS.includes(f.field)) ? 'Change the filter above to see the other locations.' : 'No source in the case states a location for the subject.'}</Empty> : locations.map(findingCard)}
      </div>

      <div className="ws-section">
        <SectionHead title="Timeline" count={timeline.length} noRule right={<span className="ws-sub">Only dates written in the sources</span>} />
        {timeline.length === 0 ? <Empty title="No dated events">{analysis.timeline.length ? 'Change the filter above to see the other events.' : 'No source states a date for an event involving the subject.'}</Empty> : timeline.map(t => (
          <div key={t.id} className={`ws-ai-item${stateOf(t.id) === 'ignored' ? ' ignored' : ''}`}>
            <div className="ws-ai-item-head">
              <div className="ws-ai-item-main">
                <div className="ws-row-cat">{t.date}{t.kind && t.kind !== 'other' ? ` · ${AI_EVENT_LABEL[t.kind]}` : ''}</div>
                <div className="ws-ai-value">{t.event}</div>
                <div className="ws-ai-meta"><Confidence c={t.confidence} /><span className="ws-sub">{plural(t.siteCount, 'source')}</span></div>
              </div>
              {actions(t.id, () => acceptEvent(t), t.event, `Timeline · ${t.date}`)}
            </div>
            <Sources sources={t.sources} />
          </div>
        ))}
      </div>

      <div className="ws-section">
        <SectionHead title="Associations & relationships" count={relationships.length} noRule right={<span className="ws-sub">Only when a source states how they are related</span>} />
        {relationships.length === 0 ? <Empty title="No relationships">{analysis.relationships.length ? 'Change the filter above to see the other relationships.' : 'No source states a relationship (appearing on the same page is not counted).'}</Empty> : relationships.map(r => (
          <div key={r.id} className={`ws-ai-item${stateOf(r.id) === 'ignored' ? ' ignored' : ''}`}>
            <div className="ws-ai-item-head">
              <div className="ws-ai-item-main">
                <div className="ws-ai-value">{r.from} <span className="ws-sub">— {r.relation} →</span> {r.to}</div>
                <div className="ws-ai-meta"><Confidence c={r.confidence} /><span className="ws-sub">{r.toType}</span><span className="ws-sub">{plural(r.siteCount, 'source')}</span></div>
              </div>
              {actions(r.id, () => acceptRelationship(r), `${r.from} → ${r.to}`, `Relationship · ${r.relation}`)}
            </div>
            <Sources sources={r.sources} />
          </div>
        ))}
      </div>

      <div className="ws-section">
        <SectionHead title="Source conflicts" count={conflicts.length} noRule />
        {conflicts.length === 0 ? <Empty title="No conflicts">No two sites give different answers for a one-answer field.</Empty> : conflicts.map(c => (
          <div key={c.id} className="ws-ai-item">
            <div className="ws-ai-meta"><span className="ws-level finding">Conflicting information</span><span className="ws-cell-title">{AI_FIELD_LABEL[c.field]}</span></div>
            <p className="ws-sub">The sources disagree. The system does not choose which one is right — read them before relying on either.</p>
            {c.values.map((v, i) => (
              <div key={i} className="ws-ai-conflict"><div className="ws-ai-value">{v.value}</div><Sources sources={v.sources} /></div>
            ))}
          </div>
        ))}
        {consistent.length > 0 && (
          <>
            <div className="ws-label" style={{ marginTop: 14 }}>Confirmed by more than one site</div>
            {consistent.map(c => (
              <div key={c.id} className="ws-ai-meta ws-ai-consistent">
                <span className="ws-level validated">Consistent</span>
                <span className="ws-cell-title">{AI_FIELD_LABEL[c.field]}: {c.values[0].value}</span>
                <span className="ws-sub">{new Set(c.values[0].sources.map(s => s.source)).size} sources agree</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="ws-section">
        <SectionHead title="Source coverage" noRule right={<span className="ws-sub">Strongest sources first</span>} />
        {coverage.length > 0 && (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <tbody>
                {coverage.map(c => (
                  <tr key={c.tier}>
                    <td className="ws-cell-title" style={{ width: '40%' }}>{AI_TIER_LABEL[c.tier]}</td>
                    <td>{plural(c.count, 'evidence item')} from {plural(c.sites, 'site')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {m.byKind.length > 0 && <p className="ws-sub">By kind: {m.byKind.map(k => `${k.count} ${KIND_LABEL[k.kind] || k.kind}`).join(', ')}.</p>}
      </div>

      <p className="ws-sub ws-ai-intro">
        Confidence is set by fixed rules, not by the AI: {(Object.keys(AI_CONFIDENCE_RULE) as AIConfidence[]).map(c => `${c} — ${AI_CONFIDENCE_RULE[c]}`).join('; ')}.
        AI output is a lead to check, not proof.
      </p>
    </div>
  );
};
