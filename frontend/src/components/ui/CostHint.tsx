import React from 'react';
import { Coins } from 'lucide-react';
import { fmtRange, type CostRange } from '../../lib/searchCosts';
import '../../styles/CostHint.css';

/**
 * "This search may use about X–Y tokens" — the SerpApi searches a page will use, as a range
 * (lowest when every engine answers first time, highest when every fallback also runs).
 */
export const CostHint: React.FC<{ range?: CostRange; free?: boolean; what?: string; note?: React.ReactNode; className?: string }> = ({ range, free, what = 'This search', note, className }) => (
  <span className={`cost-hint${className ? ` ${className}` : ''}`}>
    <Coins size={14} aria-hidden="true" />
    <span>
      {free || !range
        ? <>{what} uses <b>no tokens</b>.</>
        : <>{what} may use about <b>{fmtRange(range)} token{range.max === 1 ? '' : 's'}</b> (SerpApi searches). Repeating it within 12 hours is free.</>}
      {note && <> {note}</>}
    </span>
  </span>
);
