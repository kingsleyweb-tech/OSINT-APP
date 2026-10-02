import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import '../Help/Help.css';

/**
 * Plain-language guide to the whole application: what it is for, every sidebar item, every search type,
 * every case tab, and what the labels and "not found" states mean. Keep it in step with the app —
 * it must only describe what the app really does.
 */

interface Row { term: string; text: string; link?: string }
interface GuideSection { id: string; label: string; title: string; lead: string; rows?: Row[]; points?: Row[]; head?: [string, string] }

const SECTIONS: GuideSection[] = [
  {
    id: 'about', label: 'What this app is for', title: 'What this app is for',
    lead: 'This app helps you find what is publicly available on the internet about a person, a username or an organisation, and keeps everything you find in one place called a case (investigation).',
    points: [
      { term: 'It only uses public information', text: 'Everything comes from live public searches (Google, Bing, DuckDuckGo, news, maps, images, social media pages) and from public pages such as an organisation’s own website. Private accounts, private messages and private databases are never accessed.' },
      { term: 'Nothing is made up', text: 'The app never invents profiles, locations, websites, contact details, gender or relationships. Every item shows where it came from, with a link you can open. When nothing is found, the page says so.' },
      { term: 'It keeps look-alikes apart', text: 'Many people share a name. Results that only look similar are shown separately and are never mixed into the person or organisation you are investigating.' },
      { term: 'You decide what is true', text: 'The app collects and sorts evidence. You review it, mark what you have checked, and keep a record of every step.' }
    ]
  },
  {
    id: 'start', label: 'Getting started', title: 'Getting started in 4 steps',
    lead: 'The usual way to use the app.',
    points: [
      { term: '1. Search', text: 'Go to New Investigation (or the search box on the Dashboard), choose Name or Username, type what you are looking for and press Search.' },
      { term: '2. Pick the right result', text: 'The results are grouped into cards: one card per possible person — or one Organisation card when the name belongs to a company or institution. Choose the card that matches who you are looking for.' },
      { term: '3. Open the case', text: 'Choosing a card creates a case. The case has tabs (Overview, Profiles, Location, Contact…) that show everything found, each with its source.' },
      { term: '4. Review and keep a record', text: 'Mark items as Relevant or Validated once you have checked them, save findings from the other search pages, re-run the searches later to see what changed, and export the case.' }
    ]
  },
  {
    id: 'sidebar', label: 'The sidebar, button by button', title: 'The sidebar, button by button',
    lead: 'Every item in the menu on the left (on phones, in the menu at the bottom).',
    head: ['Button', 'What it does'],
    rows: [
      { term: 'Dashboard', link: '/dashboard', text: 'Your start page: a quick search box, your recent investigations, your search activity and the sources used most.' },
      { term: 'New Investigation', link: '/new-investigation', text: 'Start a Name or Username search. This is where every case begins.' },
      { term: 'Investigations', link: '/investigations', text: 'All your cases, newest first. Open, search or delete them here.' },
      { term: 'People', link: '/people', text: 'People you chose to “track” from a case, with a shortcut back to their case.' },
      { term: 'Alerts', link: '/alerts', text: 'Keyword alerts: watch news and social platforms for your keywords on a schedule, and get an email (only you) when new results appear. Open an alert to see all its results, the new ones marked NEW.' },
      { term: 'Social search', link: '/search/social', text: 'Public posts and discussions on social platforms and forums by keyword, with date, country and language filters.' },
      { term: 'News', link: '/search/news', text: 'News articles from Google News and Bing News, optionally for one country.' },
      { term: 'Media', link: '/search/media', text: 'Public images and videos about a subject.' },
      { term: 'Geo search', link: '/search/geo', text: 'Everything public about a place: businesses and places on Google Maps (with reviews), news, social posts, web pages and events, on a map with a satellite view.' },
      { term: 'Trends', link: '/search/trends', text: 'How much people search for a topic over time and by region, related searches and topics, and what is trending now.' },
      { term: 'Network', link: '/analyse/network', text: 'Shows how the people, usernames, organisations and websites in your cases connect, and compares two cases. Uses no searches.' },
      { term: 'Content analysis', link: '/analyse/content', text: 'Charts of your saved results: by month, platform, type, website, hashtags, most active accounts, languages, locations and a word cloud. Uses no searches.' },
      { term: 'Search history', link: '/history', text: 'Every search you ran. Open its results again, run it again, or open the case made from it.' },
      { term: 'Sources', link: '/sources', text: 'Every data source the app uses, what it returns, and the API reference.' },
      { term: 'Guide', link: '/guide', text: 'This page.' },
      { term: 'Help & Docs', link: '/help', text: 'The detailed manual, including the exact number of search tokens each search uses.' },
      { term: 'Settings', link: '/settings', text: 'Your profile, security, notifications, search defaults (for example Intelligent or Precise spelling mode) and data & privacy (export or delete your data).' }
    ]
  },
  {
    id: 'search-types', label: 'Search types', title: 'Search types and what they return',
    lead: 'The two ways to start a case, plus the search pages you can use at any time.',
    head: ['Search', 'What it returns'],
    rows: [
      { term: 'Name search', text: 'Searches Google and the main platforms (LinkedIn, Facebook, Instagram, X, TikTok, Threads, YouTube, GitHub and others) for the exact name. Results are grouped into possible people (identity cards). You can add a location or an organisation to narrow down a common name. If the name belongs to an organisation, an Organisation card appears first (see Organisations below).' },
      { term: 'Username search', text: 'Looks for accounts using a handle (for example 99_humblechild) on many platforms, including spellings with different dots, dashes and underscores. Handles that only look similar are listed as “Similar usernames”, not as the person’s accounts.' },
      { term: 'Social, News, Media, Geo, Trends', text: 'Topic searches that are not tied to one person. Their results can be saved into a case with “Save to case”. If you have no case yet, one is created for you.' },
      { term: 'Keyword alert', text: 'Not a one-off search: it re-checks news and social platforms for your keywords on a schedule and emails you only new results. The first check shows the last 7 days.' },
      { term: '“Did you mean”', text: 'In Intelligent mode a misspelt search is checked first. You may see “Showing results for …” (with a link to search your original spelling) or a “Did you mean” suggestion. Usernames are never corrected.' }
    ]
  },
  {
    id: 'organisations', label: 'Organisations', title: 'Searching for an organisation',
    lead: 'Type an organisation’s name in a Name search — for example “Microsoft”, “Ghana Armed Forces” or “Soko Aerial”. The app decides whether the results describe an organisation or a person, using what the search already returned (no extra cost).',
    points: [
      { term: 'How it decides', text: 'Strong sign: Google’s knowledge panel for exactly that name describes a company, institution, association, government body and so on. Otherwise it needs at least two weaker signs: a LinkedIn company page, a Facebook or Instagram organisation page with the name, a website whose address matches the name, or an organisation word in the name (Ltd, University, Forces…). If the knowledge panel describes a person, it is treated as a person.' },
      { term: 'What you see', text: 'An “Organisation” card is listed first, marked with a purple Organisation badge. Person cards with the same name are still shown underneath, because someone may share the name.' },
      { term: 'Many sources, cross-checked', text: 'When an organisation case opens, the app also searches Google Maps, Google (two pages), Google News, DuckDuckGo, social platforms, YouTube and Wikidata (and searches again automatically if that failed), then reads the official website. Every fact is kept with its source. When two or more independent sources give the same value it is marked “Confirmed by N independent sources”; one source is “Single source”; when sources give different answers (for example two founding years) both are shown under “Sources disagree” — the app never picks one silently.' },
      { term: 'Abbreviations', text: 'Searching a short form such as UPSA or GRA: the app reads what the results say it stands for (“University of Professional Studies, Accra (UPSA)”) and counts how many independent sites agree. One clearly supported full name is used (and shown above the results); if several organisations use the abbreviation, the page says “Multiple possible entities found” and lets you choose; with only one source it is offered as a suggestion, never assumed.' },
      { term: 'Suggestions while typing', text: 'In a Name search, matching organisations and institutions appear under the search box with a short description (from Wikidata, no search tokens). Pick one to search its full name.' },
      { term: 'Entity type', text: 'What kind of organisation it is — university, college, school or other educational institution; research institution; company or brand; government agency; military organisation; international organisation; NGO, foundation, association or professional body; hospital; religious, media or sports organisation. It is worked out from what the sources say, not from the name: Google’s knowledge panel and Wikidata, the official website’s title, description and About page (e.g. membership language for an association, admissions for a university), the Google Maps category, search-result descriptions and the web address (.edu, .gov, .mil). Each source counts once; the most specific well-supported type is shown with its broader type (e.g. University · Educational institution) and “Strong evidence”, “Possible match” or “Not established”. Close alternatives are listed. With too little evidence it stays “Organisation”. Section names follow the type.' },
      { term: 'What is collected', text: 'Official name, type, description, industry, headquarters and other locations, official website, public social profiles, public contact details, key people (only when the knowledge panel or the website names them), products and services, news, images and pages that mention it — each with its source.' },
      { term: 'Similar names are not merged', text: 'The knowledge panel and the website are only used when their name matches the searched name. An organisation with a similar name is never added.' }
    ]
  },
  {
    id: 'website', label: 'Website intelligence', title: 'Website intelligence (organisations)',
    lead: 'For an organisation, the app looks for its official website and reads its public pages. Reading the website uses no search tokens.',
    points: [
      { term: 'Finding the website', text: 'The website listed in Google’s knowledge panel is used first. Otherwise a search result whose address matches the organisation’s name is used, marked “not yet confirmed”.' },
      { term: 'Checking it is official', text: 'Before its details are treated as the organisation’s, the site is checked: listed in the knowledge panel, the organisation’s name in the page title or site name, the site’s own structured data naming the organisation, and the address matching the name. Two or more: Verified. One: Probably official. None: Could not be verified — then its details are shown for reference only and are not attributed to the organisation.' },
      { term: 'Pages read', text: 'Home, About, Services, Products, Leadership / team, Locations, Contact and News pages when the site has them. For each page you see its title, link, description, opening text and headings (such as service names). A page type the site does not have shows “Not found on the website”.' },
      { term: 'Leadership from the website', text: 'Leaders are read from the website’s leadership, command, management or board pages when a page names a person next to a role (e.g. “Lieutenant General … — Chief of the Defence Staff”). People who only appear in news or search results next to the organisation are listed separately, with the role as written, because they may belong to another body.' },
      { term: 'Units and divisions', text: 'The parts of an organisation — e.g. the Army, Navy and Air Force of an armed forces, the colleges of a university, the divisions of a company — from Wikidata, from the official website’s own menus and departments pages, and from sentences such as “consisting of the Army, Navy and Air Force”. The same unit named differently by different sources (“ARMY”, “Ghana Army”) is counted once, with every source.' },
      { term: 'Official, related and third-party websites', text: 'The official website is the one the sources agree on and the site itself confirms. Related websites are units, affiliated bodies and portals the official site links to; third-party sources are news, encyclopaedias and directories that write about the organisation.' },
      { term: 'Where the details go', text: 'Emails and phone numbers from a verified or probable website appear in the Contact tab; addresses appear in the Location tab; linked social media accounts appear under Public profiles.' },
      { term: 'Safety', text: 'Only public web addresses are read (never private or internal networks), a few pages at most, with size and time limits.' }
    ]
  },
  {
    id: 'tabs', label: 'Case tabs', title: 'The tabs inside a case',
    lead: 'A case is split into tabs so that nothing is dumped on one page. The number next to a tab is how many items it shows.',
    head: ['Tab', 'What it shows'],
    rows: [
      { term: 'Overview', text: 'A summary: for a person — name, location, role, main platforms, last activity, associations, public contact and gender. For an organisation — its type at the top, then ten short cards (summary, industry, headquarters & locations, products & services, website & online presence, leadership, news & media, activities, key sources, verification), each opening the matching section of the Organisation tab.' },
      { term: 'Organisation', text: 'Only in organisation cases. Eight sections: Summary (name, other names, type, industry, founded, employees, parent and units), Headquarters & locations (with Google Maps listings, coordinates and opening hours), Products & services, Leadership, Website & online presence, News & media (news, web mentions, videos), Activities & events (events, projects, partnerships, announcements, publications, awards found in the news and pages) and Sources & verification (what each source returned and where sources agree or disagree).' },
      { term: 'Profiles', text: 'The subject’s own accounts on each platform, with a link check and, for people, gender only when the profile itself states it. Similar accounts are listed separately; clicking one starts a new investigation about that person.' },
      { term: 'Activity', text: 'Public posts, videos, articles and code activity from the subject’s own accounts, in date order.' },
      { term: 'Associations', text: 'Organisations, people named together with the subject, and linked usernames — each with the source that connects them.' },
      { term: 'Sources', text: 'Every web address behind the case, with type and evidence level. Can be exported as CSV.' },
      { term: 'Web', text: 'Web pages about the subject, separated into pages linked to this identity and pages that only mention the name.' },
      { term: 'News', text: 'News articles naming the subject (searched automatically the first time you open it).' },
      { term: 'Images', text: 'Public images of or about the subject (searched automatically the first time you open it).' },
      { term: 'Location', text: 'Places that public sources connect to the subject, each with the source’s exact words and a type: profile location, stated residence, hometown, workplace, organisation location, event, post, listing or a place only mentioned. Nothing is guessed from names.' },
      { term: 'Contact', text: 'Public email addresses and phone numbers shown on the subject’s own profiles, on pages tied to them, or (organisations) on their official website and knowledge panel — each with its source and exact words.' },
      { term: 'Metrics', text: 'How many results each search returned and kept, and the full search log.' },
      { term: 'Audit', text: 'A time-stamped record of every search and every change you made to the case. Can be exported as CSV.' }
    ]
  },
  {
    id: 'findings', label: 'Notes & findings', title: 'Recording your findings',
    lead: 'There is no separate notes tab. You record what you have checked directly on the evidence, and the case keeps the record for you.',
    points: [
      { term: 'Evidence levels', text: 'Every profile, page and source has a level: Raw result (found by a search, not reviewed), Relevant (the default for kept results) and Validated (you checked it yourself). Change the level on any item; the Overview and Sources tabs count them.' },
      { term: 'Save to case', text: 'On the Social, News, Media, Geo and Trends pages, “Save to case” adds a result to a case so your findings stay together.' },
      { term: 'Audit trail', text: 'Every search, every level change and every save is written to the Audit tab with the time, so you can show how you reached a conclusion.' },
      { term: 'Re-run and export', text: '“Re-run searches” checks again and reports what is new or no longer found (“previously discovered”). Export the case as JSON, and its Sources and Audit lists as CSV, for your report.' }
    ]
  },
  {
    id: 'labels', label: 'Labels & indicators', title: 'What the labels and indicators mean',
    lead: 'The small labels you see on cards, rows and tabs.',
    head: ['Label', 'Meaning'],
    rows: [
      { term: 'Verified · Strong evidence · Possible match · Mention only · Uncertain', text: 'How well a search-result card is supported by the evidence found. It is not proof — open the sources to check.' },
      { term: 'Profile match · Likely match · Possible match', text: 'How strongly the evidence ties a profile to the subject (shown on each profile). Possible match means it may be someone else.' },
      { term: 'Organisation (purple badge)', text: 'The card describes an organisation, not a person.' },
      { term: 'Raw result · Relevant · Validated', text: 'The evidence level (see Notes & findings).' },
      { term: 'Reachable · Unreachable · Unverifiable · Not checked', text: 'Whether the link still opens. Unverifiable means the site blocks automatic checks — open it yourself.' },
      { term: 'Location: Stated on the profile · Reported by a source · Mentioned only · Unconfirmed', text: 'How strongly a source connects a place to the subject. Unconfirmed means a same-name page not tied to this identity.' },
      { term: 'Contact: On the person’s own profile · Next to the person on a linked page · Unconfirmed', text: 'Where an email or phone number was shown. For organisations, “Official website” and “Google knowledge panel” are shown as the source.' },
      { term: 'Website: Verified · Probably official · Could not be verified', text: 'How sure the app is that a website belongs to the organisation (see Website intelligence).' },
      { term: 'Gender', text: 'Shown only when a profile itself states it (pronouns such as she/her, or a gender field). Never guessed from a name or photo.' },
      { term: 'Similar accounts / Similar usernames', text: 'Accounts that look alike but are not confirmed as the subject. Their activity is never counted as the subject’s. In the Profiles tab, click one to search that account and open a separate investigation about that person (the icon on the right opens the profile itself).' }
    ]
  },
  {
    id: 'empty', label: 'Not found & unverified', title: 'When something is not found or not verified',
    lead: 'An empty answer is still an answer. These messages mean the app looked and did not find a source — it will not fill the gap with a guess.',
    head: ['Message', 'Meaning'],
    rows: [
      { term: 'Not found / Not found in the sources', text: 'The searches and pages checked do not give this detail.' },
      { term: 'Not found on the website', text: 'The organisation’s website has no page of that kind (for example no Leadership page).' },
      { term: 'Not stated / Not publicly stated', text: 'The subject’s own profiles do not state it (used for gender, role and location).' },
      { term: 'Not applicable', text: 'The detail does not apply — for example gender or age for an organisation.' },
      { term: 'Could not be verified / not yet confirmed', text: 'Something was found but nothing confirms it belongs to the subject. It is shown for reference only.' },
      { term: 'Unable to retrieve / Could not be read', text: 'A source or website did not respond or refused the request. This is not the same as “nothing found” — try again later.' },
      { term: 'Unconfirmed — may be another person', text: 'A page with the same name that nothing ties to this identity.' }
    ]
  },
  {
    id: 'costs', label: 'Search tokens', title: 'Search tokens',
    lead: 'Most searches use SerpApi searches (“tokens”) from a monthly allowance. Each search page shows its cost before you search, and repeating the same search within 12 hours is free. Organisation detection and reading an organisation’s website use no tokens.',
    points: [
      { term: 'Exact numbers', text: 'Help & Docs → “Search costs (tokens)” lists the exact number for every search and every automatic tab.', link: '/help' }
    ]
  }
];

function sectionText(s: GuideSection): string {
  return [s.title, s.lead, ...(s.rows || []).flatMap(r => [r.term, r.text]), ...(s.points || []).flatMap(p => [p.term, p.text])].join(' ').toLowerCase();
}

export const GuidePage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(SECTIONS[0].id);
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => (q ? SECTIONS.filter(s => sectionText(s).includes(q)) : SECTIONS), [q]);

  useEffect(() => {
    const els = shown.map(s => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '0px 0px -70% 0px' });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [shown]);

  const go = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const term = (r: Row) => (r.link ? <Link to={r.link}>{r.term}</Link> : r.term);

  return (
    <div className="hd-root">
      <section className="hd-hero">
        <span className="hd-eyebrow">Guide</span>
        <h1>How this app works</h1>
        <label className="hd-search">
          <Search size={19} aria-hidden="true" />
          <input aria-label="Search the guide" placeholder="Search the guide, e.g. organisation, location, validated" value={query} onChange={e => setQuery(e.target.value)} />
          {query && <button type="button" className="hd-clear" onClick={() => setQuery('')} aria-label="Clear search"><X size={16} /></button>}
        </label>
      </section>

      <div className="hd-layout">
        <nav className="hd-nav" aria-label="Guide contents">
          <span className="hd-nav-title">Contents</span>
          {SECTIONS.map(s => (
            <button key={s.id} type="button" onClick={() => go(s.id)} disabled={q !== '' && !shown.includes(s)} className={`hd-nav-link${active === s.id ? ' on' : ''}`}>
              {s.label}
            </button>
          ))}
        </nav>

        <main className="hd-doc">
          {q && (
            <p className="hd-status">
              {shown.length} section{shown.length === 1 ? '' : 's'} match “{query}”.{' '}
              <button type="button" className="hd-textbtn" onClick={() => setQuery('')}>Show everything</button>
            </p>
          )}
          {shown.length === 0 && (
            <div className="hd-empty"><h2>Nothing found for “{query}”</h2><p>Try another word, or read the <Link to="/help">Help &amp; Docs</Link>.</p></div>
          )}
          {shown.map(s => (
            <section key={s.id} id={s.id} className="hd-section">
              <h2>{s.title}</h2>
              <p className="hd-lead">{s.lead}</p>
              {s.points && (
                <div className="hd-points">
                  {s.points.map(p => <div key={p.term} className="hd-point"><h3>{term(p)}</h3><p>{p.text}</p></div>)}
                </div>
              )}
              {s.rows && (
                <table className="hd-table">
                  <thead><tr><th>{s.head?.[0] || 'Item'}</th><th>{s.head?.[1] || 'Meaning'}</th></tr></thead>
                  <tbody>{s.rows.map(r => <tr key={r.term}><td><b>{term(r)}</b></td><td>{r.text}</td></tr>)}</tbody>
                </table>
              )}
            </section>
          ))}
          <footer className="hd-foot">
            <span>Need more detail?</span> Read the <Link to="/help">Help &amp; Docs</Link> or the <Link to="/sources">Sources &amp; API reference</Link>.
          </footer>
        </main>
      </div>
    </div>
  );
};
