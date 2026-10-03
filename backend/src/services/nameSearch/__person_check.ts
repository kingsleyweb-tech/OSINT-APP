/**
 * Offline check of the person pipeline: recorded-style SerpApi responses → name search → person record →
 * card + case. No network calls. Run: npx tsx src/services/nameSearch/__person_check.ts
 */
import { NameSearchEngine } from './nameSearchEngine';
import { buildIdentityPayload } from './nameInvestigationBuilder';
import { summarizeFacts, type PersonFact } from './personRecord';
import type { SerpCallResult, SerpEngine } from '../search/serpApiProvider';

let fails = 0;
const ok = (label: string, cond: boolean, detail?: unknown) => {
  if (!cond) fails++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${cond || detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`);
};

type Responder = (engine: SerpEngine, q: string, params: Record<string, string | number>) => any;
const mockSerp = (respond: Responder) => ({
  request: async (engine: SerpEngine, params: Record<string, string | number>): Promise<SerpCallResult> => {
    const q = String(params.q || params.search_query || params.profile_id || '');
    const data = respond(engine, q, params) ?? (engine === 'google_news' ? { news_results: [] } : { organic_results: [] });
    return { engine, params, data, error: null, fromCache: false, quotaExhausted: false };
  }
});
const organic = (...items: Array<{ link: string; title: string; snippet: string; date?: string }>) => ({
  organic_results: items.map((r, i) => ({ position: i + 1, ...r }))
});

async function run(name: string, respond: Responder) {
  const query = { searchType: 'name' as const, name };
  const out = await NameSearchEngine.execute(query, { searchDepth: 'deep', serp: mockSerp(respond) });
  const cards = out.identities.map(i => buildIdentityPayload(query, i, out, 'deep'));
  return { out, cards };
}

// ─── Case 1 / 3 / 6: a musician with Facebook + Instagram profiles and news ───
const ayaata: Responder = (engine, q) => {
  if (engine === 'facebook_profile') return { profile_results: { name: 'Prince Ayaata' } };
  if (engine === 'instagram_profile') return { profile_results: { full_name: 'Prince Ayaata', biography: 'Highlife musician. Kumasi', external_url: 'https://www.facebook.com/prince.ayaata' } };
  if (engine === 'google_news') return { news_results: [{ title: 'Prince Ayaata wins Best Highlife Act', link: 'https://www.myjoyonline.com/entertainment/2024/05/prince-ayaata-wins', source: { name: 'MyJoyOnline' }, date: '05/12/2024', snippet: 'Prince Ayaata, a highlife musician from Kumasi, won the award on Saturday.' }] };
  if (q.startsWith('site:facebook.com') && !q.includes('start')) return organic({ link: 'https://www.facebook.com/prince.ayaata', title: 'Prince Ayaata | Facebook', snippet: 'Prince Ayaata is a Ghanaian highlife musician based in Kumasi. 2,300 followers.' });
  if (q.startsWith('site:instagram.com')) return organic({ link: 'https://www.instagram.com/princeayaata_music/', title: 'Prince Ayaata (@princeayaata_music) • Instagram photos and videos', snippet: '5,120 Followers, 210 Posts - See Instagram photos and videos from Prince Ayaata (@princeayaata_music)' });
  if (q === '"Prince Ayaata"') return organic({ link: 'https://www.ghanamusic.com/news/prince-ayaata-new-single', title: 'Prince Ayaata drops new single "Ayekoo"', snippet: 'Award-winning Ghanaian musician Prince Ayaata has released a new single.', date: '3 days ago' });
  return undefined;
};

// ─── Case 2: news coverage only, no profiles ───
const nurse: Responder = (engine, q) => {
  if (engine === 'google_news') return { news_results: [{ title: 'Korle Bu nurse honoured', link: 'https://www.graphic.com.gh/news/general-news/2024/03/korle-bu-nurse-honoured.html', source: { name: 'Graphic Online' }, date: '03/02/2024', snippet: 'Ama Serwaa Bonsu, a nurse at Korle Bu Teaching Hospital, was honoured for 30 years of service.' }] };
  if (q === '"Ama Serwaa Bonsu"') return organic({ link: 'https://citinewsroom.com/2024/03/nurses-award-ceremony/', title: 'Nurses award ceremony held in Accra', snippet: 'Ama Serwaa Bonsu is a midwife and nurse based in Accra.' });
  return undefined;
};

// ─── Case 4: two different people with the same name ───
const mensah: Responder = (engine, q) => {
  if (engine === 'facebook_profile' || engine === 'instagram_profile') return { profile_results: {} };
  if (q.includes('linkedin.com')) return organic(
    { link: 'https://gh.linkedin.com/in/john-mensah-dev', title: 'John Mensah - Software Engineer - Hubtel | LinkedIn', snippet: 'Location: Accra · Experience: Hubtel · Education: KNUST' },
    { link: 'https://uk.linkedin.com/in/john-mensah-pastor', title: 'John Mensah - Pastor - Lighthouse Chapel | LinkedIn', snippet: 'Location: London · Experience: Lighthouse Chapel International' }
  );
  if (q.startsWith('site:facebook.com') ) return organic({ link: 'https://www.facebook.com/john.mensah.735', title: 'John Mensah | Facebook', snippet: 'John Mensah is a software engineer based in Accra.' });
  return undefined;
};

// ─── Case 5: the typed name is misspelt; the results agree on another spelling ───
const typo: Responder = (engine, q) => {
  if (engine === 'facebook_profile') return { profile_results: { name: 'Prince Ayaata' } };
  if (engine === 'instagram_profile') return { profile_results: { full_name: 'Prince Ayaata' } };
  if (q.startsWith('site:facebook.com')) return organic({ link: 'https://www.facebook.com/prince.ayaata', title: 'Prince Ayaata | Facebook', snippet: 'Prince Ayaata is a Ghanaian highlife musician based in Kumasi.' });
  if (q.startsWith('site:instagram.com')) return organic({ link: 'https://www.instagram.com/princeayaata_music/', title: 'Prince Ayaata (@princeayaata_music) • Instagram photos and videos', snippet: 'See Instagram photos and videos from Prince Ayaata' });
  if (q === '"Prince Ayata"') return organic({ link: 'https://www.ghanamusic.com/news/prince-ayaata-new-single', title: 'Prince Ayaata drops new single', snippet: 'Ghanaian musician Prince Ayaata has released a new single.' });
  return undefined;
};

(async () => {
  {
    const { out, cards } = await run('Prince Ayaata', ayaata);
    const persons = out.identities.filter(i => i.kind !== 'organization');
    ok('case 1: one person group', persons.length === 1, persons.map(p => [p.kind, p.profiles.length]));
    const p = persons[0];
    const card = cards.find(c => c.id === p.id)!;
    const inv = card.investigation;
    ok('case 3: Facebook and Instagram grouped', new Set(p.profiles.filter(x => x.relation !== 'similar').map(x => x.platform)).size === 2, p.profiles.map(x => x.platform));
    ok('stable person ID', /^p_[0-9a-f]{12}$/.test(p.id) && inv.personId === p.id && inv.person.personId === p.id, p.id);
    ok('occupation found', /musician/i.test(inv.person.best.occupation?.value || ''), inv.person.best);
    ok('location found', inv.person.best.location?.value === 'Kumasi', inv.person.best.location);
    ok('news attached to the person', inv.webAndNews.some((w: any) => w.metadata?.evidenceType === 'News'), inv.webAndNews.map((w: any) => w.metadata?.evidenceType));
    ok('case 6: sources and profiles in the case', inv.sources.length > 0 && inv.socialProfiles.length >= 2, [inv.sources.length, inv.socialProfiles.length]);
    ok('case 6: card = case (role, location, summary)', card.publicRole === inv.targetProfile.occupation && card.location === inv.targetProfile.location && card.summary === inv.quickSummary);
    ok('case 6: role not "Not stated"', !/not stated/i.test(inv.targetProfile.occupation), inv.targetProfile.occupation);
    ok('every fact has a source URL', inv.person.facts.every((f: PersonFact) => /^https?:\/\//.test(f.sourceUrl)));
    ok('confidence reason is evidence-based', /musician|profiles on/i.test(card.confidenceReason || ''), card.confidenceReason);
    ok('at most 2 follow-up calls', out.auditTrail.filter(a => a.purpose.startsWith('News coverage') || a.purpose.startsWith('Context:')).length <= 2);
    const again = await run('Prince Ayaata', ayaata);
    ok('same person ID on a second search', again.out.identities.find(i => i.kind !== 'organization')?.id === p.id);
  }
  {
    const { out, cards } = await run('Ama Serwaa Bonsu', nurse);
    ok('case 2: one web-only person', out.identities.length === 1 && out.identities[0].kind === 'web_only', out.identities.map(i => i.kind));
    const inv = cards[0].investigation;
    ok('case 2: role/occupation from news', /nurse|midwife/i.test(inv.targetProfile.occupation), inv.targetProfile.occupation);
    ok('case 2: Korle Bu as an association with source', inv.associations.some((a: any) => /Korle Bu/.test(a.name) && a.sourceUrl), inv.associations.map((a: any) => a.name));
    ok('case 2: sources collected', inv.sources.length >= 2, inv.sources.length);
  }
  {
    const { out } = await run('John Mensah', mensah);
    const groupOf = (url: string) => out.identities.find(i => i.profiles.some(p => p.profileUrl.includes(url)))?.id;
    ok('case 4: pastor and engineer kept apart', groupOf('john-mensah-pastor') !== groupOf('john-mensah-dev'), out.identities.map(i => [i.kind, i.profiles.map(p => p.profileUrl)]));
    ok('case 4: engineer LinkedIn + Facebook grouped (same occupation and place)', groupOf('john-mensah-dev') === groupOf('john.mensah.735'));
  }
  {
    const { out, cards } = await run('Prince Ayata', typo);
    ok('case 5: spelling the results agree on', out.correctedName === 'Prince Ayaata', out.correctedName);
    const card = cards.find(c => c.kind !== 'organization')!;
    // Nothing links the two accounts in this fixture, so they may stay in separate groups; neither is "similar".
    ok('case 5: profiles treated as matches, not "similar"', cards.reduce((n, c) => n + c.profilesCount, 0) >= 2 && cards.every(c => !c.similarAccountsCount), cards.map(c => c.profilesCount));
    ok('case 5: record populated', Boolean(card.investigation.person.best.occupation), card.investigation.person.best);
  }
  {
    const base = { sourceTitle: 't', sourceName: 's', confidence: 70, method: 'parser' as const, observedAt: '' };
    const { best } = summarizeFacts([
      { ...base, field: 'location', value: 'Accra', sourceUrl: 'https://news.example.com/a', tier: 'news' },
      { ...base, field: 'location', value: 'Accra', sourceUrl: 'https://other.example.org/b', tier: 'news' },
      { ...base, field: 'location', value: 'Kumasi', sourceUrl: 'https://www.facebook.com/x', tier: 'own-profile', method: 'profile' }
    ]);
    ok('precedence: own profile beats news', best.location?.value === 'Kumasi', best.location);
    ok('precedence: the other value kept as a conflict', (best.location?.conflicts || []).includes('Accra'), best.location?.conflicts);
  }
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
