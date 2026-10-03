import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles, HelpCircle } from 'lucide-react';
import { PlatformIcon } from '../ui/PlatformIcon';
import { fmtDate } from '../../lib/workspace';
import {
  DIRECTION_CLASS, KIND_SHORT, PLATFORM_DOMAIN, PLATFORM_LABEL, STATUS_TEXT, metricText,
  type CrossPlatformTrend, type SourceReport, type TrendDirection, type TrendSource
} from '../../lib/trendsClient';

export const DirectionPill: React.FC<{ direction: TrendDirection; basis?: string }> = ({ direction, basis }) => {
  const cls = DIRECTION_CLASS[direction];
  const Icon = cls === 'up' ? ArrowUpRight : cls === 'down' ? ArrowDownRight : cls === 'new' ? Sparkles : cls === 'flat' ? Minus : HelpCircle;
  return (
    <span className={`tr-dir tr-dir-${cls}`} title={basis}>
      <Icon size={12} aria-hidden="true" /> {direction}
    </span>
  );
};

export const PlatformChip: React.FC<{ platform: TrendSource; kind?: string }> = ({ platform, kind }) => (
  <span className={`tr-chip${kind === 'indexed_mentions' ? ' tr-chip-indexed' : kind === 'official_trending' ? ' tr-chip-official' : ''}`} title={kind ? KIND_SHORT[kind] : undefined}>
    <PlatformIcon platform={PLATFORM_LABEL[platform]} domain={PLATFORM_DOMAIN[platform]} size={12} /> {PLATFORM_LABEL[platform]}
  </span>
);

/** One chip per platform with its status ("X — Temporarily unavailable"). */
export const SourceStrip: React.FC<{ sources: SourceReport[] }> = ({ sources }) => (
  <div className="tr-strip" role="list" aria-label="Sources">
    {sources.map(s => (
      <span key={s.platform} role="listitem" className={`tr-src tr-src-${s.status}`}
        title={[s.error, s.note, s.queries.length ? `Searched: ${s.queries.join(' | ')}` : '', s.fromCache ? 'Served from cache (free)' : ''].filter(Boolean).join('\n')}>
        <PlatformIcon platform={PLATFORM_LABEL[s.platform]} domain={PLATFORM_DOMAIN[s.platform]} size={12} />
        <b>{PLATFORM_LABEL[s.platform]}</b>
        <span>{s.status === 'ok' ? `${s.items} topic${s.items === 1 ? '' : 's'}` : s.error || STATUS_TEXT[s.status]}</span>
      </span>
    ))}
  </div>
);

/** Compact trend rows: topic · platform chips · strongest metric · direction · category · latest activity. */
export const TrendRows: React.FC<{ trends: CrossPlatformTrend[]; onOpen: (t: CrossPlatformTrend) => void; selectedId?: string }> = ({ trends, onOpen, selectedId }) => (
  <ol className="tr-rows">
    {trends.map((t, i) => {
      const lead = t.items[0];
      const latest = t.latestAt || t.firstSeenAt;
      return (
        <li key={t.id}>
          <button type="button" className={`tr-row${selectedId === t.id ? ' on' : ''}`} onClick={() => onOpen(t)} aria-label={`${t.topic}: details`}>
            <span className="tr-rank">{i + 1}</span>
            <span className="tr-topic">
              <span className="tr-topic-name">{t.topic}</span>
              {t.about && <span className="tr-about">{t.about}</span>}
            </span>
            <span className="tr-platforms">{t.items.map(it => <PlatformChip key={it.id} platform={it.platform} kind={it.signalKind} />)}</span>
            <span className="tr-metric">{metricText(lead.metrics)}</span>
            <span className="tr-dir-cell"><DirectionPill direction={t.direction} basis={t.directionBasis} /></span>
            <span className="tr-cat">{t.category || 'Uncategorised'}</span>
            <span className="tr-time">{latest ? fmtDate(latest, true) : 'Time not stated'}</span>
          </button>
        </li>
      );
    })}
  </ol>
);
