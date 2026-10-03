import React, { useEffect } from 'react';
import { ExternalLink, Search, X } from 'lucide-react';
import { fmtDate } from '../../lib/workspace';
import { KIND_SHORT, PLATFORM_LABEL, metricText, type CrossPlatformTrend } from '../../lib/trendsClient';
import { DirectionPill, PlatformChip } from './TrendList';

/**
 * Detail of one trend: where it was seen, when, its numbers as each source gave them, the evidence links,
 * the basis of its direction and why it is listed. A side panel on wide screens, full screen on phones.
 */
export const TrendDetail: React.FC<{ trend: CrossPlatformTrend; region: string; onClose: () => void; onSearchTopic?: (topic: string) => void }> = ({ trend, region, onClose, onSearchTopic }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const t = trend;
  return (
    <div className="tr-detail-backdrop" onClick={onClose}>
      <aside className="tr-detail" role="dialog" aria-modal="true" aria-label={`Trend: ${t.topic}`} onClick={e => e.stopPropagation()}>
        <header className="tr-detail-head">
          <div>
            <h2 className="tr-detail-title">{t.topic}</h2>
            <div className="tr-detail-chips">{t.items.map(it => <PlatformChip key={it.id} platform={it.platform} kind={it.signalKind} />)}</div>
          </div>
          <button type="button" className="ex-btn ex-btn-ghost ex-btn-sm" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        <div className="tr-detail-body">
          {t.about && (
            <p className="tr-detail-about">{t.about} <span className="ex-muted ex-small">(AI summary of the listed headlines)</span></p>
          )}
          <dl className="tr-facts">
            <div><dt>Platforms</dt><dd>{t.platforms.map(p => PLATFORM_LABEL[p]).join(', ')}</dd></div>
            <div><dt>First detected</dt><dd>{t.firstSeenAt ? fmtDate(t.firstSeenAt, true) : 'Not stated by the sources'}</dd></div>
            <div><dt>Latest activity</dt><dd>{t.latestAt ? fmtDate(t.latestAt, true) : 'Not stated by the sources'}</dd></div>
            <div><dt>Location</dt><dd>{region}</dd></div>
            <div><dt>Category</dt><dd>{t.category ? `${t.category}${t.categorySource === 'ai' ? ' (AI-assigned)' : t.categorySource === 'google' ? ' (Google Trends)' : ''}` : 'Not categorised'}</dd></div>
            <div><dt>Direction</dt><dd><DirectionPill direction={t.direction} /> <span className="ex-muted ex-small">{t.directionBasis}</span></dd></div>
          </dl>

          {(t.relatedKeywords.length > 0 || t.hashtags.length > 0) && (
            <section className="tr-detail-sec">
              <h3>Related keywords and hashtags</h3>
              <div className="tr-tags">
                {t.relatedKeywords.map(k => onSearchTopic
                  ? <button type="button" key={`k-${k}`} className="ex-chip" onClick={() => onSearchTopic(k)} title="Search this topic">{k}</button>
                  : <span key={`k-${k}`} className="ex-chip">{k}</span>)}
                {t.hashtags.map(h => <span key={`h-${h}`} className="ex-chip">{h}</span>)}
              </div>
            </section>
          )}

          {t.items.map(it => (
            <section key={it.id} className="tr-detail-sec">
              <h3>
                <PlatformChip platform={it.platform} kind={it.signalKind} /> <span className="tr-kind">{it.sourceLabel}</span>
              </h3>
              <div className="tr-plat-meta">
                <span>{metricText(it.metrics)}</span>
                <DirectionPill direction={it.direction} basis={it.directionBasis} />
                {it.query && <span className="ex-muted ex-small" title="The exact search that was run">Searched: {it.query}</span>}
              </div>
              <p className="tr-why"><b>Why this is listed:</b> {it.reliability}</p>
              {it.evidence.length === 0
                ? <p className="ex-muted ex-small">No supporting links were returned.</p>
                : (
                  <ul className="tr-evidence">
                    {it.evidence.map(e => (
                      <li key={e.url}>
                        <a href={e.url} target="_blank" rel="noopener noreferrer">{e.title} <ExternalLink size={11} aria-hidden="true" /></a>
                        <span className="ex-muted ex-small">{e.source}{e.date ? ` · ${fmtDate(e.date, true)}` : ' · date not stated'}</span>
                        {e.snippet && e.snippet !== e.title && <span className="tr-snippet">{e.snippet}</span>}
                      </li>
                    ))}
                  </ul>
                )}
            </section>
          ))}

          <p className="ex-muted ex-small">
            {KIND_SHORT.official_trending} = Google’s own list. Other platforms are signals measured from search results in the chosen window,
            not the platforms’ own trending lists. Numbers are shown only where a source gave them.
          </p>
          {onSearchTopic && (
            <button type="button" className="ex-btn ex-btn-primary" onClick={() => onSearchTopic(t.topic)}><Search size={15} /> Deep dive on this topic</button>
          )}
        </div>
      </aside>
    </div>
  );
};
