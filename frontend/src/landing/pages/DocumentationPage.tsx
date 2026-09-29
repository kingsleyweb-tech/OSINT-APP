import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

type Category = 'Overview' | 'Search' | 'Results' | 'Cases' | 'Platform' | 'Ethics & Help';

interface DocSection {
  id: string;
  label: string;
  category: Category;
  title: string;
  paragraphs: string[];
  list?: string[];
  ordered?: boolean;
  code?: string[];
}

const DOCS: DocSection[] = [
  {
    id: 'introduction', label: 'Platform introduction', category: 'Overview', title: 'Platform Introduction',
    paragraphs: [
      'The OSINT Investigation Platform is an open-source intelligence workspace for investigators, analysts, journalists and researchers. It searches public sources for a person, username, organisation, place or topic and organises what it finds into cases you can review, save and export.',
      'Searches run live through SerpApi (Google, Bing, DuckDuckGo, Yahoo, YouTube, News, Images, Maps and Trends) and free public platform APIs (GitHub, Reddit, Mastodon, Bluesky and others). Nothing is invented: when nothing is found, the platform says so.'
    ]
  },
  {
    id: 'getting-started', label: 'Getting started', category: 'Overview', title: 'Getting Started', ordered: true,
    paragraphs: [],
    list: [
      'Open the sign-in page and choose Continue with Google (or sign in with email and password).',
      'Start from the Dashboard or New Investigation: choose Name or Username (organisations are found with a Name search), and optionally add a location or organisation.',
      'Watch the progress loader: every engine shows its own status, and you can cancel at any time.',
      'Pick the person or organisation that matches your subject to create a case.',
      'Review the case tabs, save extra findings from the Social, News, Media, Geo and Trends pages, and export when you are done.'
    ]
  },
  {
    id: 'name-search', label: 'Name search', category: 'Search', title: 'Name Search',
    paragraphs: [
      'A name search runs a small, fixed plan of exact-phrase Google searches: the name on its own, then one search per platform group so every platform gets its own results.'
    ],
    list: [
      'Platform groups: LinkedIn, Facebook (two result pages), Instagram, X, TikTok & Threads, YouTube channels, and GitHub/Medium/Reddit/Stack Overflow.',
      'A location or organisation adds one search each and narrows common names.',
      'Deep searches confirm the best Facebook and Instagram matches with their profile APIs.',
      'Results are grouped into possible identities; choose one to create a case.'
    ],
    code: ['site:linkedin.com/in "Kwame Mensah"', '"Kwame Mensah" "Accra"']
  },
  {
    id: 'username-search', label: 'Username search', category: 'Search', title: 'Username Search',
    paragraphs: [
      'A username search finds accounts that use a username, including common variations — for example humblechild_99, humblechild99, humblechild.99 and 99_humblechild.'
    ],
    list: [
      'Direct checks: GitHub, Reddit, Mastodon, Bluesky, Docker Hub, npm, DEV, Medium, Telegram, Twitch, Vimeo, YouTube, Wikipedia, and TikTok and Snapchat profile pages.',
      'Search engines: Google, DuckDuckGo and Yahoo search the username and its close variations in the same searches. Looser variations (the number removed or shortened) get one search of their own in standard and deep searches.',
      'Each account is labelled Exact match, Username variation, Possibly related or Other person, with the reason. “Possibly related” needs real evidence, such as the same display name or website.',
      'Results open with an overview — the username you searched highlighted, counts and the variations searched — and are shown by platform.',
      'Post and video links (an X post, a TikTok video) are traced back to the account that owns them. Look-alike accounts are never merged.'
    ]
  },
  {
    id: 'organisations', label: 'Organisations & abbreviations', category: 'Search', title: 'Organisations and Abbreviations',
    paragraphs: [
      'Type an organisation’s name in a Name search. The platform recognises companies, universities and schools, government agencies, military organisations, associations, NGOs, hospitals and other organisations, and lists an Organisation card first.',
      'A short form such as “UPSA” is matched to its full name only when several independent sites agree. If several organisations use the same short form, you are shown the choices and pick one.'
    ],
    list: [
      'Entity type — worked out from what the sources say (knowledge panel, Wikidata, the website’s own words, the Google Maps category, the web address), shown with “Strong evidence” or “Possible match”.',
      'Sources — Google’s knowledge panel, Wikidata, Google Maps, Google, Google News, DuckDuckGo, public social pages and the organisation’s own website.',
      'Official website — checked before it is trusted and marked Verified, Probably official or Could not be verified. Its About, Contact, Services, Products, Programmes, Departments, Leadership, Locations, News, Events and Careers pages are read.',
      'Profile — official name and short forms, description, industry, founding year, headquarters and addresses, Maps listings with coordinates and opening hours, units or divisions, leadership, contact details, social accounts, related websites, and news and videos from the last 12 months.',
      'Verification — each fact shows how many independent sources agree; when sources disagree, both answers are shown with their sources.'
    ]
  },
  {
    id: 'explore', label: 'Social, News, Media, Geo & Trends', category: 'Search', title: 'Explore Searches',
    paragraphs: ['Beyond people and usernames, five search pages cover public content by keyword. Each one shows its search cost first and can save results to a case.'],
    list: [
      'Social search — public posts and pages on X, Facebook, Instagram, TikTok, YouTube, LinkedIn, Reddit, Threads, Telegram, WhatsApp public groups, VK and Weibo (one search per platform), or forums and discussions.',
      'News — Google News and Bing News. Choosing a country shows only that country’s edition; several words are matched as an exact phrase in the article text.',
      'Media — images (Google & Bing) and videos (YouTube & Google Videos).',
      'Geo search — places and businesses with reviews (Google Maps), news, social posts, web pages, events and similar places for a location, on a map with a satellite view; with “Any country”, places with the same name elsewhere are listed.',
      'Trends — interest over time and by region, related searches and topics (Google Trends), what is trending now in a country, and what news, social media and the web are saying. Several topics can be compared.'
    ]
  },
  {
    id: 'intelligence', label: 'Search intelligence (typos)', category: 'Search', title: 'Search Intelligence: Typos and “Did you mean”',
    paragraphs: [
      'In Intelligent mode (the default), the platform checks the spelling of a search before running it, using one Google check that is cached for 12 hours. It learns from Google’s own spelling fix and from the spellings the results consistently use.'
    ],
    list: [
      'High confidence: the search runs on the correction and shows “Showing results for … · Search instead for …”.',
      'Medium or low confidence: your original search runs, with a “Did you mean” suggestion and at most two alternatives, which only run if you click them.',
      'Every correction shows its confidence, the reason, and the full search path (original → correction → sources → results), plus related searches.',
      'Precise mode searches exactly what you typed with no extra search. Usernames, quoted text and styled handles are never corrected.'
    ]
  },
  {
    id: 'loader', label: 'Progress, caching & quota', category: 'Search', title: 'Progress, Caching & Quota',
    paragraphs: [
      'Every search shows a progress loader listing each engine it calls, with real status for each. You can cancel at any time. A slow engine times out after 30 seconds and is retried once, so a search never freezes.',
      'Identical SerpApi requests are cached on the server for 12 hours. A name search uses 4 (quick), 9–10 (standard) or 9–12 (deep) searches plus one per location or organisation; a username search uses 5, 11–12 or 14–15 (quick / standard / deep), and its direct platform checks are free. The Contact tab uses 4. An organisation case uses 6–7 once, for its extra sources; recognising the organisation and reading its website and Wikidata cost nothing. The in-app Help page lists the exact cost of every search.'
    ]
  },
  {
    id: 'possible-people', label: 'Possible identities', category: 'Results', title: 'Possible Identities & Match Labels',
    paragraphs: [
      'Common names return results about many different people. The platform groups results that share a handle, location or organisation into separate possible people rather than merging them. When the search is an organisation, an Organisation card is listed first.',
      'Each card shows how strong the evidence is (Verified, Strong evidence, Possible match, Mention only or Uncertain), and each profile shows its match (Profile match, Likely match or Possible match) with the signals that support it. In username searches, accounts are labelled Exact match, Username variation, Possibly related or Other person.'
    ]
  },
  {
    id: 'similar', label: 'Similar accounts', category: 'Results', title: 'Similar Accounts',
    paragraphs: [
      'Accounts whose name or handle is close to — but not the same as — your subject’s are shown in their own “Similar accounts” section. Their posts and activity are never shown as belonging to your subject. Treat them as unconfirmed until evidence links them. Click one to open a separate investigation about that account.'
    ]
  },
  {
    id: 'case-tabs', label: 'The case tabs', category: 'Results', title: 'The Case Tabs',
    paragraphs: ['Each case is organised into twelve tabs, plus an Organisation tab when the name search found an organisation:'],
    list: [
      'Overview — summary of the selected identity and its key facts.',
      'Organisation (organisation cases only) — the full organisation profile in sections: summary, headquarters and locations, products and services or units, leadership, website and online presence, news and media, activities and events, and sources and verification.',
      'Profiles — the subject’s own profiles, with link checks; similar accounts listed separately.',
      'Activity — public posts, videos, articles and code activity in date order.',
      'Associations — organisations, co-mentioned people and linked usernames.',
      'Sources — every source URL, exportable as CSV.',
      'Web — pages linked to the identity and pages that only mention the name.',
      'News — news articles naming the subject, gathered automatically.',
      'Images — public images of or about the subject, gathered automatically.',
      'Location — places public sources connect to the subject, each with the source’s exact words and how strong the evidence is (stated, reported, only mentioned or unconfirmed). Nothing is guessed.',
      'Contact — public email addresses and phone numbers shown on the subject’s own profiles, on linked pages or on an organisation’s official website (Google, Bing, DuckDuckGo and social profiles are searched), each with its source. Nothing is generated.',
      'Metrics — result counts and the full SerpApi search log.',
      'Audit — time-stamped log of every search and change, exportable as CSV.'
    ]
  },
  {
    id: 'evidence', label: 'Evidence levels & “Not found”', category: 'Results', title: 'Evidence Levels and “Not found”',
    paragraphs: [
      'There is no separate notes tab: you record what you checked on the evidence itself. Mark each result Raw (found, not reviewed), Relevant or Validated (checked by you). Every search, change and level is written to the Audit tab with the time.',
      'When the sources checked do not give a detail, the platform shows “Not found” (or “Could not be verified”) instead of guessing. “Unable to retrieve” means a source did not answer — try again later. Gender is only shown when a profile states it.'
    ]
  },
  {
    id: 'saving', label: 'Saving to a case', category: 'Cases', title: 'Saving Findings to a Case',
    paragraphs: [
      'Every result list has a Save button. If you have no case yet, one is created automatically, so you can save from any search page without running a name search first. Saved items keep their source URL, platform and date.',
      'All cases are listed under Investigations in the sidebar.'
    ]
  },
  {
    id: 'history', label: 'Search history', category: 'Cases', title: 'Search History',
    paragraphs: [
      'Every search is saved to your account and grouped by kind: name, username, social, forums, news, images, videos, geo and trends. Open an entry to see its top results, run it again, or open the case made from it. Corrected searches show “Original → Correction” with the confidence.'
    ]
  },
  {
    id: 'people-analysis', label: 'People, Network & Content analysis', category: 'Cases', title: 'People, Network & Content Analysis',
    paragraphs: [
      'People lists the people and organisations you track from your cases; opening one shows its saved case immediately, without searching again.',
      'Network shows how the people, usernames, organisations and websites in your cases connect, and can compare two cases. Content analysis charts saved results by month, platform, type, website, hashtags, most active accounts, languages and locations, with a word cloud. Both are built only from data already in your cases and use no searches.'
    ]
  },
  {
    id: 'rerun-export', label: 'Re-run & export', category: 'Cases', title: 'Re-running and Exporting Cases',
    paragraphs: [
      'Re-run a case’s searches to see what has changed since it was created; changes are recorded in the Audit tab and you are notified when it finishes. Export a case as JSON, and its Sources and Audit lists as CSV, for reporting.'
    ]
  },
  {
    id: 'sources', label: 'Sources & API reference', category: 'Platform', title: 'Sources & API Reference',
    paragraphs: [
      'The Sources page (in the app) lists every source the platform searches — search engines, news, images and video, maps, trends, social and developer platforms — with what each returns and where it is used.',
      'Its API endpoints tab documents the platform’s own backend endpoints and every external API it calls (19 SerpApi engines and the free platform APIs), each with a link to the provider’s documentation.'
    ]
  },
  {
    id: 'security', label: 'Sign-in & security', category: 'Platform', title: 'Sign-in & Security',
    paragraphs: [
      'Sign in with Google or with email and password through Firebase Authentication. Credentials are held by Google and Firebase; the platform never stores passwords, and a forgotten password can be reset from the sign-in page. Guest access is not available.',
      'Every app page requires sign-in, and the server verifies your sign-in on every search, so the search engine cannot be used without an account. Searches are limited per account to prevent abuse, and optional App Check (reCAPTCHA v3) blocks automated clients.',
      'Cases, history, tracked people and notifications are stored in your own account; database rules stop anyone else from reading them. You can export or delete all your data in Settings.'
    ]
  },
  {
    id: 'limitations', label: 'Limitations', category: 'Ethics & Help', title: 'Limitations',
    paragraphs: ['The platform only sees what is publicly indexed or exposed by public APIs.'],
    list: [
      'Private accounts, private messages, deleted content and pages search engines have not indexed cannot be found.',
      'Some platforms (Facebook, Instagram, LinkedIn) show only what Google has indexed about them.',
      'News engines match the exact wording of the article; a different spelling may need its own search.',
      'The platform does not do facial recognition.'
    ]
  },
  {
    id: 'responsible-osint', label: 'Responsible use', category: 'Ethics & Help', title: 'Responsible OSINT',
    paragraphs: [
      'Use the platform only for lawful, authorised purposes and follow the laws that apply to you. Harassment, stalking and doxxing are prohibited. Always open and review the original source before drawing conclusions, and never treat a similar name or username as the same person without evidence.'
    ]
  },
  {
    id: 'troubleshooting', label: 'Troubleshooting', category: 'Ethics & Help', title: 'Troubleshooting',
    paragraphs: [],
    list: [
      'Nothing found — check the “Did you mean” suggestion, switch to Intelligent mode, remove the location or organisation, or search the username instead.',
      'Country news is empty — that country’s edition has no coverage; choose “Any country”.',
      '“Too many searches in a short time” — wait a few minutes; searches are limited per account.',
      '“Your session has expired” — sign in again.',
      'Google sign-in blocked — allow pop-ups for the site; otherwise the page goes to Google and returns automatically.'
    ]
  }
];

const CATEGORIES: Category[] = ['Overview', 'Search', 'Results', 'Cases', 'Platform', 'Ethics & Help'];

export const DocumentationPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>(DOCS[0].id);
  const index = Math.max(0, DOCS.findIndex(d => d.id === activeSection));
  const doc = DOCS[index];
  const prev = DOCS[index - 1];
  const next = DOCS[index + 1];

  const open = (id: string) => {
    setActiveSection(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">

          <div style={{ marginBottom: '40px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <BookOpen size={14} />
              <span>Product Documentation</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
              System Documentation & Guide
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              How every search works, what the results mean, how cases and history are kept, and how the platform protects your account and data.
            </p>
          </div>

          <div className="lp-doc-grid">
            <nav className="lp-doc-toc-sidebar" aria-label="Documentation contents">
              {CATEGORIES.map(cat => (
                <React.Fragment key={cat}>
                  <div className="pd-nav-group">{cat}</div>
                  {DOCS.filter(d => d.category === cat).map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => open(item.id)}
                      className={`pd-nav-link${activeSection === item.id ? ' on' : ''}`}
                      aria-current={activeSection === item.id ? 'page' : undefined}
                    >
                      {item.label}
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </nav>

            <article className="pd-article">
              <span className="pd-eyebrow">{doc.category} · {String(index + 1).padStart(2, '0')} of {DOCS.length}</span>
              <h2>{doc.title}</h2>
              {doc.paragraphs.map(p => <p key={p}>{p}</p>)}
              {doc.list && (doc.ordered ? (
                <ol className="pd-steps">
                  {doc.list.map((li, i) => (
                    <li key={li}><span className="pd-sn" aria-hidden="true">{i + 1}</span><span>{li}</span></li>
                  ))}
                </ol>
              ) : (
                <ul className="pd-bullets">
                  {doc.list.map(li => <li key={li}>{li}</li>)}
                </ul>
              ))}
              {doc.code && (
                <div className="pd-code">
                  <span>Example queries</span>
                  {doc.code.map(c => <code key={c}>{c}</code>)}
                </div>
              )}

              <div className="pd-pager">
                {prev ? (
                  <button type="button" onClick={() => open(prev.id)}><small>Previous</small>← {prev.label}</button>
                ) : <span />}
                {next ? (
                  <button type="button" onClick={() => open(next.id)} style={{ textAlign: 'right' }}><small>Next</small>{next.label} →</button>
                ) : (
                  <Link to="/help-center" style={{ textAlign: 'right' }}><small>Next</small>Help Center →</Link>
                )}
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
};
