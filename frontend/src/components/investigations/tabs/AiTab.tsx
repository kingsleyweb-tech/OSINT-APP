import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Loader2, RotateCw, X } from 'lucide-react';
import type {
  AIAnalysis, AIConfidence, AIField, AIFinding, AIRelationship, AISource, AITimelineEvent, AssociationCategory, IntelligenceAssociation, Investigation
} from '../../../types/investigation';
import { fetchAiStatus, getAiRun, startAiAnalysis, subscribeAiRun, type AiRun, type AiStatus } from '../../../lib/aiClient';
import { AI_CONFIDENCE_RULE, AI_FIELD_LABEL, aiTone, reviewedAnalysis } from '../../../lib/aiReview';
import { fmtDate, newAuditEvent, openUrl, shortUrl } from '../../../lib/workspace';
import { useConfirm } from '../../ui/ConfirmModal';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Chips, Empty, SectionHead } from '../workspace/ui';

const EMPTY_VALUE = /^(not\b|unknown|n\/a|none|-+$)/i;
const hasValue = (v?: string) => Boolean(v && v.trim() && !EMPTY_VALUE.test(v.trim()));
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const KIND_LABEL: Record<string, string> = {
  profile: 'profiles', web: 'web pages', news: 'news articles', activity: 'activities', association: 'associations', 'org-fact': 'knowledge-panel facts',
  'org-claim': 'organisation source facts', location: 'location references', contact: 'contact references', image: 'image pages', website: 'website pages'
};

/** Where an accepted finding goes in the case (fields that have no place in the case stay accepted AI findings). */
function targetOf(inv: Investigation, f: AIFinding): { kind: 'profile'; key: 'occupation' | 'location'; label: string } | { kind: 'association'; category: AssociationCategory } | { kind: 'interest' } | null {
  const org = inv.entityKind === 'organization';
  if (!org && (f.field === 'occupation' || f.field === 'role')) return { kind: 'profile', key: 'occupation', label: 'Occupation' };
  if (org && f.field === 'industry') return { kind: 'profile', key: 'occupation', label: 'Type' };
  if ((!org && f.field === 'location') || (org && f.field === 'headquarters')) return { kind: 'profile', key: 'location', label: org ? 'Headquarters' : 'Location' };
  if (f.field === 'employer') return { kind: 'association', category: 'Companies' };
  if (f.field === 'organization') return { kind: 'association', category: 'Organizations' };
  if (f.field === 'membership') return { kind: 'association', category: 'Community' };
  if (f.field === 'education') return { kind: 'association', category: 'Education' };
  if (f.field === 'leadership') return { kind: 'association', category: 'Professional' };
  if (f.field === 'interest') return { kind: 'interest' };
  return null;
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

const Sources: React.FC<{ sources: AISource[] }> = ({ sources }) => (
  <div className="ws-ai-sources">
    {sources.map((s, i) => (
      <div key={`${s.evidenceId}-${i}`} className="ws-ai-source">
        <div className="ws-quote">“{s.quote}”</div>
        <div className="ws-sub">
          {s.source}
          {s.url ? <> · <button type="button" className="ws-url" onClick={() => openUrl(s.url)}>{shortUrl(s.url)}</button></> : ' · from the case record'}
        </div>
      </div>
    ))}
  </div>
);

type Filter = 'pending' | 'accepted' | 'ignored' | 'all';

export const AiTab: React.FC = () => {
  const { inv, commit, readOnly } = useWorkspace();
  const confirm = useConfirm();
  const [status, setStatus] = useState<AiStatus | null | undefined>(undefined);
  const [run, setRun] = useState<AiRun | undefined>(() => getAiRun(inv.id));
  const [filter, setFilter] = useState<Filter>('pending');
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => subscribeAiRun(inv.id, setRun), [inv.id]);
  useEffect(() => {
    if (readOnly) return;
    let live = true;
    fetchAiStatus().then(s => { if (live) setStatus(s); });
    return () => { live = false; };
  }, [readOnly, run?.status]);

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

  const runAnalysis = () => {
    if (running || readOnly) return;
    commit(i => i, [newAuditEvent({ action: 'AI analysis started', object: inv.name, detail: 'Analysis of the evidence already in this case (no new searches)', group: 'Investigation', kind: 'investigator' })]);
    startAiAnalysis(inv);
  };

  const toggle = (id: string) => setOpen(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const setReview = (id: string, state: 'accepted' | 'ignored', mutate: (i: Investigation) => Investigation, action: string, object: string, detail: string) => commit(
    i => mutate({ ...i, aiReview: { ...(i.aiReview || {}), [id]: state } }),
    [newAuditEvent({ action, object, detail, group: 'Results', kind: state === 'ignored' ? 'removal' : 'investigator' })]
  );
  const ignore = (id: string, object: string, detail: string) => setReview(id, 'ignored', i => i, 'AI finding ignored', object, detail);

  const acceptFinding = async (f: AIFinding) => {
    const target = targetOf(inv, f);
    const label = AI_FIELD_LABEL[f.field];
    const detail = `${label}: ${f.value} · ${f.confidence} · ${f.siteCount} source${f.siteCount === 1 ? '' : 's'}`;
    if (target?.kind === 'profile') {
      const current = inv.targetProfile?.[target.key];
      if (hasValue(current) && !same(current, f.value)) {
        const ok = await confirm({
          title: `Replace ${target.label.toLowerCase()}?`,
          message: `The case already says “${current}”. Replace it with “${f.value}” (${f.confidence}, ${f.siteCount} source${f.siteCount === 1 ? '' : 's'})? The old value is kept in the audit log.`,
          confirmLabel: 'Replace'
        });
        if (!ok) return;
      }
      setReview(f.id, 'accepted', i => ({ ...i, targetProfile: { ...i.targetProfile, [target.key]: f.value } }), 'AI finding accepted', f.value,
        `${detail} · ${target.label} set${hasValue(current) ? ` (was “${current}”)` : ''}`);
    } else if (target?.kind === 'association') {
      const exists = (inv.associations || []).some(a => same(a.name, f.value));
      setReview(f.id, 'accepted', i => exists ? i : { ...i, associations: [...(i.associations || []), aiAssociation(f.id, f.value, target.category, label, f.confidence, f.sources[0])] },
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
        id: `ai-${t.id}`, relation: 'subject', title: t.event, briefReport: `“${s.quote}” (AI-extracted, ${t.confidence})`, date: t.date,
        category: 'Event', sourceName: s.source, sourceUrl: s.url, foundAt: analysis?.runAt
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

  const actions = (id: string, onAccept: () => void, object: string, detail: string) => {
    if (readOnly) return null;
    const s = stateOf(id);
    return (
      <div className="ws-ai-actions">
        {s === 'accepted' ? <span className="ws-level validated"><Check size={13} /> Accepted</span> : (
          <button type="button" className="ws-btn ws-btn-sm" onClick={onAccept}><Check size={14} /> Accept</button>
        )}
        {s === 'ignored' ? <span className="ws-level raw">Ignored</span> : s !== 'accepted' && (
          <button type="button" className="ws-btn ws-btn-sm ws-btn-ghost" onClick={() => ignore(id, object, detail)}><X size={14} /> Ignore</button>
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
        <button type="button" className="ws-btn ws-btn-primary" onClick={runAnalysis} disabled={running || status?.configured === false}>
          {running ? <Loader2 size={16} className="spinning" /> : <RotateCw size={16} />} {running ? 'Analysing…' : inv.aiAnalysis ? 'Re-run AI Analysis' : 'Run AI Analysis'}
        </button>
      )} />
      <p className="ws-sub ws-ai-intro">
        {readOnly
          ? 'The investigator’s reviewed AI findings. Each one quotes the public source it comes from.'
          : 'Reads the evidence already in this case — no new searches — and lists what it states about the subject. Every item quotes its source, and anything the evidence does not support is discarded. Nothing is added to the case until you accept it.'}
      </p>
      {analysis && (
        <p className="ws-sub">
          Last analysed {fmtDate(analysis.runAt, true)} · {analysis.model}
          {!readOnly && status ? ` · ${status.usedToday} of ${status.dailyLimit} analyses used today` : ''}
        </p>
      )}
      {running && <div className="ws-ai-note">Analysing the case’s evidence… this usually takes 15–60 seconds. You can keep working in the other tabs.</div>}
      {run?.status === 'error' && !running && <div className="ws-ai-note warn">{run.error}</div>}
      {!readOnly && status === null && <div className="ws-ai-note warn">The AI service could not be reached. The rest of the case works as usual.</div>}
      {!readOnly && status?.configured === false && <div className="ws-ai-note warn">AI analysis is not set up on the server yet (Gemini key missing). The rest of the case works as usual.</div>}
    </div>
  );

  if (!analysis) {
    return (
      <div>
        {header}
        {!running && <Empty title={readOnly ? 'No reviewed AI findings' : 'No AI analysis yet'}>
          {readOnly ? 'The investigator has not shared any AI findings for this case.' : 'Press “Run AI Analysis” to scan the profiles, web and news results, activity and other evidence saved in this case.'}
        </Empty>}
      </div>
    );
  }

  const m = analysis.metrics;
  const findings = shown(analysis.findings);
  const byField = new Map<AIField, AIFinding[]>();
  findings.forEach(f => byField.set(f.field, [...(byField.get(f.field) || []), f]));
  const timeline = shown(analysis.timeline);
  const relationships = shown(analysis.relationships);
  const conflicts = analysis.comparisons.filter(c => c.status === 'conflict');
  const consistent = analysis.comparisons.filter(c => c.status === 'consistent');
  const tick = (on: boolean, text: string) => <div className={`ws-check${on ? '' : ' off'}`}><Check size={16} /> {text}</div>;

  return (
    <div>
      {header}

      <div className="ws-ai-grid">
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
          <SectionHead title="Analysis status" noRule />
          {tick(true, `${m.evidenceReviewed} evidence item${m.evidenceReviewed === 1 ? '' : 's'} reviewed${m.byKind.length ? ` (${m.byKind.map(k => `${k.count} ${KIND_LABEL[k.kind] || k.kind}`).join(', ')})` : ''}`)}
          {tick(m.findings > 0, `${m.findings} finding${m.findings === 1 ? '' : 's'} extracted, ${m.newInformation} not yet in the case`)}
          {tick(m.timeline > 0, `${m.timeline} dated event${m.timeline === 1 ? '' : 's'}`)}
          {tick(m.relationships > 0, `${m.relationships} relationship${m.relationships === 1 ? '' : 's'} stated by a source`)}
          {tick(m.consistent > 0, `${m.consistent} fact${m.consistent === 1 ? '' : 's'} confirmed by more than one site`)}
          {tick(m.conflicts > 0, `${m.conflicts} source conflict${m.conflicts === 1 ? '' : 's'}`)}
          {!readOnly && tick(m.discarded > 0, `${m.discarded} AI statement${m.discarded === 1 ? '' : 's'} discarded (not supported by the evidence)`)}
        </div>
      </div>

      <div className="ws-section">
        <SectionHead title="Potentially missing information" noRule right={<span className="ws-sub">Compared with what the case already holds</span>} />
        <div className="ws-table-wrap">
          <table className="ws-table">
            <tbody>
              {analysis.missing.map(x => (
                <tr key={x.field}>
                  <td className="ws-cell-title" style={{ width: '34%' }}>{x.label}</td>
                  <td className={x.status === 'not_found' ? 'ws-cell-muted' : ''}>
                    {x.status === 'in_case' ? <>In the case: {x.caseValue}</>
                      : x.status === 'found' ? <>Found in {x.foundIn} source{x.foundIn === 1 ? '' : 's'} — {analysis.findings.filter(f => x.findingIds.includes(f.id)).map(f => f.value).slice(0, 3).join(', ')}</>
                      : 'Not found'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!readOnly && (
        <Chips value={filter} onChange={k => setFilter(k as Filter)} options={[
          { key: 'pending', label: 'To review', count: counts.pending }, { key: 'accepted', label: 'Accepted', count: counts.accepted },
          { key: 'ignored', label: 'Ignored', count: counts.ignored }, { key: 'all', label: 'All', count: counts.all }
        ]} />
      )}

      <div className="ws-section" style={{ marginTop: 18 }}>
        <SectionHead title="Findings" count={findings.length} noRule />
        {findings.length === 0 ? <Empty title={readOnly ? 'No accepted findings' : 'Nothing here'}>{analysis.findings.length ? 'Change the filter above to see the other findings.' : 'Not enough evidence: the AI found no supported facts in this case.'}</Empty> : (
          Array.from(byField.entries()).map(([field, list]) => (
            <div key={field} className="ws-ai-group">
              <div className="ws-label">{AI_FIELD_LABEL[field]}</div>
              {list.map(f => (
                <div key={f.id} className={`ws-ai-item${stateOf(f.id) === 'ignored' ? ' ignored' : ''}`}>
                  <div className="ws-ai-item-head">
                    <div>
                      <div className="ws-cell-title">{f.value}</div>
                      <div className="ws-ai-meta">
                        <Confidence c={f.confidence} />
                        <span className="ws-sub">{f.siteCount} source{f.siteCount === 1 ? '' : 's'}</span>
                        <span className="ws-sub">{f.inCase === 'new' ? 'Not yet in the case' : f.inCase === 'same' ? 'Already in the case' : `Case says: ${f.existing}`}</span>
                      </div>
                    </div>
                    {actions(f.id, () => acceptFinding(f), f.value, `${AI_FIELD_LABEL[f.field]}: ${f.value} · ${f.confidence}`)}
                  </div>
                  <Sources sources={f.sources} />
                  {why(f.id, f.why, f.confidence, f.siteCount)}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="ws-section">
        <SectionHead title="Timeline" count={timeline.length} noRule right={<span className="ws-sub">Only dates written in the sources</span>} />
        {timeline.length === 0 ? <Empty title="No dated events">{analysis.timeline.length ? 'Change the filter above to see the other events.' : 'No source states a date for an event involving the subject.'}</Empty> : timeline.map(t => (
          <div key={t.id} className={`ws-ai-item${stateOf(t.id) === 'ignored' ? ' ignored' : ''}`}>
            <div className="ws-ai-item-head">
              <div>
                <div className="ws-row-cat">{t.date}</div>
                <div className="ws-cell-title">{t.event}</div>
                <div className="ws-ai-meta"><Confidence c={t.confidence} /><span className="ws-sub">{t.siteCount} source{t.siteCount === 1 ? '' : 's'}</span></div>
              </div>
              {actions(t.id, () => acceptEvent(t), t.event, `Timeline · ${t.date}`)}
            </div>
            <Sources sources={t.sources} />
          </div>
        ))}
      </div>

      <div className="ws-section">
        <SectionHead title="Relationships" count={relationships.length} noRule right={<span className="ws-sub">Only when a source states how they are related</span>} />
        {relationships.length === 0 ? <Empty title="No relationships">{analysis.relationships.length ? 'Change the filter above to see the other relationships.' : 'No source states a relationship (appearing on the same page is not counted).'}</Empty> : relationships.map(r => (
          <div key={r.id} className={`ws-ai-item${stateOf(r.id) === 'ignored' ? ' ignored' : ''}`}>
            <div className="ws-ai-item-head">
              <div>
                <div className="ws-cell-title">{r.from} <span className="ws-sub">— {r.relation} →</span> {r.to}</div>
                <div className="ws-ai-meta"><Confidence c={r.confidence} /><span className="ws-sub">{r.toType}</span><span className="ws-sub">{r.siteCount} source{r.siteCount === 1 ? '' : 's'}</span></div>
              </div>
              {actions(r.id, () => acceptRelationship(r), `${r.from} → ${r.to}`, `Relationship · ${r.relation}`)}
            </div>
            <Sources sources={r.sources} />
          </div>
        ))}
      </div>

      <div className="ws-section">
        <SectionHead title="Source comparison" count={conflicts.length + consistent.length} noRule />
        {conflicts.length + consistent.length === 0 ? <Empty title="Nothing to compare">No fact was stated by more than one site.</Empty> : (
          <>
            {conflicts.map(c => (
              <div key={c.id} className="ws-ai-item">
                <div className="ws-ai-meta"><span className="ws-level finding">Conflicting information</span><span className="ws-cell-title">{AI_FIELD_LABEL[c.field]}</span></div>
                <p className="ws-sub">The sources disagree. The system does not choose which one is right — read them before relying on either.</p>
                {c.values.map((v, i) => (
                  <div key={i} className="ws-ai-conflict"><div className="ws-cell-title">{v.value}</div><Sources sources={v.sources} /></div>
                ))}
              </div>
            ))}
            {consistent.map(c => (
              <div key={c.id} className="ws-ai-item">
                <div className="ws-ai-meta">
                  <span className="ws-level validated">Consistent</span>
                  <span className="ws-cell-title">{AI_FIELD_LABEL[c.field]}: {c.values[0].value}</span>
                  <span className="ws-sub">{new Set(c.values[0].sources.map(s => s.source)).size} sources agree</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <p className="ws-sub ws-ai-intro">
        Confidence is set by fixed rules, not by the AI: {(Object.keys(AI_CONFIDENCE_RULE) as AIConfidence[]).map(c => `${c} — ${AI_CONFIDENCE_RULE[c]}`).join('; ')}.
        AI output is a lead to check, not proof.
      </p>
    </div>
  );
};
