import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { EvidenceLevel } from '../../../types/investigation';
import { LEVEL_LABEL } from '../../../lib/workspace';

export const LevelBadge: React.FC<{ level: EvidenceLevel | 'finding'; dot?: boolean }> = ({ level, dot }) => (
  <span className={`ws-level ${level}${dot ? ' dot' : ''}`}>{level === 'finding' ? 'Findings' : LEVEL_LABEL[level]}</span>
);

export const LevelPicker: React.FC<{ value: EvidenceLevel; onChange: (l: EvidenceLevel) => void }> = ({ value, onChange }) => (
  <div className="ws-level-picker" role="group" aria-label="Evidence level">
    {(['raw', 'relevant', 'validated'] as EvidenceLevel[]).map(l => (
      <button
        key={l}
        type="button"
        className={value === l ? 'on' : ''}
        aria-pressed={value === l}
        onClick={() => value !== l && onChange(l)}
      >
        {LEVEL_LABEL[l]}
      </button>
    ))}
  </div>
);

export interface ChipOption {
  key: string;
  label: string;
  count?: number;
}

export const Chips: React.FC<{ options: ChipOption[]; value: string; onChange: (key: string) => void }> = ({ options, value, onChange }) => (
  <div className="ws-chips">
    {options.map(o => (
      <button key={o.key} type="button" className={`ws-chip ${value === o.key ? 'active' : ''}`} onClick={() => onChange(o.key)}>
        {o.label}
        {o.count !== undefined && <span className="n">{o.count}</span>}
      </button>
    ))}
  </div>
);

export const SectionHead: React.FC<{ title: React.ReactNode; count?: number; right?: React.ReactNode; noRule?: boolean }> = ({ title, count, right, noRule }) => (
  <div className={`ws-section-head${noRule ? ' no-rule' : ''}`}>
    <h2 className="ws-h2">
      {title}
      {count !== undefined && <span className="ws-muted"> · {count}</span>}
    </h2>
    {right}
  </div>
);

export const Empty: React.FC<{ title: string; children?: React.ReactNode; action?: React.ReactNode }> = ({ title, children, action }) => (
  <div className="ws-empty">
    <b>{title}</b>
    {children}
    {action && <div>{action}</div>}
  </div>
);

export const SidChip: React.FC<{ sid: string; onClick?: () => void; title?: string }> = ({ sid, onClick, title }) =>
  onClick ? (
    <button type="button" className="ws-sid" onClick={onClick} title={title}>{sid}</button>
  ) : (
    <span className="ws-sid" title={title}>{sid}</span>
  );

const GLYPHS: Array<[RegExp, string]> = [
  [/linkedin/i, 'in'],
  [/facebook/i, 'f'],
  [/instagram/i, 'ig'],
  [/youtube/i, 'yt'],
  [/tiktok/i, 'tt'],
  [/threads/i, 'th'],
  [/twitter|^x\b|x \(/i, 'x'],
  [/github/i, 'gh'],
  [/reddit/i, 'rd'],
  [/medium/i, 'md'],
  [/stack/i, 'so'],
  [/wikipedia/i, 'W']
];

export function glyphFor(name?: string): string {
  const n = name || '';
  const hit = GLYPHS.find(([re]) => re.test(n));
  if (hit) return hit[1];
  const clean = n.replace(/^www\./, '').replace(/[^A-Za-z0-9]/g, '');
  return clean ? clean[0].toUpperCase() : '•';
}

export const Glyph: React.FC<{ text: string; square?: boolean; lg?: boolean }> = ({ text, square, lg }) => (
  <span className={`ws-glyph${square ? ' square' : ''}${lg ? ' lg' : ''}`} aria-hidden="true">{text}</span>
);

export const LinkStatus: React.FC<{ status?: string }> = ({ status }) => {
  const s = status || 'unchecked';
  const label = s === 'reachable' ? 'Reachable' : s === 'unavailable' ? 'Unreachable' : s === 'unverifiable' ? 'Unverifiable' : 'Not checked';
  return <span className={`ws-link-status ${s}`}>{label}</span>;
};

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, onClose, children, footer }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ws-root-portal">
      <div className="ws-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <div className="ws-modal" role="dialog" aria-modal="true" aria-label={title}>
          <div className="ws-modal-head">
            <h2 className="ws-h2">{title}</h2>
            <button type="button" className="ws-btn ws-btn-ghost ws-icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {children}
          {footer && <div className="ws-modal-foot">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}
