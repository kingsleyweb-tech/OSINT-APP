import React, { useState } from 'react';
import { Briefcase, Building2, GraduationCap, Landmark, Users } from 'lucide-react';
import type { IntelligenceAssociation } from '../../../types/investigation';
import { assocKey, levelOf, newAuditEvent, openUrl, shortUrl, urlKey } from '../../../lib/workspace';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Empty, LevelBadge, LevelPicker, SectionHead, SidChip } from '../workspace/ui';

const DOCUMENTED = new Set(['Documented', 'Strong evidence']);

function CategoryIcon({ category }: { category: string }) {
  const size = 18;
  if (category === 'Education') return <GraduationCap size={size} />;
  if (category === 'Companies' || category === 'Professional') return <Briefcase size={size} />;
  if (category === 'Political' || category === 'Government') return <Landmark size={size} />;
  if (category === 'Organizations' || category === 'Nonprofit') return <Building2 size={size} />;
  return <Users size={size} />;
}

export const AssociationsTab: React.FC = () => {
  const { inv, d, focus, commit, setLevel, goTab } = useWorkspace();
  const associations = inv.associations || [];
  const documented = associations.filter(a => DOCUMENTED.has(a.evidenceState));
  const candidates = associations.filter(a => !DOCUMENTED.has(a.evidenceState));
  const [selectedKey, setSelectedKey] = useState<string | null>(focus);
  const selected = associations.find(a => assocKey(a) === selectedKey) || documented[0] || candidates[0] || null;

  const document = (a: IntelligenceAssociation) => commit(
    inv => ({ ...inv, associations: (inv.associations || []).map(x => (x.id === a.id ? { ...x, evidenceState: 'Documented' } : x)) }),
    [newAuditEvent({ action: 'Association documented', object: a.name, detail: `${a.evidenceState} → Documented`, group: 'Results', kind: 'investigator' })]
  );
  const dismiss = (a: IntelligenceAssociation) => commit(
    inv => ({ ...inv, associations: (inv.associations || []).filter(x => x.id !== a.id) }),
    [newAuditEvent({ action: 'Association dismissed', object: a.name, detail: `${a.category} · ${a.evidenceCitation}`, group: 'Results', kind: 'removal' })]
  );

  if (associations.length === 0) {
    return <Empty title="No associations were found">No organization, school or company was named alongside the subject in the kept results.</Empty>;
  }

  const sidFor = (a: IntelligenceAssociation) => (a.sourceUrl ? d.sourceByKey.get(urlKey(a.sourceUrl)) : undefined);

  return (
    <div className="ws-with-rail wide-rail">
      <div>
        <div className="ws-section">
          <SectionHead title="Documented associations" count={documented.length} noRule right={<span className="ws-sub">Named on a profile or in a kept result</span>} />
          {documented.length === 0 ? <Empty title="None documented yet">Review the candidates below and document the ones the sources support.</Empty> : (
            <div className="ws-table-wrap">
              <table className="ws-table">
                <thead><tr><th colSpan={2}>Organization · role</th><th>Evidence</th><th>Status</th></tr></thead>
                <tbody>
                  {documented.map(a => {
                    const src = sidFor(a);
                    return (
                      <tr key={a.id} className={`row${selected?.id === a.id ? ' selected' : ''}`} onClick={() => setSelectedKey(assocKey(a))}>
                        <td style={{ width: 60 }}><span className="ws-glyph square lg"><CategoryIcon category={a.category} /></span></td>
                        <td>
                          <div className="ws-row-cat">{a.category}</div>
                          <div className="ws-cell-title" style={{ fontSize: 15.5 }}>{a.name}</div>
                          <div className="ws-cell-muted">{a.relationship}</div>
                        </td>
                        <td>
                          {src && <SidChip sid={src.sid} onClick={() => goTab('sources', src.key)} />}
                          <div className="ws-cell-muted" style={{ marginTop: 4 }}>{a.sourceName || 'Search result'}</div>
                        </td>
                        <td><LevelBadge level={levelOf(inv, assocKey(a))} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {candidates.length > 0 && (
          <div className="ws-section">
            <SectionHead title="Appears in results, not documented" count={candidates.length} noRule right={<span className="ws-sub">Not counted as documented until you confirm it</span>} />
            <div className="ws-table-wrap" style={{ borderStyle: 'dashed' }}>
              <table className="ws-table">
                <tbody>
                  {candidates.map(a => (
                    <tr key={a.id} className={`row${selected?.id === a.id ? ' selected' : ''}`} onClick={() => setSelectedKey(assocKey(a))}>
                      <td>
                        <div className="ws-cell-title">{a.name}</div>
                        <div className="ws-cell-muted">{a.category} · {a.evidenceState}</div>
                      </td>
                      <td className="ws-cell-muted" style={{ maxWidth: 320 }}>
                        {a.evidenceCitation}
                        {a.sourceUrl && <div><button type="button" className="ws-url" onClick={e => { e.stopPropagation(); openUrl(a.sourceUrl); }}>{shortUrl(a.sourceUrl)}</button></div>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="ws-btn ws-btn-sm" onClick={e => { e.stopPropagation(); document(a); }}>Document</button>{' '}
                        <button type="button" className="ws-btn ws-btn-sm ws-btn-ghost" onClick={e => { e.stopPropagation(); dismiss(a); }}>Dismiss</button>
                      </td>
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
              <div className="ws-label">Evidence · {selected.category}</div>
              <div className="ws-h2">{selected.name}</div>
              <div className="ws-sub" style={{ marginTop: 4 }}>{selected.relationship}</div>
            </div>
            <div className="ws-panel-sec">
              {(() => {
                const src = sidFor(selected);
                const web = selected.sourceUrl ? d.webByKey.get(urlKey(selected.sourceUrl)) : undefined;
                return (
                  <>
                    <div className="ws-panel-head" style={{ marginBottom: 6 }}>
                      {src ? <SidChip sid={src.sid} onClick={() => goTab('sources', src.key)} /> : <span className="ws-sub">No saved source</span>}
                      <span className="ws-sub">{selected.sourceName || ''}</span>
                    </div>
                    <div className="ws-quote">{selected.evidenceCitation}</div>
                    {web?.description && <div className="ws-quote">“{web.description}”</div>}
                    {selected.sourceUrl && <button type="button" className="ws-url" onClick={() => openUrl(selected.sourceUrl)}>{shortUrl(selected.sourceUrl)}</button>}
                  </>
                );
              })()}
            </div>
            <div className="ws-panel-sec">
              <div className="ws-label">Evidence level</div>
              <LevelPicker value={levelOf(inv, assocKey(selected))} onChange={l => setLevel(assocKey(selected), l, selected.name, selected.name)} />
            </div>
            <div className="ws-panel-sec">
              <div className="ws-label">Documented when</div>
              <p className="ws-sub" style={{ fontSize: 14, lineHeight: 1.6 }}>
                Associations are extracted automatically from profile details (experience, education) and from institution names
                that appear in a kept result. Read the source before relying on one, and mark it Validated only when the source
                clearly ties it to the subject.
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
