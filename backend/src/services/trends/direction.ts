import type { Snapshot } from './snapshots';
import { sameTopic } from './normalize';
import type { TrendDirection } from './types';

/**
 * Trend direction, only from something measured: a previous snapshot of the same list, Google's own start
 * time, or the dates of the results found. With none of these the answer is "Direction unavailable".
 */

export interface DirectionResult { direction: TrendDirection; basis: string }

const UNAVAILABLE: DirectionResult = { direction: 'Direction unavailable', basis: 'No earlier data to compare with yet.' };

const ago = (ms: number) => {
  const h = Math.round(ms / 3600_000);
  return h < 1 ? `${Math.max(1, Math.round(ms / 60_000))} min ago` : h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

/** A topic in a ranked list compared with the same list about one window earlier. */
export function fromSnapshot(key: string, rank: number, metric: number | undefined, prev: Snapshot | null, now = Date.now()): DirectionResult | null {
  if (!prev) return null;
  const when = ago(now - Date.parse(prev.at));
  const before = prev.entries.find(e => sameTopic(e.key, key));
  if (!before) return { direction: 'Emerging', basis: `Not in the list ${when}; it is now (#${rank + 1}).` };
  if (metric != null && before.metric != null && before.metric > 0) {
    const change = (metric - before.metric) / before.metric;
    if (change >= 0.2) return { direction: 'Rising', basis: `Volume up ${Math.round(change * 100)}% since ${when}.` };
    if (change <= -0.2) return { direction: 'Declining', basis: `Volume down ${Math.round(-change * 100)}% since ${when}.` };
  }
  if (before.rank - rank >= 2) return { direction: 'Rising', basis: `Moved up from #${before.rank + 1} to #${rank + 1} since ${when}.` };
  if (rank - before.rank >= 2) return { direction: 'Declining', basis: `Moved down from #${before.rank + 1} to #${rank + 1} since ${when}.` };
  return { direction: 'Stable', basis: `About the same position as ${when} (#${before.rank + 1} → #${rank + 1}).` };
}

/** Google Trends marks a trend active and gives its start time: recently started and still active = emerging. */
export function fromGoogleStart(active: boolean, startedAt: string | undefined, now = Date.now()): DirectionResult | null {
  if (!startedAt) return null;
  const age = now - Date.parse(startedAt);
  if (!Number.isFinite(age)) return null;
  if (active && age <= 4 * 3600_000) return { direction: 'Emerging', basis: `Google Trends: started ${ago(age)} and still active.` };
  if (!active) return { direction: 'Declining', basis: `Google Trends: no longer marked active (started ${ago(age)}).` };
  return null;
}

/** Dated results: more in the newer half of the window than in the older half = rising (needs at least 4 dated results). */
export function fromDates(dates: string[], windowMs: number, now = Date.now()): DirectionResult | null {
  const ts = dates.map(d => Date.parse(d)).filter(t => Number.isFinite(t) && now - t <= windowMs);
  if (ts.length < 4) return null;
  const mid = now - windowMs / 2;
  const recent = ts.filter(t => t >= mid).length;
  const older = ts.length - recent;
  const basis = `${recent} dated result${recent === 1 ? '' : 's'} in the newer half of the window, ${older} in the older half.`;
  if (older === 0) return { direction: 'Emerging', basis: `All ${recent} dated results are from the newer half of the window.` };
  const ratio = recent / older;
  if (ratio >= 1.5) return { direction: 'Rising', basis };
  if (ratio <= 0.67) return { direction: 'Declining', basis };
  return { direction: 'Stable', basis };
}

export function firstKnown(...results: Array<DirectionResult | null>): DirectionResult {
  return results.find((r): r is DirectionResult => Boolean(r)) || UNAVAILABLE;
}

/** Combined direction of a topic across platforms: the strongest-evidence platform's answer (official list first). */
export function combineDirections(list: Array<DirectionResult & { platform: string }>): DirectionResult {
  const known = list.filter(d => d.direction !== 'Direction unavailable');
  if (!known.length) return UNAVAILABLE;
  const order = ['google', 'news', 'x', 'youtube', 'reddit', 'tiktok', 'facebook', 'instagram'];
  known.sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform));
  const top = known[0];
  return { direction: top.direction, basis: top.basis };
}
