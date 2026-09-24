import { resolveResultUrl, isRejection } from './urlResolution';
import { classifyUrl } from './pageClassifier';
import { compareName, nameTokens, compareHandle, parseTitle, textHasFullName, extractAttributes } from './identityMatcher';

let fails = 0;
const eq = (label: string, got: any, want: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  -> ${JSON.stringify(got)}${ok ? '' : `  (want ${JSON.stringify(want)})`}`);
};
const kind = (u: string) => classifyUrl(u).pageKind;

// URL resolution
const bingDest = 'https://www.linkedin.com/in/hubert-amponsah-123';
const bingLink = `https://www.bing.com/ck/a?!&&p=abc&u=a1${Buffer.from(bingDest).toString('base64url')}&ntb=1`;
const r1 = resolveResultUrl({ link: bingLink });
eq('bing redirect unwrapped', isRejection(r1) ? r1.reason : r1.url, bingDest);
const r2 = resolveResultUrl({ link: 'https://www.google.com/url?q=https://www.facebook.com/hubert.amponsah&sa=U' });
eq('google redirect unwrapped', isRejection(r2) ? r2.reason : r2.url, 'https://www.facebook.com/hubert.amponsah');
eq('google search rejected', isRejection(resolveResultUrl({ link: 'https://www.google.com/search?q=hubert' })), true);
eq('serpapi rejected', isRejection(resolveResultUrl({ link: 'https://serpapi.com/search.json?q=x' })), true);
const r3 = resolveResultUrl({ link: 'https://gh.linkedin.com/in/Hubert-Amponsah?utm_source=x&trk=abc' });
eq('linkedin url keeps original host', !isRejection(r3) && r3.url, 'https://gh.linkedin.com/in/Hubert-Amponsah');
eq('linkedin canonical', !isRejection(r3) && r3.canonicalUrl, 'https://www.linkedin.com/in/hubert-amponsah');
const r4 = resolveResultUrl({ link: 'https://m.facebook.com/profile.php?id=10001234&mibextid=abc' });
eq('fb profile.php keeps id', !isRejection(r4) && r4.canonicalUrl, 'https://www.facebook.com/profile.php?id=10001234');
eq('scholar not rejected', isRejection(resolveResultUrl({ link: 'https://scholar.google.com/citations?user=abc' })), false);

// Platform detection (exact host matching)
eq('netflix.com is not X', classifyUrl('https://www.netflix.com/title/123').platformId, null);
eq('twitter.com is X', classifyUrl('https://twitter.com/hubert').platformId, 'soc-x');

const cases: Array<[string, string]> = [
  ['https://www.facebook.com/hubert.amponsah', 'person_profile'],
  ['https://www.facebook.com/public/Hubert-Amponsah', 'search_page'],
  ['https://www.facebook.com/people/Hubert-Amponsah/100012345/', 'person_profile'],
  ['https://www.facebook.com/groups/12345', 'group'],
  ['https://www.facebook.com/watch/?v=1', 'video'],
  ['https://www.facebook.com/reel/123', 'video'],
  ['https://www.facebook.com/marketplace/item/1', 'platform_page'],
  ['https://www.facebook.com/hubert.amponsah/posts/123', 'post'],
  ['https://www.facebook.com/pages/Hubert/123', 'organization_page'],
  ['https://www.instagram.com/hubert_amp/', 'person_profile'],
  ['https://www.instagram.com/p/Cabc123/', 'post'],
  ['https://www.instagram.com/reel/Cabc123/', 'video'],
  ['https://www.instagram.com/explore/tags/hubert/', 'search_page'],
  ['https://www.instagram.com/accounts/login/', 'platform_page'],
  ['https://x.com/hamponsah', 'person_profile'],
  ['https://x.com/hamponsah/status/1', 'post'],
  ['https://x.com/search?q=hubert', 'search_page'],
  ['https://x.com/hashtag/ghana', 'search_page'],
  ['https://www.linkedin.com/in/hubert-amponsah-1a2b3c', 'person_profile'],
  ['https://www.linkedin.com/pub/dir/Hubert/Amponsah', 'search_page'],
  ['https://www.linkedin.com/company/kpmg', 'organization_page'],
  ['https://www.linkedin.com/posts/hubert_activity-1', 'post'],
  ['https://www.linkedin.com/pulse/some-article', 'article'],
  ['https://www.linkedin.com/jobs/view/1', 'search_page'],
  ['https://www.tiktok.com/@hubert', 'person_profile'],
  ['https://www.tiktok.com/@hubert/video/1', 'video'],
  ['https://www.tiktok.com/discover/hubert-amponsah', 'search_page'],
  ['https://www.youtube.com/@hubertamponsah', 'channel'],
  ['https://www.youtube.com/channel/UCabc', 'channel'],
  ['https://www.youtube.com/watch?v=abc', 'video'],
  ['https://www.youtube.com/shorts/abc', 'video'],
  ['https://www.youtube.com/results?search_query=x', 'search_page'],
  ['https://github.com/hamponsah', 'person_profile'],
  ['https://github.com/hamponsah/repo', 'repository'],
  ['https://github.com/topics/ghana', 'search_page'],
  ['https://www.reddit.com/user/hubert', 'person_profile'],
  ['https://www.reddit.com/r/ghana', 'community'],
  ['https://www.reddit.com/r/ghana/comments/1/x', 'post'],
  ['https://medium.com/@hubert', 'person_profile'],
  ['https://medium.com/@hubert/my-story-123', 'article'],
  ['https://www.myjoyonline.com/news/2024/05/hubert-amponsah-wins', 'article']
];
cases.forEach(([u, k]) => eq(`kind ${u}`, kind(u), k));
eq('ig handle', classifyUrl('https://www.instagram.com/hubert_amp/').handle, 'hubert_amp');

const t = nameTokens('Hubert Amponsah');
eq('exact', compareName(t, 'Hubert Amponsah'), 'exact');
eq('honorific', compareName(t, 'Dr. Hubert Amponsah'), 'exact');
eq('reordered', compareName(t, 'Amponsah Hubert'), 'reordered');
eq('middle name', compareName(t, 'Hubert Kofi Amponsah'), 'contains_full');
eq('one word only', compareName(t, 'Hubert Smith'), 'partial');
eq('prefix does not match', compareName(nameTokens('King Anaab'), 'Kingsley Anaab'), 'partial');
eq('long title not a name', compareName(t, 'Friends of the late Hubert Amponsah memorial group page'), 'partial');
eq('handle full', compareHandle(t, 'hubert.amponsah'), 'full');
eq('handle reversed', compareHandle(t, 'amponsah_hubert99'), 'full');
eq('handle initials', compareHandle(t, 'hamponsah'), 'initials');
eq('handle unrelated', compareHandle(t, 'kwame123'), 'none');
eq('text full', textHasFullName(t, 'Photo by Hubert Amponsah in Accra'), true);
eq('text split', textHasFullName(t, 'Hubert went home. Amponsah stayed'), false);

eq('ig title', parseTitle('Hubert Amponsah (@hubert_amp) • Instagram photos and videos'), { nameCandidates: ['Hubert Amponsah'], titleHandle: 'hubert_amp', extraSegments: [] });
eq('gh title', parseTitle('hamponsah (Hubert Amponsah) · GitHub').nameCandidates, ['Hubert Amponsah', 'hamponsah']);
eq('x title', parseTitle('Hubert Amponsah (@hamponsah) / X').titleHandle, 'hamponsah');
eq('li attrs', extractAttributes('prof-linkedin', 'Hubert Amponsah - Senior Accountant - KPMG | LinkedIn',
  'Experience: KPMG Ghana · Education: University of Ghana · Location: Accra · 500+ connections on LinkedIn.'),
  { organization: 'KPMG Ghana', education: 'University of Ghana', location: 'Accra', headline: 'Senior Accountant' });

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails ? 1 : 0);
