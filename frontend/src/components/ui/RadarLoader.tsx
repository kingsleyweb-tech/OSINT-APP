import React from 'react';
import '../../styles/RadarLoader.css';

export type RadarBlipState = 'waiting' | 'active' | 'done' | 'empty' | 'failed';

interface RadarLoaderProps {
  /** Diameter in pixels. */
  size?: number;
  /** Large text in the centre, e.g. "75%". */
  label?: string;
  /** Small text under the label, e.g. "6 / 8". */
  sub?: string;
  /** One blip per source; its state sets how it is drawn. */
  blips?: RadarBlipState[];
  className?: string;
}

/** Spreads blips around the radar at fixed positions so they do not jump between renders. */
const blipPosition = (i: number) => {
  const angle = ((i * 137.5 + 24) % 360) * (Math.PI / 180);
  const r = 0.56 + ((i * 0.37) % 1) * 0.32; // share of the radius, kept outside the centre
  return { left: `${50 + Math.cos(angle) * r * 50}%`, top: `${50 + Math.sin(angle) * r * 50}%` };
};

/** Radar-style loader in the app accent colour. Used for searches and page loading. */
export const RadarLoader: React.FC<RadarLoaderProps> = ({ size = 200, label, sub, blips = [], className }) => (
  <div
    className={`rd${size < 90 ? ' rd-small' : ''}${className ? ` ${className}` : ''}`}
    style={{ '--rd-size': `${size}px` } as React.CSSProperties}
    aria-hidden="true"
  >
    <div className="rd-grid" />
    <div className="rd-ring rd-ring-1" />
    <div className="rd-ring rd-ring-2" />
    <div className="rd-sweep" />
    {blips.map((state, i) => (
      <span key={i} className={`rd-blip rd-blip-${state}`} style={blipPosition(i)} />
    ))}
    <div className="rd-hub">
      {label && <span className="rd-label">{label}</span>}
      {sub && <span className="rd-sub">{sub}</span>}
    </div>
  </div>
);
