import { createHash } from 'crypto';
import { dice } from '../queryIntel/fuzzy';
import { dedupeKey, normalizeText } from '../explore/relevance';
import type { Draft } from '../explore/normalize';
import type { SignalKind, TrendEvidence, TrendSource } from './types';

/** Platform names and the honest label of the signal each one gives. */
export const PLATFORM_META: Record<TrendSource, { name: string; signalKind: SignalKind; sourceLabel: string; reliability: string }> = {
  google: {
    name: 'Google Trends', signalKind: 'official_trending', sourceLabel: 'Official trending list',
    reliability: "Google's own list of searches rising sharply in this country. Volume and increase are Google's rounded figures."
  },
  news: {
    name: 'News', signalKind: 'news_coverage', sourceLabel: 'News coverage',
    reliability: 'Articles published by news outlets (Google News / Bing News). Shows coverage, not public search interest.'
  },
  x: {
    name: 'X', signalKind: 'conversation_signal', sourceLabel: 'X Public Conversation Signal',
    reliability: "Public X posts found through Google search in this window. Not X's own trending list; counts are the posts Google returned, not totals."
  },
  youtube: {
    name: 'YouTube', signalKind: 'video_activity', sourceLabel: 'Video activity signal',
    reliability: 'Videos YouTube search returned as uploaded in this window. Views are shown only where YouTube returned them.'
  },
  reddit: {
    name: 'Reddit', signalKind: 'discussion_signal', sourceLabel: 'Discussion signal',
    reliability: 'Reddit threads found through Google search in this window. Not Reddit’s own ranking.'
  },
  tiktok: {
    name: 'TikTok', signalKind: 'indexed_mentions', sourceLabel: 'Indexed mentions (via Google)',
    reliability: 'TikTok pages Google has indexed for this topic. This is not a TikTok trend and may lag behind the platform.'
  },
  facebook: {
    name: 'Facebook', signalKind: 'indexed_mentions', sourceLabel: 'Indexed mentions (via Google)',
    reliability: 'Public Facebook pages Google has indexed for this topic. This is not a Facebook trend; most Facebook content is not indexed.'
  },
  instagram: {
    name: 'Instagram', signalKind: 'indexed_mentions', sourceLabel: 'Indexed mentions (via Google)',
    reliability: 'Instagram pages Google has indexed for this topic. This is not an Instagram trend and may lag behind the platform.'
  }
};

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'is', 'are', 'was', 'vs', 'v', 'from', 'as', 'after', 'over', 'new']);

/** Topic key: lower case, no "#", stopwords removed, words sorted (so "Chelsea vs Arsenal" = "arsenal chelsea"). */
export function topicKey(topic: string): string {
  return topicTokens(topic).sort().join(' ');
}

export function topicTokens(topic: string): string[] {
  return Array.from(new Set(normalizeText(topic.replace(/[#@._]/g, ' ')).split(' ').filter(w => w.length > 1 && !STOP.has(w))));
}

/** Same topic: equal keys, or word sets at least 80% alike (Dice coefficient on the keys' words). */
export function sameTopic(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const A = new Set(a.split(' ')), B = new Set(b.split(' '));
  let common = 0;
  A.forEach(w => { if (B.has(w)) common += 1; });
  return (2 * common) / (A.size + B.size) >= 0.8;
}

/** A short topic name drawn from a headline: the part before " - Outlet" / " | " / ": ", at most 7 words. */
export function headlineTopic(title: string): string {
  const main = title.split(/\s[-–—|]\s/)[0].split(/:\s/)[0].trim();
  return main.split(/\s+/).slice(0, 7).join(' ');
}

export function hashtagsIn(texts: string[]): string[] {
  const counts = new Map<string, { tag: string; n: number }>();
  texts.forEach(t => (t.match(/#[\p{L}\p{N}_]{2,40}/gu) || []).forEach(tag => {
    const k = tag.toLowerCase();
    const c = counts.get(k);
    if (c) c.n += 1; else counts.set(k, { tag, n: 1 });
  }));
  return Array.from(counts.values()).sort((a, b) => b.n - a.n).slice(0, 8).map(c => c.tag);
}

export const itemId = (...parts: string[]) => `t_${createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12)}`;

/**
 * Drops repeats (same URL, or near-identical titles), and results whose own date is outside the window.
 * Undated results are kept: the engine's own time filter already limited them.
 */
export function cleanResults(drafts: Draft[], windowMs: number, now = Date.now()): { kept: Draft[]; outside: number } {
  const seen = new Set<string>();
  const titles: string[] = [];
  const kept: Draft[] = [];
  let outside = 0;
  drafts.forEach(d => {
    const k = dedupeKey(d.url);
    if (seen.has(k)) return;
    const t = normalizeText(d.title || '');
    if (t.length > 20 && titles.some(x => dice(x, t) >= 0.92)) return;
    if (d.publishedAt) {
      const age = now - Date.parse(d.publishedAt);
      // A little slack for clock and rounding differences ("1 hour ago").
      if (Number.isFinite(age) && age > windowMs * 1.1 + 5 * 60_000) { outside += 1; return; }
    }
    seen.add(k);
    titles.push(t);
    kept.push(d);
  });
  return { kept, outside };
}

export function toEvidence(d: Draft): TrendEvidence {
  return {
    title: d.title,
    url: d.url,
    source: d.author || d.platform || (() => { try { return new URL(d.url).hostname.replace(/^www\./, ''); } catch { return 'Web'; } })(),
    ...(d.publishedAt ? { date: d.publishedAt } : {}),
    ...(d.snippet ? { snippet: d.snippet.slice(0, 280) } : {})
  };
}

export function dateSpan(drafts: Draft[]): { first?: string; latest?: string } {
  const ts = drafts.map(d => (d.publishedAt ? Date.parse(d.publishedAt) : NaN)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!ts.length) return {};
  return { first: new Date(ts[0]).toISOString(), latest: new Date(ts[ts.length - 1]).toISOString() };
}
