/**
 * Targeted searches for information the case's evidence does not cover. Run only when the investigator asks
 * (AI tab → "Search for missing information"), never automatically.
 *
 * Each missing field maps to one existing SerpApi search (see analysisEngine.researchSteps): the query is built
 * on the server from the case's own subject, at most MAX_STEPS searches per run, through the same provider
 * (12-hour cache, timeout, retry) as every other search. A result is kept only when its title or snippet
 * names the subject. The results are saved on the case as evidence; the next AI analysis reads them like any
 * other source, so nothing found here becomes a fact without the usual checks and the investigator's review.
 */
import { SerpApiProvider } from '../search/serpApiProvider';
import { researchSteps } from './analysisEngine';
import { prepareEvidence, siteOf, usableUrl } from './evidencePrep';
import type { AIField } from './types';

const MAX_STEPS = 4;
const MAX_RESULTS = 60;

export interface ResearchResult { id: string; title: string; url: string; snippet: string; source: string; date?: string; engine: string; step: string; fields: AIField[]; foundAt: string }
export interface ResearchRun {
  at: string;
  steps: Array<{ label: string; engine: string; query: string; status: 'ok' | 'empty' | 'failed'; results: number; kept: number; fromCache: boolean; error?: string }>;
}
export interface AIResearch { runs: ResearchRun[]; results: ResearchResult[] }

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const usage = new Map<string, { day: string; count: number }>();
const today = () => new Date().toISOString().slice(0, 10);
export const researchLimit = () => Math.max(1, parseInt(process.env.AI_MAX_RESEARCH_PER_DAY || '10', 10) || 10);
export const researchUsedToday = (uid: string) => (usage.get(uid)?.day === today() ? usage.get(uid)!.count : 0);

export async function runResearch(uid: string, inv: any, fields: AIField[], wantNews: boolean): Promise<{ research: AIResearch; run: ResearchRun }> {
  if (researchUsedToday(uid) >= researchLimit()) {
    throw Object.assign(new Error(`Daily limit for missing-information searches reached (${researchLimit()} per day). Try again tomorrow.`), { code: 'rate_limited' });
  }
  const p = prepareEvidence(inv);
  const steps = researchSteps(p, fields, wantNews).slice(0, MAX_STEPS);
  if (!steps.length) throw Object.assign(new Error('Choose at least one missing field to search for.'), { code: 'bad_request' });

  // A result counts only when it names the subject: one of its whole names, or two parts of the name.
  const aliases = p.aliases.map(norm).filter(a => a.length >= 2);
  const parts = p.subjectNames.slice(1).map(norm).filter(Boolean);
  const namesSubject = (text: string) => {
    const t = ` ${norm(text)} `;
    return aliases.some(a => t.includes(` ${a} `)) || parts.filter(w => t.includes(` ${w} `)).length >= Math.min(2, parts.length || 1);
  };

  const serp = new SerpApiProvider();
  const prev: AIResearch = inv?.aiResearch && Array.isArray(inv.aiResearch.results) ? inv.aiResearch : { runs: [], results: [] };
  const results: ResearchResult[] = [...prev.results];
  const seen = new Set(results.map(r => r.url));
  const at = new Date().toISOString();
  const run: ResearchRun = { at, steps: [] };

  const answers = await Promise.all(steps.map(s => serp.request(s.engine, s.engine === 'bing_news' ? { q: s.query, first: 1 } : { q: s.query, num: 10, hl: 'en' })));
  answers.forEach((r, i) => {
    const step = steps[i];
    const items: any[] = r.data?.organic_results || r.data?.news_results || [];
    let kept = 0;
    items.forEach(it => {
      const url = usableUrl(it.link);
      const title = String(it.title || '').trim();
      const snippet = String(it.snippet || '').trim();
      if (!url || !title || seen.has(url) || !namesSubject(`${title} ${snippet}`)) return;
      seen.add(url);
      kept++;
      results.push({
        id: `rs-${results.length + 1}-${siteOf(url)}`, title, url, snippet, source: String(it.source || it.displayed_link || siteOf(url)).replace(/^https?:\/\//, '').split(/[›/]/)[0].trim(),
        ...(it.date ? { date: String(it.date) } : {}), engine: step.engine, step: step.label, fields: step.fields, foundAt: at
      });
    });
    run.steps.push({
      label: step.label, engine: step.engine, query: step.query, status: r.error && !r.data ? 'failed' : items.length ? 'ok' : 'empty',
      results: items.length, kept, fromCache: r.fromCache, ...(r.error && !r.data ? { error: r.quotaExhausted ? 'SerpApi search quota used up' : r.error } : {})
    });
  });
  // Count the run only when at least one search answered.
  if (run.steps.some(s => s.status !== 'failed')) usage.set(uid, { day: today(), count: researchUsedToday(uid) + 1 });
  console.log(`[ai/research] ${run.steps.map(s => `${s.label}: ${s.status} ${s.kept}/${s.results}${s.fromCache ? ' (cache)' : ''}`).join('; ')}`);
  return { research: { runs: [run, ...prev.runs].slice(0, 10), results: results.slice(-MAX_RESULTS) }, run };
}
