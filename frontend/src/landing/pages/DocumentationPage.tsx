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
      'Searches run live through SerpApi (Google, Bing, DuckDuckGo, Yahoo, YouTube, News, Images, Lens, Maps and Trends) and free public platform APIs (GitHub, Reddit, Mastodon, Bluesky and others). Nothing is invented: when nothing is found, the platform says so.'
    ]
  },
  {
    id: 'getting-started', label: 'Getting started', category: 'Overview', title: 'Getting Started', ordered: true,
    paragraphs: [],
    list: [
      'Open the sign-in page and choose Continue with Google (or sign in with email and password).',
      'Start from the Dashboard or New Search: choose Name or Username, and optionally add a location or organisation.',
      'Watch the progress loader: every engine shows its own status, and you can cancel at any time.',
      'Pick the possible identity that matches your subject to create a case.',
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
      'A username search finds accounts that use a handle, including versions written with different punctuation — for example 99_humblechild, 99.humblechild_ and 99-humblechild.'
    ],
    list: [
      'Free direct checks: GitHub, Reddit, Mastodon, Bluesky, Docker Hub, npm, DEV, Medium, Telegram, Twitch, Vimeo, YouTube and Wikipedia.',
      'Search engines: Google, DuckDuckGo and Yahoo (which find punctuation variants), plus TikTok and YouTube searches.',
      'Post and video links (an X post, a TikTok video) are traced back to the account that owns them.',
      'Handles that only look similar are listed as similar usernames, never as the subject’s own accounts.'
    ]
  },
  {
    id: 'explore', label: 'Social, News, Media, Geo & Trends', category: 'Search', title: 'Explore Searches',
    paragraphs: ['Beyond people and usernames, five search pages cover public content by keyword. Each one shows its search cost first and can save results to a case.'],
    list: [
      'Social search — public posts and pages on X, Facebook, Instagram, TikTok, YouTube, LinkedIn, Reddit, Threads, Telegram, WhatsApp public groups, VK and Weibo (one search per platform), or forums and discussions.',
      'News — Google News and Bing News. Choosing a country shows only that country’s edition; several words are matched as an exact phrase in the article text.',
      'Media — images (Google & Bing), videos (YouTube & Google Videos) and reverse image search (Google Lens and Google Reverse Image).',
      'Geo search — places and businesses with reviews (Google Maps), news, social posts, web pages and events for a location; with “Any country”, places with the same name elsewhere are listed.',
      'Trends — interest over time and related queries (Google Trends), trending now in a country, and what news, social media and the web are saying.'
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
      'Identical SerpApi requests are cached on the server for 12 hours. A name search uses 4 (quick) or 9 (standard/deep) searches plus one per location or organisation; a username search uses 5, 10 or up to 13, and its direct platform checks are free.'
    ]
  },
  {
    id: 'possible-people', label: 'Possible identities', category: 'Results', title: 'Possible Identities & Match Labels',
    paragraphs: [
      'Common names return results about many different people. The platform groups results that share a handle, location or organisation into separate possible identities rather than merging them.',
      'Each result is labelled Exact match, Likely match, Similar match (a close spelling, such as one letter different) or Possible match, with the signals that support it.'
    ]
  },
  {
    id: 'similar', label: 'Similar accounts', category: 'Results', title: 'Similar Accounts',
    paragraphs: [
      'Accounts whose name or handle is close to — but not the same as — your subject’s are shown in their own “Similar accounts” section. Their posts and activity are never shown as belonging to your subject. Treat them as unconfirmed until evidence links them.'
    ]
  },
  {
    id: 'case-tabs', label: 'The 11 case tabs', category: 'Results', title: 'The 11 Case Tabs',
    paragraphs: ['Each case is organised into eleven tabs:'],
    list: [
      'Overview — summary of the selected identity and its key facts.',
      'Profiles — the subject’s own profiles, with link checks; similar accounts listed separately.',
      'Activity — public posts, videos, articles and code activity in date order.',
      'Associations — organisations, co-mentioned people and linked usernames.',
      'Sources — every source URL, exportable as CSV.',
      'Web — pages linked to the identity and pages that only mention the name.',
      'News — news articles naming the subject, gathered automatically.',
      'Images — public images of or about the subject, gathered automatically.',
      'Location — places public sources connect to the person, each with the source’s exact words and whether it is a profile location, stated residence, hometown, workplace or only a mention. Nothing is guessed.',
      'Metrics — result counts and the full SerpApi search log.',
      'Audit — time-stamped log of every search and change, exportable as CSV.'
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
      'Every search is saved to your account and grouped by kind: name, username, social, forums, news, images, videos, reverse image, geo and trends. Open an entry to see its top results, run it again, or open the case made from it. Corrected searches show “Original → Correction” with the confidence.'
    ]
  },
  {
    id: 'people-analysis', label: 'People, Network & Content analysis', category: 'Cases', title: 'People, Network & Content Analysis',
    paragraphs: [
      'People lists the people you track from your cases; “View person” opens the saved case immediately, without searching again.',
      'Network shows how the people, usernames, organisations and websites in your cases connect, and can compare two cases. Content analysis breaks saved results down by platform, type, date and words. Both are built only from data already in your cases and use no searches.'
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
      'Sign in with Google or with email and password through Firebase Authentication. Credentials are held by Google and Firebase; the platform never stores passwords. Guest access is not available.',
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
      'Facial recognition is not connected yet.'
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
