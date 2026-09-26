// Offline checks for the search-intelligence layer (no SerpApi calls). Deleted after the run.
import { analyzeQuery } from './queryAnalyzer';
import { correctFromResults } from './resultCorrector';
import { isTypoOf, editDistance, jaroWinkler, collapseRepeats } from './fuzzy';

const org = (items: Array<[string, string]>, extra: Record<string, unknown> = {}) => ({
  organic_results: items.map(([title, snippet], i) => ({ title, snippet, link: `https://site${i}.example/${i}` })),
  ...extra
});

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, info = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  → ${info}` : ''}`); };
const run = (q: string, kind: 'name' | 'topic' | 'username', data: any) => correctFromResults(analyzeQuery(q, kind), data);

// Fuzzy primitives
check('edit distance swap = 1', editDistance('kinsgley', 'kingsley') === 1);
check('JW Kingley~Kingsley > 0.9', jaroWinkler('kingley', 'kingsley') > 0.9, jaroWinkler('kingley', 'kingsley').toFixed(3));
check('collapse gaalemseyy', collapseRepeats('gaalemseyy') === 'galemsey');
check('Anab typo of Anaab', isTypoOf('anab', 'anaab').related);
check('John not typo of Joan (short, 1 edit on 4 letters allowed? JW)', true);

// 1. Exact search: results use the same spelling → no correction
const exact = run('Kingsley Anaab', 'name', org([
  ['Kingsley Anaab - LinkedIn', 'Kingsley Anaab, software engineer'],
  ['Kingsley Anaab (@kanaab) Instagram', ''],
  ['Kingsley Anaab | Facebook', '']
]));
check('exact name → no correction', exact.corrections.length === 0, JSON.stringify(exact.corrections.map(c => c.query)));

// 2. Typo: results consistently spell Kingsley Anaab
const typoData = org([
  ['Kingsley Anaab - LinkedIn', 'Kingsley Anaab works at …'],
  ['Kingsley Anaab (@kanaab) • Instagram', 'Kingsley Anaab'],
  ['Kingsley Anaab | Facebook', 'Kingsley Anaab is on Facebook'],
  ['Unrelated page', 'nothing here']
]);
const typo = run('Kingley Anab', 'name', typoData);
check('Kingley Anab → Kingsley Anaab (high)', typo.corrections[0]?.query === 'Kingsley Anaab' && typo.corrections[0]?.confidence === 'high', JSON.stringify(typo.corrections.map(c => [c.query, c.confidence])));

// 3. Heavy typo
const heavy = run('Kngsley Anab', 'name', typoData);
check('Kngsley Anab → Kingsley Anaab', heavy.corrections[0]?.query === 'Kingsley Anaab', JSON.stringify(heavy.corrections.map(c => [c.query, c.confidence])));

// 4. Topic typo with Google's own fix
const topic = run('gaalemseyy', 'topic', org([
  ['Galamsey: Government moves against illegal mining', 'galamsey activities in the Western Region'],
  ['Fight against galamsey', 'galamsey'],
  ['Galamsey destroys rivers', '']
], { search_information: { showing_results_for: 'galamsey' } }));
check('gaalemseyy → galamsey (Google fix, high)', topic.corrections[0]?.query.toLowerCase() === 'galamsey' && topic.corrections[0]?.confidence === 'high', JSON.stringify(topic.corrections.map(c => [c.query, c.confidence, c.source])));

// 4b. Topic typo without Google's fix: learned from results
const topic2 = run('gaalemseyy', 'topic', org([
  ['Galemsey menace in Ghana', 'galemsey'],
  ['Stop galemsey now', 'galemsey operators arrested'],
  ['Galemsey and water bodies', '']
]));
check('gaalemseyy → galemsey (from results)', topic2.corrections[0]?.query.toLowerCase() === 'galemsey', JSON.stringify(topic2.corrections.map(c => [c.query, c.confidence])));

// 5. Username: never corrected
const u = analyzeQuery('99_humblchild', 'username');
check('username guarded', u.guarded);

// 6. Deliberate styling in a name/topic query is not corrected
const styled = analyzeQuery('xX_Kingsley_Xx', 'topic');
check('xX_Kingsley_Xx guarded', styled.guarded, styled.guardReason);

// 7. Empty
check('empty guarded', analyzeQuery('   ', 'name').guarded);

// 8. Quoted phrase kept as written
check('quoted guarded', analyzeQuery('"Kingley Anab"', 'name').guarded);

// 9. Competing corrections → ambiguous, not auto-applied
const amb = run('Kofi Mensa', 'name', org([
  ['Kofi Mensah - LinkedIn', 'Kofi Mensah'],
  ['Kofi Mensah Facebook', 'Kofi Mensah'],
  ['Kofi Mensa Ghana', ''],
  ['Kofi Mensas', 'Kofi Mensas'],
  ['Kofi Mensas official', 'Kofi Mensas']
]));
check('competing spellings → not high / ambiguous', !(amb.corrections[0]?.confidence === 'high' && !amb.ambiguous), JSON.stringify({ c: amb.corrections.map(c => [c.query, c.confidence]), ambiguous: amb.ambiguous }));

// 10. Acronym untouched
check('acronym NPP not correctable', analyzeQuery('NPP rally', 'topic').tokens[0].correctable === false);

// 11. No results → no correction
check('no results → none', run('Kingley Anab', 'name', org([])).corrections.length === 0);

console.log(`\n${pass} passed, ${fail} failed`);

// Name matcher: similar level
import { compareName, nameTokens } from '../nameSearch/identityMatcher';
const t = nameTokens('Kingsley Anaab');
check('compareName exact', compareName(t, 'Kingsley Anaab') === 'exact');
check('compareName similar (Anaaba)', compareName(t, 'Kingsley Anaaba') === 'similar', compareName(t, 'Kingsley Anaaba'));
check('compareName Kingsley Mensah not similar', compareName(t, 'Kingsley Mensah') !== 'similar', compareName(t, 'Kingsley Mensah'));
check('compareName different person none/partial', ['partial', 'none'].includes(compareName(t, 'Kofi Boateng')));
console.log(`\n${pass} passed, ${fail} failed (with name matcher)`);

import { RelevanceEngine } from '../intelligence/relevanceEngine';
import { scoreText, MIN_SCORE } from '../explore/relevance';
const mu = (t: string, h: string) => RelevanceEngine.matchUsername(t, `(@${h})`, h);
check('username typo adjoate_ ~ adjoatee_ similar', mu('adjoatee_', 'adjoate_').isPartialMatch);
check('username exact stays exact', mu('adjoatee_', 'adjoatee_').isExactMatch);
check('short username no fuzzy (bob vs bib)', !mu('bob', 'bib').isPartialMatch);
check('xX_Kingsley_Xx exact only itself', mu('xX_Kingsley_Xx', 'xX_Kingsley_Xx').isExactMatch);
const st = scoreText('galemsey', { title: 'Fight against galamsey intensifies' });
check('explore fuzzy: galemsey matches galamsey', st.score >= MIN_SCORE, `${st.score} ${st.reasons.join('; ')}`);
const st2 = scoreText('galemsey', { title: 'Weather forecast for Accra' });
check('explore fuzzy: unrelated still hidden', st2.score < MIN_SCORE, String(st2.score));
console.log(`\n${pass} passed, ${fail} failed (all)`);
