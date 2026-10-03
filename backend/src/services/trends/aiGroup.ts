import { createHash } from 'crypto';
import { getProvider } from '../ai/provider';
import type { CrossPlatformTrend } from './types';

/**
 * Optional AI step for the trend list: Gemini only sees the topics already found (with their headlines) and
 * may (1) say which listed topics are the same story, (2) give each a category, and (3) write one line on what
 * it is about from those headlines. It cannot add topics or numbers: groups that name unknown IDs are dropped,
 * and a summary with a number that is not in the headlines is dropped. Without Gemini the list stays as built.
 */

export const TREND_CATEGORIES = [
  'Politics', 'Sports', 'Entertainment', 'Business & Economy', 'Technology', 'Health', 'Crime & Safety',
  'Weather & Disasters', 'Religion', 'Education', 'Lifestyle', 'Other'
] as const;

const CACHE_MS = 30 * 60_000;
const cache = new Map<string, { at: number; out: AiGroupOutput }>();
let usage = { day: '', count: 0 };
const dailyLimit = () => Math.max(1, parseInt(process.env.AI_MAX_TREND_SUMMARIES_PER_DAY || '30', 10) || 30);

interface ModelGroup { ids: string[]; category: string; about: string }
interface AiGroupOutput { groups: ModelGroup[]; model: string }

const SYSTEM = `You organise a list of trending topics for an analyst. Use ONLY the topics and headlines given.
- Put topic ids in the same group only when they are clearly the same story or event.
- Give each group one category from the allowed list.
- "about": one short sentence (max 25 words) saying what the topic is about, using only facts stated in its headlines. If the headlines do not say, use an empty string.
- Never invent numbers, names, places or events. Every id you return must come from the input.`;

const SCHEMA = {
  type: 'object',
  properties: {
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'string' } },
          category: { type: 'string', enum: [...TREND_CATEGORIES] },
          about: { type: 'string' }
        },
        required: ['ids', 'category', 'about']
      }
    }
  },
  required: ['groups']
};

export function aiAvailable(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return getProvider().configured() && !(usage.day === today && usage.count >= dailyLimit());
}

/** Applies the AI grouping to the list. Returns the list unchanged (with a note) when AI is off or fails. */
export async function aiGroupTrends(trends: CrossPlatformTrend[], cacheKey: string): Promise<{ trends: CrossPlatformTrend[]; used: boolean; model?: string; note?: string }> {
  const provider = getProvider();
  if (!trends.length) return { trends, used: false };
  if (!provider.configured()) return { trends, used: false, note: 'AI grouping is not set up on the server; topics are grouped by matching words only.' };
  const list = trends.slice(0, 30);
  const input = list.map(t => ({
    id: t.id, topic: t.topic,
    headlines: t.items.flatMap(i => i.evidence.map(e => e.title)).slice(0, 4)
  }));
  const key = createHash('sha1').update(cacheKey + JSON.stringify(input)).digest('hex');
  let out = cache.get(key) && Date.now() - cache.get(key)!.at < CACHE_MS ? cache.get(key)!.out : null;
  if (!out) {
    const today = new Date().toISOString().slice(0, 10);
    if (usage.day !== today) usage = { day: today, count: 0 };
    if (usage.count >= dailyLimit()) return { trends, used: false, note: `Daily AI trend summary limit reached (${dailyLimit()}); topics are grouped by matching words only.` };
    try {
      const res = await provider.generateJson<{ groups: ModelGroup[] }>(SYSTEM, `Allowed categories: ${TREND_CATEGORIES.join(', ')}\n\nTopics:\n${JSON.stringify(input)}`, SCHEMA, { budgetMs: 40_000 });
      usage.count += 1;
      out = { groups: Array.isArray(res.data?.groups) ? res.data.groups : [], model: res.model };
      if (cache.size > 100) cache.delete(cache.keys().next().value as string);
      cache.set(key, { at: Date.now(), out });
    } catch (e) {
      return { trends, used: false, note: `AI grouping was skipped (${(e as Error).message}). Topics are grouped by matching words only.` };
    }
  }

  const byId = new Map(trends.map(t => [t.id, t]));
  const merged = new Set<string>();
  const result: CrossPlatformTrend[] = [];
  const order = new Map(trends.map((t, i) => [t.id, i]));
  out.groups.forEach(g => {
    const ids = Array.from(new Set(g.ids)).filter(id => byId.has(id) && !merged.has(id));
    // Any unknown id means the answer does not match the list: ignore that group.
    if (!ids.length || ids.length !== new Set(g.ids).size) return;
    ids.sort((a, b) => order.get(a)! - order.get(b)!);
    const members = ids.map(id => byId.get(id)!);
    const lead = members[0];
    const text = members.flatMap(m => [m.topic, ...m.items.flatMap(i => i.evidence.map(e => `${e.title} ${e.snippet || ''}`))]).join(' ');
    const numbersOk = (g.about.match(/\d[\d,.]*/g) || []).every(n => text.includes(n));
    const about = g.about && numbersOk ? g.about.trim().slice(0, 220) : undefined;
    ids.forEach(id => merged.add(id));
    const combined: CrossPlatformTrend = members.length === 1 ? { ...lead } : {
      ...lead,
      platforms: Array.from(new Set(members.flatMap(m => m.platforms))),
      // A platform's items stay separate; the same platform from two merged topics keeps both.
      items: members.flatMap(m => m.items),
      relatedKeywords: Array.from(new Set(members.flatMap(m => [...m.relatedKeywords, ...(m === lead ? [] : [m.topic])]))).slice(0, 12),
      hashtags: Array.from(new Set(members.flatMap(m => m.hashtags))).slice(0, 10)
    };
    if (!combined.category && TREND_CATEGORIES.includes(g.category as typeof TREND_CATEGORIES[number])) {
      combined.category = g.category;
      combined.categorySource = 'ai';
    }
    if (about) combined.about = about;
    result.push(combined);
  });
  trends.forEach(t => { if (!merged.has(t.id)) result.push(t); });
  result.sort((a, b) => b.platforms.length - a.platforms.length || order.get(a.id)! - order.get(b.id)!);
  return { trends: result, used: true, model: out.model };
}
