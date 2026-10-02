import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  HelpCircle,
  Shield,
  Layers,
  UserCheck,
  FileText,
  Lock,
  Cpu,
  Server,
  X,
  Sparkles,
  FolderOpen,
  KeyRound,
  Coins
} from 'lucide-react';
import { COST_GROUPS } from '../../lib/searchCosts';
import './Help.css';

const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query || query.trim().length === 0) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="search-highlight">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

interface Card { title: string; desc: string; tags?: string[] }
interface Modality { badge: string; title: string; desc: string; queryExample?: string; list?: string[]; link?: string }
interface Tier { num: string; name: string; desc: string; platforms: string[] }
interface Step { num: string; title: string; desc: string }
interface Faq { q: string; a: string }

interface HelpSection {
  id: string;
  label: string;
  icon: React.ElementType;
  kind: 'cards' | 'modalities' | 'tiers' | 'steps' | 'tabs' | 'practices' | 'principles' | 'faq' | 'costs';
  title: string;
  lead: string;
  cards?: Card[];
  modalities?: Modality[];
  tiers?: Tier[];
  steps?: Step[];
  faqs?: Faq[];
  /** Link shown under the section. */
  more?: { to: string; label: string };
}

const SECTIONS: HelpSection[] = [
  {
    id: 'intro', label: 'Introduction & core principles', icon: Shield, kind: 'cards',
    title: 'Introduction & Core Principles',
    lead: 'The OSINT Intelligence Platform finds what is publicly available about a person, username, organisation, place or topic, and organises it into cases you can review, save and export. Everything comes from live public searches — nothing is invented.',
    cards: [
      { title: 'Real data only', desc: 'Every profile, post, article and image comes from a live search (SerpApi or a public platform API). No fake profiles, verification labels or placeholder results are ever generated. If nothing is found, the page says so.', tags: ['SerpApi', 'Public APIs', 'No synthetic data'] },
      { title: 'Similar is not the same person', desc: 'Names and usernames are shared by many people. Accounts that only look alike are shown separately as “Similar accounts” and never merged into the person you are investigating.', tags: ['Similar accounts', 'Identity separation'] },
      { title: 'Careful with quota', desc: 'Each search uses a small, fixed number of SerpApi searches. Identical searches are cached for 12 hours, the progress loader shows each step, and you can cancel at any time.', tags: ['12-hour cache', 'Quota', 'Cancel'] }
    ]
  },
  {
    id: 'tools', label: 'Search tools', icon: Search, kind: 'modalities',
    title: 'Search Tools',
    lead: 'Each search tool has its own page in the sidebar. All of them show live progress, can be cancelled, and can save results straight to a case.',
    modalities: [
      {
        badge: 'PROFILER', title: 'Name search', link: '/new-investigation',
        desc: 'Finds a person’s public profiles, web pages, news and images, and groups the results into possible identities.',
        queryExample: 'Kwame Mensah (optional: location “Accra”, organisation “Ghana Health Service”)',
        list: [
          'Searches Google with the exact name, then one query per platform group: LinkedIn, Facebook (two pages), Instagram, X, TikTok & Threads, YouTube, and GitHub/Medium/Reddit/Stack Overflow.',
          'Groups results into possible identities; pick one to create a case.',
          'Deep searches confirm the best Facebook and Instagram matches with their profile APIs.',
          'Abbreviations (UPSA, GRA) are resolved from what the results say they stand for; if several organisations share one, you choose.',
          'Organisations too: when Google’s knowledge panel (or at least two other signs) shows the name is a company, institution or association, an Organisation card is listed first, and its case gets an Organisation tab that reads the official website.'
        ]
      },
      {
        badge: 'PROFILER', title: 'Username search', link: '/new-investigation',
        desc: 'Finds accounts that use a handle, including spellings with different punctuation (99_humblechild, 99.humblechild_, 99-humblechild).',
        queryExample: '99_humblechild or @alex_dev99',
        list: [
          'Free direct checks: GitHub, Reddit, Mastodon, Bluesky, Docker Hub, npm, DEV, Medium, Telegram, Twitch, Vimeo, YouTube and Wikipedia.',
          'Searches Google, DuckDuckGo and Yahoo (which find punctuation variants), plus TikTok and YouTube.',
          'Handles that only look similar are listed as “Similar usernames”, not as the person’s own accounts.'
        ]
      },
      {
        badge: 'EXPLORE', title: 'Social search', link: '/search/social',
        desc: 'Public posts, pages and discussions on social platforms and forums, by keyword, date, country and language. Runs one query per platform so every platform gets its own results.',
        list: ['Platforms: X, Facebook, Instagram, TikTok, YouTube, LinkedIn, Reddit, Threads, Telegram, WhatsApp public groups, VK, Weibo.', 'Forums & discussions mode searches Google’s Forums filter (Reddit, Quora, Stack Exchange).']
      },
      {
        badge: 'EXPLORE', title: 'News', link: '/search/news',
        desc: 'News coverage from Google News and Bing News. Choosing a country shows only that country’s news edition. Several words are searched as an exact phrase, so every article really names your subject.'
      },
      {
        badge: 'EXPLORE', title: 'Media', link: '/search/media',
        desc: 'Images (Google & Bing Images) and videos (YouTube & Google Videos). Facial recognition is not connected yet.'
      },
      {
        badge: 'EXPLORE', title: 'Geo search', link: '/search/geo',
        desc: 'Everything public about a location: places and businesses (Google Maps, with reviews), news, social posts, web pages and events. With “Any country”, places with the same name in other countries are listed too.'
      },
      {
        badge: 'EXPLORE', title: 'Trends', link: '/search/trends',
        desc: 'Search interest over time and related queries (Google Trends), what is trending now in a country, and what news, social media and the web are saying about the topic.'
      }
    ]
  },
  {
    id: 'intelligence', label: 'Search intelligence (typos)', icon: Sparkles, kind: 'steps',
    title: 'Search Intelligence: Typos and “Did you mean”',
    lead: 'A misspelt search (“Kingley Anab”, “gaalemseyy”) used to return little or nothing. In Intelligent mode the platform checks the spelling first, then searches what you most likely meant — while always keeping your original search visible.',
    steps: [
      { num: '01', title: 'Intelligent mode (default)', desc: 'Before the main search, one Google check (cached for 12 hours) reads Google’s own spelling fix and the spellings the results use.' },
      { num: '02', title: 'Showing results for …', desc: 'When the correction is highly likely, the search runs on the corrected spelling and shows “Showing results for Kingsley Anaab · Search instead for Kingley Anab”.' },
      { num: '03', title: 'Did you mean …?', desc: 'When it is less certain, your original search runs and a “Did you mean” suggestion appears. Up to two alternatives are offered; they only run if you click them.' },
      { num: '04', title: 'Confidence and search path', desc: 'Each correction shows High, Medium or Low confidence and why. “Search path” shows every step: original → correction → sources → results. Related searches and matching cases of yours are shown as well.' },
      { num: '05', title: 'Precise mode', desc: 'Searches exactly what you typed, with no spelling check and no extra search. Usernames, quoted text and styled handles (xX_name_Xx) are never corrected in either mode. Set your default in Settings → Search defaults.' }
    ],
    more: { to: '/settings', label: 'Change your default search mode' }
  },
  {
    id: 'matching', label: 'Identity separation', icon: UserCheck, kind: 'steps',
    title: 'Identity Separation & Match Labels',
    lead: 'Common names return results from many unrelated people. The platform separates them instead of merging everything into one profile.',
    steps: [
      { num: '01', title: 'Signal extraction', desc: 'Reads handles, locations, employers, schools and co-mentioned names from each result. Post and video links (X posts, TikTok videos) are traced back to the account that owns them.' },
      { num: '02', title: 'Clustering into possible identities', desc: 'Results that share a handle, location or organisation are grouped into one possible identity card. You choose which identity to investigate.' },
      { num: '03', title: 'Match labels', desc: 'Exact match (the name matches), Likely match, Similar match (a close spelling, e.g. one letter different) and Possible match. Scores explain which signals were found.' },
      { num: '04', title: 'Similar accounts kept apart', desc: 'Similar names and usernames appear in their own “Similar accounts” section. Their posts and activity are never shown as belonging to the person you selected.' }
    ]
  },
  {
    id: 'sources', label: 'Platforms & sources', icon: Layers, kind: 'tiers',
    title: 'Platforms & Sources Covered',
    lead: 'Where each kind of search looks. The Sources page lists every source with what it returns, and its API endpoints tab shows every API the platform calls, with documentation links.',
    tiers: [
      { num: 'SERPAPI', name: 'Search engines', desc: 'Paid searches through SerpApi (cached 12 hours).', platforms: ['Google', 'Bing', 'DuckDuckGo', 'Yahoo', 'YouTube', 'Google News', 'Bing News', 'Google & Bing Images', 'Google Videos', 'Google Maps & Reviews', 'Google Trends', 'Facebook Profile', 'Instagram Profile'] },
      { num: 'SOCIAL', name: 'Social platforms', desc: 'Found through Google, some confirmed with profile APIs.', platforms: ['Facebook', 'Instagram', 'X (Twitter)', 'TikTok', 'LinkedIn', 'Threads', 'YouTube', 'Reddit', 'Telegram', 'WhatsApp groups', 'VK', 'Weibo', 'Quora', 'Stack Exchange'] },
      { num: 'FREE', name: 'Direct platform checks', desc: 'Free public APIs used by username search; no SerpApi quota.', platforms: ['GitHub', 'Reddit', 'Mastodon', 'Bluesky', 'Docker Hub', 'npm', 'DEV', 'Medium', 'Telegram', 'Twitch', 'Vimeo', 'YouTube', 'Wikipedia'] }
    ],
    more: { to: '/sources', label: 'Open the Sources page and API reference' }
  },
  {
    id: 'workspace', label: 'The case tabs', icon: FileText, kind: 'tabs',
    title: 'The Case Tabs',
    lead: 'Each case (investigation) is organised into 12 tabs, plus an Organisation tab in organisation cases. Tab counts are the number of items the tab shows.',
    steps: [
      { num: '01', title: 'Overview', desc: 'Summary of the selected identity: main profiles, key facts, evidence levels and the latest changes.' },
      { num: '01b', title: 'Organisation', desc: 'Organisation cases only. Facts gathered from Google’s knowledge panel, Wikidata, Google Maps, Google and Bing results, social platforms and the official website, cross-checked (confirmed by several sources, single source, or sources disagree) and split into eight sections; the official website — verified, probably official or could not be verified — and what its About, Services, Products, Leadership, Locations, Contact and News pages say; public profiles; and why it was recognised as an organisation. Anything no source gives is shown as “Not found”.' },
      { num: '02', title: 'Profiles', desc: 'The person’s own profiles on each platform, with open/closed link checks. Similar accounts are listed separately.' },
      { num: '03', title: 'Activity', desc: 'Public posts, videos, articles and code activity from the person’s own accounts, in date order.' },
      { num: '04', title: 'Associations', desc: 'Organisations, co-mentioned people and linked usernames.' },
      { num: '05', title: 'Sources', desc: 'Every source URL behind the case, exportable as CSV.' },
      { num: '06', title: 'Web', desc: 'Web pages linked to this identity, and pages that only mention the name.' },
      { num: '07', title: 'News', desc: 'News articles naming the subject, gathered automatically, with publisher and thumbnail.' },
      { num: '08', title: 'Images', desc: 'Public images of or about the subject, gathered automatically.' },
      { num: '09', title: 'Location', desc: 'Places public sources connect to the person, searched across the open web (Google, Bing, news, Google Maps, and on request videos, images and social posts), each with the source’s exact words: profile location, stated residence, hometown, workplace, listing or a place only mentioned. Pages are counted only when tied to this person; same-name pages are kept apart and nothing is guessed.' },
      { num: '10', title: 'Contact', desc: 'Public email addresses and phone numbers of the person: from their own profiles (bios, public email fields, business contact fields) and from Google, Bing, DuckDuckGo and social profiles — each with its source and the exact words. Only details a source shows; same-name pages are kept apart; nothing is generated.' },
      { num: '11', title: 'Metrics', desc: 'Result counts, what each search returned versus kept, and the full SerpApi search log.' },
      { num: '12', title: 'Audit', desc: 'Time-stamped log of every search and every change to the case, exportable as CSV.' }
    ]
  },
  {
    id: 'cases', label: 'Cases, history & analysis', icon: FolderOpen, kind: 'practices',
    title: 'Cases, History & Analysis',
    lead: 'Where your work is kept and how to find it again. All of it is stored in your own account.',
    steps: [
      { num: 'A', title: 'Save to case', desc: 'Every result list has a Save button. If you have no case yet, one is created for you automatically — you do not need to run the Profiler first. Find your cases under Investigations.' },
      { num: 'B', title: 'Search history', desc: 'Every search is saved, grouped by kind (name, username, social, news, images, geo, trends…). Open one to see its results, run it again, or open the case made from it. Corrections are shown as “Original → Correction”.' },
      { num: 'C', title: 'People', desc: 'People you track from a case, with quick access to their case. “View person” opens the saved case instantly without searching again.' },
      { num: 'D', title: 'Network & Content analysis', desc: 'Network shows how the people, usernames, organisations and websites in your cases connect, and compares two cases. Content analysis breaks saved results down by platform, type, date and words. Neither uses any searches.' },
      { num: 'E', title: 'Re-run and export', desc: 'Re-run a case’s searches to see what changed. Export a case as JSON, and its Sources and Audit lists as CSV.' }
    ]
  },
  {
    id: 'workflows', label: 'Pivoting & workflows', icon: Cpu, kind: 'practices',
    title: 'Pivoting & Investigative Workflows',
    lead: 'Pivoting means using what you found (a handle, a place, an organisation) to start the next search.',
    steps: [
      { num: 'A', title: 'Handle pivot', desc: 'Found a profile in a name search? Copy its handle (e.g. @johndoe_dev) and run a Username search to find the same person’s other accounts.' },
      { num: 'B', title: 'Narrow common names', desc: 'Add a location or organisation to a name search (e.g. Kwame Mensah + Accra). Each adds one search and filters out unrelated people.' },
      { num: 'C', title: 'Topic and place pivot', desc: 'Use News, Geo search and Trends to see what is being said about an organisation, place or event, restricted to one country when needed.' },
      { num: 'D', title: 'Keep the record', desc: 'Save findings to the case as you go and export the Sources and Audit CSVs for reporting.' }
    ]
  },
  {
    id: 'serpapi', label: 'SerpApi & quota', icon: Server, kind: 'faq',
    title: 'SerpApi, Quota & the Progress Loader',
    lead: 'Most searches run through SerpApi, which has a monthly search allowance. These are the costs and the ways the platform saves quota.',
    faqs: [
      { q: 'How many searches does a name search use?', a: 'Quick: 4. Standard: 9–10. Deep (the default): 9–12 — the 9 Google/YouTube searches plus up to 3 Facebook/Instagram profile confirmations. Plus 1 per location or organisation you add, and 1 spelling check in Intelligent mode. See Search costs for every search.' },
      { q: 'How many does a username search use?', a: 'Quick: 5, Standard: 11, Deep (the default): 14 SerpApi searches. The direct platform checks (GitHub, Reddit, TikTok and Snapchat profile pages, Mastodon, Bluesky and others) are free. See Search costs for every search.' },
      { q: 'And the other search pages?', a: 'Each page shows its cost before you search, and the Search costs section lists every one: e.g. News 1–2, Social 1 per selected platform (6 by default), Images or Videos 2, Geo 10–12, Trends 11–14.' },
      { q: 'How does caching work?', a: 'Identical requests are cached for 12 hours on the server, so running the same search again, re-opening results or re-running a case soon after does not use quota twice.' },
      { q: 'What does the progress loader show?', a: 'Each engine the search calls, with its own status (waiting, running, done, failed) and real progress. You can cancel at any time; a slow engine times out after 30 seconds and is retried once, so the page never freezes.' },
      { q: 'Where can I see my remaining quota?', a: 'The quota indicator reads your remaining monthly searches from the SerpApi Account API, which is free.' }
    ],
    more: { to: '/sources', label: 'See every engine and its documentation' }
  },
  {
    id: 'costs', label: 'Search costs (tokens)', icon: Coins, kind: 'costs',
    title: 'Search Costs: Tokens per Search',
    lead: 'Every search uses SerpApi searches (“tokens”) from your monthly quota. These are the exact numbers each search uses. A repeat of the same search within 12 hours is free, and a search you cancel stops using tokens for the steps that had not started.',
    cards: COST_GROUPS.flatMap(g => g.rows.map(r => ({ title: `${g.title}|${r.search}`, desc: `${r.tokens}|${r.notes}` })))
  },
  {
    id: 'account', label: 'Account & security', icon: KeyRound, kind: 'principles',
    title: 'Account, Sign-in & Security',
    lead: 'How your account and data are protected.',
    cards: [
      { title: 'Continue with Google', desc: 'Sign in with your Google account (or with email and password). Google and Firebase hold your credentials; this app never stores passwords. Guest access has been removed.' },
      { title: 'Protected sessions', desc: 'Every app page needs you to be signed in. You stay signed in on this device until you sign out. If your session expires or your account is disabled, you are signed out and asked to sign in again.' },
      { title: 'Protected searches', desc: 'The server checks your sign-in on every search, so nobody can use the search engine without an account. Searches are limited per account to prevent abuse.' },
      { title: 'Your data is yours', desc: 'Cases, tracked people, history and notifications are stored in your own account; database rules stop anyone else reading them. Settings → Data & privacy lets you export or delete everything.' }
    ]
  },
  {
    id: 'compliance', label: 'Legal & responsible use', icon: Lock, kind: 'principles',
    title: 'Legal Compliance & Responsible Use',
    lead: 'Guidelines for lawful, ethical open source intelligence.',
    cards: [
      { title: 'Public data only', desc: 'Only publicly indexed pages and public platform APIs are searched. Private accounts, private messages and non-public databases are never accessed, and the people you search are not notified.' },
      { title: 'Verify before you conclude', desc: 'Search snippets are summaries. Open the original source, compare several signals, and treat similar names and usernames as unconfirmed until evidence links them.' },
      { title: 'Chain of custody', desc: 'The Audit and Sources tabs keep original URLs, times and search parameters to support your reporting.' },
      { title: 'Lawful purpose', desc: 'Use the platform only for lawful, authorised investigations. Harassment, stalking and doxxing are prohibited.' }
    ]
  },
  {
    id: 'faq', label: 'FAQ & troubleshooting', icon: HelpCircle, kind: 'faq',
    title: 'Frequently Asked Questions',
    lead: 'Common questions and fixes.',
    faqs: [
      { q: 'Where can I find my saved cases?', a: 'Open Investigations in the sidebar. Cases created by “Save to case” from any search page are listed there too, newest first. Search history also links to the case made from each search.' },
      { q: 'How do keyword alerts work?', a: 'Open Alerts, press New alert and add up to 5 keywords (e.g. a hashtag or "Accra protest"), the sources (news and social platforms), a country and how often to check. The alert first shows what is already published (last 7 days), then checks again on its schedule and emails you only about new results. Emails go only to the account that created the alert. Each check uses SerpApi searches (shown before you save); alerts stop for the day at the daily alert limit and keep a reserve so the rest of the app keeps working. Results come from search engines, so news appears within minutes but social posts can take hours.' },
      { q: 'How do I export a case as a report?', a: 'Open the case and press Export (on a phone: ⋯ → Export PDF report), then Download PDF. The report is built from what the case already holds (no new searches): summary, identity or organisation details, profiles, activity, associations, locations, web and news, images, sources, metrics and the audit trail. Missing details are marked “Not found”, results you marked Raw are left out, and search-result, tracking, image and duplicate links are removed. CSV and JSON exports are still in the ⋯ menu.' },
      { q: 'Can I share a case with someone?', a: 'Yes. Open the case and press Share, then Create view-only link and Copy link. Anyone with the link can see every tab, the searches that were run and all the data found, without signing in, but they cannot search, change, track, re-run or export anything. The link always shows your latest changes. Press Stop sharing at any time and the link stops working.' },
      { q: 'A search found nothing. What now?', a: 'Check the “Did you mean” suggestion, try Intelligent mode if you used Precise, remove a location or organisation, or search the username instead of the name. News searches restricted to a country only show that country’s coverage — try “Any country”.' },
      { q: 'Why is an account under “Similar accounts”?', a: 'Its name or handle is close to, but not the same as, your subject’s (e.g. one letter different). It may be a different person, so its activity is kept apart until you confirm it.' },
      { q: 'Why did news about my subject not appear?', a: 'News engines match the exact phrase in the article text. If the article uses a different spelling, search that spelling or use Intelligent mode. Articles found only on the web appear in the Web tab.' },
      { q: 'It says “Too many searches in a short time”.', a: 'Each account can run a limited number of searches per 10 minutes. Wait a few minutes and try again.' },
      { q: 'It says my session has expired.', a: 'Sign in again. This happens after a password change, if your account was deleted or disabled, or if the server no longer accepts your sign-in.' },
      { q: 'Google sign-in was cancelled or blocked.', a: 'Allow pop-ups for this site and try again. If pop-ups stay blocked, the page goes to Google and comes back automatically.' },
      { q: 'Is facial recognition available?', a: 'Not yet. The Media page has a Facial recognition tab reserved for it; no face matching is done.' }
    ]
  }
];

const SUGGESTED = ['Did you mean', 'Username', 'Similar accounts', 'Save to case', 'Quota', 'Google sign-in', 'News', 'Trends'];

function sectionText(sec: HelpSection): string {
  return [
    sec.title, sec.lead,
    ...(sec.cards || []).flatMap(c => [c.title, c.desc, ...(c.tags || [])]),
    ...(sec.modalities || []).flatMap(m => [m.title, m.desc, m.queryExample || '', ...(m.list || [])]),
    ...(sec.tiers || []).flatMap(t => [t.name, t.desc, ...t.platforms]),
    ...(sec.steps || []).flatMap(s => [s.title, s.desc]),
    ...(sec.faqs || []).flatMap(f => [f.q, f.a])
  ].join(' ').toLowerCase();
}

export const HelpPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSections = useMemo(
    () => (normalizedQuery ? SECTIONS.filter(sec => sectionText(sec).includes(normalizedQuery)) : SECTIONS),
    [normalizedQuery]
  );

  // Highlight the section being read in the contents list.
  useEffect(() => {
    const els = filteredSections.map(s => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.id);
    }, { rootMargin: '0px 0px -70% 0px' });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [filteredSections]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hl = (t: string) => <Highlight text={t} query={searchQuery} />;

  const renderBody = (sec: HelpSection) => {
    switch (sec.kind) {
      case 'cards':
      case 'principles':
        return (
          <div className="hd-points">
            {sec.cards?.map(item => (
              <div key={item.title} className="hd-point">
                <h3>{hl(item.title)}</h3>
                <p>{hl(item.desc)}</p>
              </div>
            ))}
          </div>
        );
      case 'modalities':
        return (
          <div className="hd-tools">
            {sec.modalities?.map(mod => (
              <div key={mod.title} className="hd-tool">
                <div className="hd-tool-head">
                  <h3>{mod.link ? <Link to={mod.link}>{hl(mod.title)}</Link> : hl(mod.title)}</h3>
                  <span className="hd-tag">{mod.badge === 'PROFILER' ? 'Profiler' : 'Explore'}</span>
                </div>
                <p>{hl(mod.desc)}</p>
                {mod.queryExample && <p className="hd-example">Example: <code>{hl(mod.queryExample)}</code></p>}
                {mod.list && (
                  <ul className="hd-list">
                    {mod.list.map(li => <li key={li}>{hl(li)}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        );
      case 'tiers':
        return (
          <div className="hd-cols">
            {sec.tiers?.map(t => (
              <div key={t.num} className="hd-col">
                <h3>{hl(t.name)}</h3>
                <p>{hl(t.desc)}</p>
                <p className="hd-platforms">
                  {t.platforms.map((p, i) => (
                    <React.Fragment key={p}>
                      {i > 0 && <span aria-hidden="true"> · </span>}
                      <span className={normalizedQuery && p.toLowerCase().includes(normalizedQuery) ? 'hd-hit' : ''}>{p}</span>
                    </React.Fragment>
                  ))}
                </p>
              </div>
            ))}
          </div>
        );
      case 'steps':
      case 'practices':
        return (
          <ol className="hd-steps">
            {sec.steps?.map(step => (
              <li key={step.num}>
                <span className="hd-sn" aria-hidden="true">{/^\d+$/.test(step.num) ? Number(step.num) : step.num}</span>
                <div>
                  <b>{hl(step.title)}</b>
                  <p>{hl(step.desc)}</p>
                </div>
              </li>
            ))}
          </ol>
        );
      case 'tabs':
        return (
          <table className="hd-table">
            <thead><tr><th>Tab</th><th>What it shows</th></tr></thead>
            <tbody>
              {sec.steps?.map(tb => (
                <tr key={tb.num}><td><b>{hl(tb.title)}</b></td><td>{hl(tb.desc)}</td></tr>
              ))}
            </tbody>
          </table>
        );
      case 'costs':
        return (
          <>
            {COST_GROUPS.map(g => (
              <div key={g.title} className="hd-costs">
                <h3>{hl(g.title)}</h3>
                <table className="hd-table">
                  <thead><tr><th>Search</th><th>Tokens</th><th>What is included</th></tr></thead>
                  <tbody>
                    {g.rows.map(r => (
                      <tr key={r.search}><td><b>{hl(r.search)}</b></td><td className="hd-tokens">{hl(r.tokens)}</td><td>{hl(r.notes)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        );
      case 'faq':
        return (
          <div className="hd-faq">
            {sec.faqs?.map(f => (
              <details key={f.q} open={normalizedQuery !== ''}>
                <summary>{hl(f.q)}</summary>
                <p>{hl(f.a)}</p>
              </details>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="hd-root">
      <section className="hd-hero">
        <svg aria-hidden="true" className="hd-hero-art" width="420" height="260" viewBox="0 0 420 260">
          <g fill="none" stroke="#E8793F" strokeOpacity=".35"><circle cx="300" cy="120" r="70" /><circle cx="300" cy="120" r="130" strokeDasharray="3 7" /></g>
          <g stroke="#E8793F" strokeOpacity=".5"><line x1="300" y1="120" x2="220" y2="70" /><line x1="300" y1="120" x2="380" y2="60" /><line x1="300" y1="120" x2="250" y2="200" /></g>
          <circle cx="300" cy="120" r="9" fill="#E8793F" />
          <g fill="#FFFFFF" fillOpacity=".6"><circle cx="220" cy="70" r="4" /><circle cx="380" cy="60" r="4" /><circle cx="250" cy="200" r="4" /></g>
        </svg>
        <span className="hd-eyebrow">Help &amp; docs</span>
        <h1>How can we help?</h1>
        <label className="hd-search">
          <Search size={19} aria-hidden="true" />
          <input
            aria-label="Search help"
            placeholder="Search the guide, e.g. did you mean, similar accounts, save to case"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="hd-clear" onClick={() => setSearchQuery('')} aria-label="Clear search"><X size={16} /></button>
          )}
        </label>
        <div className="hd-popular">
          <span>Popular:</span>
          {SUGGESTED.map(term => (
            <button key={term} type="button" className="hd-chip" onClick={() => setSearchQuery(term)}>{term}</button>
          ))}
        </div>
      </section>

      <div className="hd-layout">
        <nav className="hd-nav" aria-label="Help contents">
          <span className="hd-nav-title">Contents</span>
          {SECTIONS.map(sec => {
            const isMatch = normalizedQuery === '' || filteredSections.some(fs => fs.id === sec.id);
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                disabled={!isMatch}
                className={`hd-nav-link${activeSection === sec.id ? ' on' : ''}`}
              >
                {sec.label}
              </button>
            );
          })}
        </nav>

        <main className="hd-doc">
          {normalizedQuery && (
            <p className="hd-status">
              {filteredSections.length} section{filteredSections.length === 1 ? '' : 's'} match “{searchQuery}”.{' '}
              <button type="button" className="hd-textbtn" onClick={() => setSearchQuery('')}>Show everything</button>
            </p>
          )}

          {filteredSections.length === 0 ? (
            <div className="hd-empty">
              <h2>Nothing found for “{searchQuery}”</h2>
              <p>Try one of these topics:</p>
              <div className="hd-popular hd-popular-light">
                {SUGGESTED.map(term => (
                  <button key={term} type="button" className="hd-chip" onClick={() => setSearchQuery(term)}>{term}</button>
                ))}
              </div>
            </div>
          ) : (
            filteredSections.map(sec => (
              <section key={sec.id} id={sec.id} className="hd-section">
                <h2>{hl(sec.title)}</h2>
                <p className="hd-lead">{hl(sec.lead)}</p>
                {renderBody(sec)}
                {sec.more && <Link className="hd-more" to={sec.more.to}>{sec.more.label} →</Link>}
              </section>
            ))
          )}

          <footer className="hd-foot">
            <span>Still stuck?</span> Read the plain-language <Link to="/guide">Guide</Link>, the <Link to="/sources">Sources &amp; API reference</Link> or the <Link to="/documentation">public documentation</Link>.
          </footer>
        </main>
      </div>
    </div>
  );
};
