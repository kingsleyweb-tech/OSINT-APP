import { combineDirections } from './direction';
import { PLATFORM_META, itemId, sameTopic, topicTokens } from './normalize';
import type { CrossPlatformTrend, TrendItem, TrendSource } from './types';

/** Strongest kind of evidence first: the official list, then news, then platform signals. */
export const PLATFORM_ORDER: TrendSource[] = ['google', 'news', 'x', 'youtube', 'reddit', 'tiktok', 'facebook', 'instagram'];

/**
 * A short topic (a trending search such as "arsenal chelsea") contained in a longer one (a headline about it).
 * One-word topics need at least 5 letters so common words do not pull unrelated headlines together.
 */
export function contains(shortTopic: string, longTopic: string): boolean {
  const a = topicTokens(shortTopic), b = new Set(topicTokens(longTopic));
  if (!a.length || a.length > b.size) return false;
  if (a.length === 1 && a[0].length < 5) return false;
  return a.every(w => b.has(w));
}

/** Groups the same topic across platforms; each platform's own item (and evidence) is kept inside the group. */
export function groupAcrossPlatforms(items: TrendItem[]): CrossPlatformTrend[] {
  const sorted = [...items].sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));
  const groups: Array<{ items: TrendItem[]; order: number }> = [];
  sorted.forEach((it, i) => {
    const g = groups.find(gr => gr.items.some(x => sameTopic(x.key, it.key) || contains(x.topic, it.topic) || contains(it.topic, x.topic)));
    // A platform appears once per topic: a second item from the same platform starts its own group.
    if (g && !g.items.some(x => x.platform === it.platform)) g.items.push(it);
    else groups.push({ items: [it], order: i });
  });

  return groups.map(g => {
    const lead = g.items[0];
    const dates = (k: 'firstSeenAt' | 'latestAt') => g.items.map(x => x[k]).filter((d): d is string => Boolean(d)).sort();
    const first = dates('firstSeenAt')[0];
    const latestAll = [...dates('latestAt'), ...dates('firstSeenAt')].sort();
    const dir = combineDirections(g.items.map(x => ({ direction: x.direction, basis: `${PLATFORM_META[x.platform].name}: ${x.directionBasis}`, platform: x.platform })));
    const cat = g.items.find(x => x.category)?.category;
    return {
      id: itemId('group', ...g.items.map(x => x.id)),
      topic: lead.topic,
      key: lead.key,
      platforms: Array.from(new Set(g.items.map(x => x.platform))),
      items: g.items,
      ...(cat ? { category: cat, categorySource: 'google' as const } : {}),
      direction: dir.direction,
      directionBasis: dir.basis,
      ...(first ? { firstSeenAt: first } : {}),
      ...(latestAll.length ? { latestAt: latestAll[latestAll.length - 1] } : {}),
      relatedKeywords: Array.from(new Set(g.items.flatMap(x => x.relatedKeywords))).slice(0, 12),
      hashtags: Array.from(new Set(g.items.flatMap(x => x.hashtags))).slice(0, 10)
    };
  }).sort((a, b) => b.platforms.length - a.platforms.length
    || PLATFORM_ORDER.indexOf(a.items[0].platform) - PLATFORM_ORDER.indexOf(b.items[0].platform)
    || 0);
}
