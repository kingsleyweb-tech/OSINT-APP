import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import entityGraphImg from '../../assets/images/entity-graph.png';
import { HeroSearchWidget } from '../components/HeroSearchWidget';
import { AppLaptop, AppPhone } from '../components/site/Devices';
import { Ar } from '../components/site/Icons';
import { PlatformIcon } from '../components/site/PlatformIcon';

interface HomePageProps {
  currentUser?: unknown;
}

const ROTATING = ['Person Profiles', 'Username Handles', 'Organisations', 'Public Footprints', 'Places & News', 'Keyword Alerts'];

const TRUST = ['Public sources only', 'Every result cites its source', 'Nothing is guessed', 'Full audit trail'];

const STEPS = [
  { title: 'Start a search', desc: 'Enter a name, a username or an organisation. Add a location or organisation to narrow a common name.' },
  { title: 'Search public sources', desc: 'The platform searches search engines, news, maps, public social pages, Wikidata and official websites at the same time, and shows the progress of each source.' },
  { title: 'Remove what does not match', desc: 'Results that do not name your subject are dropped, links are cleaned, and each result is labelled with how well it matches.' },
  { title: 'Keep look-alikes apart', desc: 'Results are grouped into possible people or organisations. Similar names and usernames are listed separately, never merged.' },
  { title: 'Choose and open a case', desc: 'Pick the right person or organisation. The case opens with its tabs and gathers news, images, locations and contact details automatically.' },
  { title: 'Review and record', desc: 'Check each finding on its original source and mark it Raw, Relevant or Validated. The Audit tab keeps a record of every step.' },
  { title: 'Follow up', desc: 'Re-run the case later, track the subject, set a keyword alert to be emailed about new results, and export a PDF report or share a view-only link.' },
];

const SOURCE_CATEGORIES: [string, [string, string][]][] = [
  ['Social & community', [['x', 'X (Twitter)'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['linkedin', 'LinkedIn'], ['tiktok', 'TikTok'], ['reddit', 'Reddit'], ['threads', 'Threads'], ['snapchat', 'Snapchat'], ['bluesky', 'Bluesky'], ['mastodon', 'Mastodon'], ['telegram', 'Telegram Public Pages'], ['tumblr', 'Tumblr']]],
  ['Professional & business', [['linkedin', 'LinkedIn Profiles'], ['indeed', 'Indeed Resumes'], ['crunchbase', 'Crunchbase'], ['glassdoor', 'Glassdoor']]],
  ['Developer & technical', [['github', 'GitHub'], ['gitlab', 'GitLab'], ['stackoverflow', 'Stack Overflow'], ['devto', 'Dev.to'], ['hashnode', 'Hashnode'], ['codepen', 'CodePen']]],
  ['Video & streaming', [['youtube', 'YouTube Channels'], ['twitch', 'Twitch'], ['vimeo', 'Vimeo'], ['kick', 'Kick'], ['rumble', 'Rumble'], ['dailymotion', 'Dailymotion']]],
  ['Publishing & blogs', [['medium', 'Medium Articles'], ['substack', 'Substack Newsletters'], ['wordpress', 'WordPress'], ['blogger', 'Blogger / Blogspot']]],
  ['Academic & research', [['googlescholar', 'Google Scholar'], ['researchgate', 'ResearchGate'], ['academia', 'Academia.edu'], ['orcid', 'ORCID Publications']]],
  ['Creative & portfolio', [['behance', 'Behance Portfolios'], ['dribbble', 'Dribbble Shots'], ['artstation', 'ArtStation'], ['deviantart', 'DeviantArt'], ['flickr', 'Flickr'], ['500px', '500px']]],
  ['Music & audio', [['spotify', 'Spotify Profiles'], ['soundcloud', 'SoundCloud Tracks'], ['bandcamp', 'Bandcamp'], ['mixcloud', 'Mixcloud']]],
  ['Web & public sources', [['web', 'Personal Websites'], ['googlenews', 'News Media Mentions'], ['acrobat', 'Public Indexed PDFs'], ['event', 'Conference Events'], ['googlemaps', 'Google Maps Listings'], ['org', 'Organisation Websites'], ['wikidata', 'Wikidata']]],
];

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

// One header cell per category, then one numbered cell per source.
const PERIODIC = (() => {
  const cells: { key: string; cls: string; n: string; sym: string; icon?: string; name: string }[] = [];
  let n = 0;
  SOURCE_CATEGORIES.forEach(([cat, items], ci) => {
    const cc = `c${ci + 1}`;
    cells.push({ key: `h-${cat}`, cls: `el-h ${cc}`, n: 'sources', sym: pad(items.length), name: cat });
    items.forEach(([icon, name]) => {
      n += 1;
      cells.push({ key: `${cat}-${name}`, cls: cc, n: pad(n), sym: '', icon, name });
    });
  });
  return cells;
})();

const LABELS = [
  { c: '#22c55e', t: 'Exact match', d: 'The account uses exactly the name or username you searched. The platform notes when the platform itself confirmed the account exists.' },
  { c: '#3b82f6', t: 'Username variation', d: 'The same letters and numbers written differently (for example humblechild99 for humblechild_99). The page says whether anything links it to your subject.' },
  { c: '#7c3aed', t: 'Possibly related', d: 'A different name or handle, but with real shared evidence — such as the same display name or website. Kept apart until you check it.' },
  { c: '#ef4444', t: 'Other person', d: 'A similar name or handle with nothing linking it to your subject — most likely someone else. Never counted as your subject’s.' },
  { c: '#8c4b27', t: 'Organisation facts', d: 'Each fact shows “Confirmed by N independent sources”, “Single source” or “Sources disagree”. A detail no source gives is shown as “Not found”.' },
];

const Tick: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>
);

export const HomePage: React.FC<HomePageProps> = ({ currentUser }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];
  const workspace = currentUser ? '/dashboard' : '/auth';

  return (
    <>
      <section className="hero grid-bg">
        <div className="wrap hero-in">
          <div className="hero-copy">
            <span className="tag">Public sources only · every result cites its source</span>
            <h1 className="d1">Ethical OSINT research &amp;{' '}
              <span className="rot">
                <span className="rot-in">
                  {ROTATING.map((w) => <em key={w}>{w}</em>)}
                  <em aria-hidden="true">{ROTATING[0]}</em>
                </span>
              </span>
            </h1>
            <p className="lede">Find public information about people, usernames and organisations across search engines, news, maps, social media and official websites — and keep every finding, with its source, in one organised case.</p>

            <HeroSearchWidget currentUser={currentUser} />

            <div className="btn-row">
              <Link to={workspace} className="btn btn-br">{currentUser ? 'Open Investigation Workspace' : 'Launch Investigation Workspace'} <Ar /></Link>
              <Link to="/how-it-works" className="btn btn-line">See how it works</Link>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="hero-laptop"><AppLaptop view="case" /></div>
            <div className="hero-phone"><AppPhone view="username" /></div>
            <div className="float f1"><small>Match label</small><span><i style={{ background: '#22c55e' }} />Exact match</span></div>
            <div className="float f2"><small>Evidence level</small><span className="lvl"><b>Raw</b><b>Relevant</b><b className="on">Validated</b></span></div>
          </div>
        </div>

        <div className="wrap">
          <ul className="trust" aria-label="Principles">
            {TRUST.map((t) => <li key={t}><Tick />{t}</li>)}
          </ul>
        </div>
      </section>

      <section className="sec dk grid-bg">
        <div className="wrap split">
          <div>
            <span className="tag">Entity graph</span>
            <h2 className="d3" style={{ margin: '16px 0 0' }}>How an investigation connects a subject to the <em>public profiles, pages and organisations</em> found about them.</h2>
            <div className="legend">
              <span>Subject at the centre</span>
              <span>Validated</span>
              <span>Relevant</span>
            </div>
          </div>
          <figure className="gframe">
            <div className="gbar"><span><i />Associations · subject-centred view</span><span>illustration</span></div>
            <img src={entityGraphImg} width={2248} height={1080} alt="Entity graph illustration: a subject at the centre, linked to LinkedIn, Instagram, Facebook, a university, a club, an event site and a news feature, each marked validated or relevant." />
          </figure>
        </div>
      </section>

      <section className="sec">
        <div className="wrap basics">
          <div>
            <span className="tag">The basics</span>
            <h2 className="d2">What is open-source intelligence <em>(OSINT)?</em></h2>
            <p className="txt">OSINT means collecting and studying information that is already public — web pages, news, public social media profiles, maps and official websites — to answer a question. “Open source” means anyone can find the information, without secret methods, hacking or access to private systems.</p>
            <div className="counters">
              <div className="counter"><b>30+</b><span>Public platforms and sources</span></div>
              <div className="counter"><b>3</b><span>Subjects: people, usernames, organisations</span></div>
              <div className="counter"><b>12+</b><span>Tabs in every case</span></div>
              <div className="counter"><b>100%</b><span>Public sources — no private data</span></div>
            </div>
          </div>
          <div className="defs">
            <div className="def brk">
              <h3 className="h3">Public and private information</h3>
              <p>Public information includes web pages, news articles, public social profiles, map listings and organisations’ own websites. Private information — private messages, private accounts, passwords, bank or phone company records — is outside OSINT and outside this platform.</p>
            </div>
            <div className="def brk">
              <h3 className="h3">Check before you conclude</h3>
              <p>Many people share a name or a username, and search results can be old. Good research compares several independent sources and opens the original page before deciding that a result belongs to the subject.</p>
            </div>
            <div className="rule-card">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z" /><path d="m9 12 2 2 4-4.5" /></svg>
              <p><strong>Our rule:</strong> the platform only collects public information. It is not a consumer reporting service, does not do surveillance or facial recognition, and never accesses private records.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec surface">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="tag">Platform capabilities</span>
              <h2 className="d2">What the platform <em>investigates.</em></h2>
            </div>
            <p>People, usernames and organisations — with search pages for social media, news, media, places and trends, keyword alerts by email, and tools to review, analyse and report what you find.</p>
          </div>

          <div className="bento">
            <article className="bc s7">
              <div className="bc-top">
                <div>
                  <div className="bc-n">01 · People found by their full name</div>
                  <h3>Name investigation</h3>
                  <p className="d">Searches the exact name on Google and the main platforms, then groups the results into possible people, so different people with the same name are kept apart.</p>
                  <div className="bc-tags"><span>Exact name</span><span>Possible people</span><span>Did you mean</span><span>Name suggestions</span></div>
                </div>
                <div className="bc-pairs">
                  <div className="bc-pair"><b>What it covers</b><p>LinkedIn, Facebook, Instagram, X, TikTok, Threads, YouTube, GitHub and more, plus web pages and news. A location or organisation can be added to narrow a common name.</p></div>
                  <div className="bc-pair"><b>Spelling help</b><p>A misspelt name is checked first (“Did you mean…”). While typing, the page can suggest matching organisations.</p></div>
                </div>
              </div>
              <div className="bc-dev" aria-hidden="true"><div><AppLaptop view="people" /></div></div>
            </article>

            <article className="bc s5 soft pad">
              <div className="bc-side">
                <div>
                  <div className="bc-n">02 · One handle, many platforms</div>
                  <h3>Username investigation</h3>
                  <p className="d">Looks for a username on many platforms, including common variations such as humblechild_99, humblechild99 and 99_humblechild. The username you searched is highlighted.</p>
                  <div className="bc-tags"><span>Variations</span><span>Platform tabs</span><span>Direct checks</span><span>Match reasons</span></div>
                </div>
                <div aria-hidden="true"><AppPhone view="username" /></div>
              </div>
              <div className="bc-pairs row">
                <div className="bc-pair"><b>Clear match labels</b><p>Each account is marked Exact match, Username variation, Possibly related or Other person — with the reason — and results are shown by platform.</p></div>
                <div className="bc-pair"><b>Never merged</b><p>Look-alike accounts are kept apart. Any of them can be opened as its own investigation.</p></div>
              </div>
            </article>

            <article className="bc s5 brown pad">
              <div className="bc-n">03 · Companies, schools, agencies and more</div>
              <h3>Organisation intelligence</h3>
              <p className="d">Recognises when a search is an organisation — even a short form such as “UPSA” — and builds a profile from Google’s knowledge panel, Wikidata, Google Maps, news, social pages and its own official website.</p>
              <div className="bc-pairs" style={{ marginTop: 22 }}>
                <div className="bc-pair"><b>What it shows</b><p>Organisation type, official name, website (checked before it is trusted), headquarters and locations, units, leadership, contact details, social accounts and news from the last 12 months.</p></div>
                <div className="bc-pair"><b>Cross-checked</b><p>Each fact shows how many independent sources agree. When sources disagree, both answers are shown.</p></div>
              </div>
              <div className="bc-end">
                <div className="bc-tags" style={{ marginTop: 0 }}><span>Entity type</span><span>Official website</span><span>Units &amp; leadership</span><span>Source agreement</span></div>
              </div>
            </article>

            <article className="bc s7">
              <div className="bc-top">
                <div>
                  <div className="bc-n">04 · Everything about a subject, in tabs</div>
                  <h3>Case workspace</h3>
                  <p className="d">Each investigation is split into clear tabs: Overview, Profiles, Activity, Associations, Sources, Web, News, Images, Location, Contact, Metrics and Audit — plus an Organisation tab for organisations.</p>
                  <div className="bc-tags"><span>12+ tabs</span><span>Evidence levels</span><span>Audit trail</span><span>PDF report</span><span>Share link</span></div>
                </div>
                <div className="bc-pairs">
                  <div className="bc-pair"><b>Record your review</b><p>Mark each result Raw, Relevant or Validated. Every search and change is written to the Audit tab with the time.</p></div>
                  <div className="bc-pair"><b>Follow, share and report</b><p>Re-run a case to see what changed, track the subject, share a view-only link, and export a PDF report, JSON or CSV.</p></div>
                </div>
              </div>
              <div className="bc-dev" aria-hidden="true"><div><AppLaptop view="org" /></div></div>
            </article>

            <article className="bc s4">
              <div className="bc-n">05 · Social, news, media, places and trends</div>
              <h3>Search pages</h3>
              <p className="d">Separate pages for public social posts and forums, news, images and videos, places (with a map and satellite view) and search trends. Useful results can be saved to a case.</p>
              <div className="bc-pairs" style={{ marginTop: 20 }}>
                <div className="bc-pair"><b>Filters</b><p>Date range, country, language and platform choice, depending on the page.</p></div>
                <div className="bc-pair"><b>Trends</b><p>Interest over time and by region, related searches and topics, and what is trending now in a country.</p></div>
              </div>
              <div className="bc-end">
                <div className="bc-tags" style={{ marginTop: 0 }}><span>Social search</span><span>News</span><span>Media</span><span>Geo search</span><span>Trends</span></div>
              </div>
            </article>

            <article className="bc s4 soft">
              <div className="bc-n">06 · Be told when something new appears</div>
              <h3>Keyword alerts</h3>
              <p className="d">Set keywords — a hashtag, a place, an event — with news and the social platforms to watch. The first check shows what is already published; after that the alert checks on its own schedule and emails you only about new results.</p>
              <div className="bc-pairs" style={{ marginTop: 20 }}>
                <div className="bc-pair"><b>Only for you</b><p>Alert emails go only to the account that created the alert. Each alert has its own page with every result, the new ones marked NEW.</p></div>
                <div className="bc-pair"><b>Cost under control</b><p>Each alert shows how many searches a check uses, and alerts stop for the day at a daily limit so the rest of the app keeps working.</p></div>
              </div>
              <div className="bc-end">
                <div className="bc-tags" style={{ marginTop: 0 }}><span>Keywords</span><span>Email alerts</span><span>New results</span><span>Schedule</span></div>
              </div>
            </article>

            <article className="bc s4 night">
              <img className="bc-bg" src={entityGraphImg} alt="" />
              <div className="bc-n">07 · See connections and patterns</div>
              <h3>Analysis &amp; evidence</h3>
              <p className="d">The Network page shows how people, usernames, organisations and websites in your cases connect. Content Analysis charts your saved results by time, platform, hashtags, accounts, languages and locations.</p>
              <div className="bc-pairs" style={{ marginTop: 20 }}>
                <div className="bc-pair"><b>Location evidence</b><p>A place is only recorded when a source states it, with how strong the evidence is: stated, reported, only mentioned or unconfirmed.</p></div>
                <div className="bc-pair"><b>Public contact details</b><p>Emails and phone numbers are only shown when a public source shows them, each with its source.</p></div>
              </div>
              <div className="bc-end">
                <div className="bc-tags" style={{ marginTop: 0 }}><span>Network</span><span>Content analysis</span><span>Location</span><span>Contact</span></div>
              </div>
            </article>
          </div>

          <div className="btn-row" style={{ justifyContent: 'center', marginTop: 36 }}>
            <Link to="/features" className="btn btn-line">See all 21 features <Ar /></Link>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="tag">Supported ecosystem scope</span>
              <h2 className="d2">Public sources <em>&amp; platforms.</em></h2>
            </div>
            <p>Search across publicly indexed social, professional, developer, publishing, video, creative, academic, and web sources using the application’s configured search infrastructure.</p>
          </div>

          <div className="ptable" role="list" aria-label="Supported sources by category">
            {PERIODIC.map((e) => (
              <div key={e.key} className={`el ${e.cls}`} role="listitem"><small>{e.n}</small>{e.icon ? <PlatformIcon id={e.icon} /> : <b>{e.sym}</b>}<span>{e.name}</span></div>
            ))}
          </div>

          <div className="live">
            <div>
              <span className="tag">Where results come from</span>
              <h3 className="h3" style={{ marginTop: 12 }}>Public sources, searched live</h3>
              <p>Searches run through <strong>SerpApi</strong> on Google, Bing, DuckDuckGo, Yahoo, YouTube, Google News, Bing News, Google Images, Bing Images, Google Maps and Google Trends. Usernames are also checked directly on platforms such as GitHub, Reddit, Mastodon and Bluesky, organisations are looked up on Wikidata, and an organisation’s own website is read to build its profile.</p>
            </div>
            <ul className="ticks" style={{ alignSelf: 'center' }}>
              <li>Searches come from our server; the people you search are not contacted or notified.</li>
              <li>The same search repeated within 12 hours is answered from a saved copy and costs nothing.</li>
              <li>Search engines change over time, so results can differ from one day to the next.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="sec surface">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="tag">From search to report</span>
              <h2 className="d2">How the platform <em>works.</em></h2>
            </div>
            <p>Seven steps from a name, username or organisation to a checked, source-backed case.</p>
          </div>
          <div className="steps" role="tablist" aria-label="Steps">
            {STEPS.map((s, i) => (
              <button key={s.title} type="button" className={`stp ${i === stepIdx ? 'on' : ''}`} role="tab" aria-selected={i === stepIdx} onClick={() => setStepIdx(i)}>
                <i>{pad(i + 1)}</i><b>{s.title}</b>
              </button>
            ))}
          </div>
          <div className="step-card brk" role="tabpanel">
            <b>{pad(stepIdx + 1)}</b>
            <div>
              <span className="label">Step {pad(stepIdx + 1)} of {pad(STEPS.length)}</span>
              <h3 style={{ marginTop: 8 }}>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
            <Link to="/how-it-works" className="btn btn-br">Read the walkthrough <Ar /></Link>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="tag">Accuracy &amp; verification</span>
              <h2 className="d2">How results are <em>labelled.</em></h2>
            </div>
            <p>Every result says how well it matches and why. Labels help you judge — they are not proof.</p>
          </div>
          <div className="lbs">
            {LABELS.map((l) => <div className="lb" key={l.t}><b><i style={{ background: l.c }} />{l.t}</b><p>{l.d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="wrap cta-in">
          <div>
            <h2 className="d2">Ready to start an investigation?</h2>
            <p>Sign in with Google or email to open your private workspace. Your cases, history and tracked subjects are visible only to you.</p>
            <div className="btn-row">
              <Link to={workspace} className="btn btn-white">{currentUser ? 'Open Workspace' : 'Sign In & Get Started'} <Ar /></Link>
              <Link to="/documentation" className="btn btn-line-w">Read the documentation</Link>
            </div>
          </div>
          <div className="assure">
            <Link to={workspace}><span>Sign-in</span><b>Google, or email and password</b><small>Handled through Firebase — the platform never stores passwords.</small></Link>
            <Link to="/privacy"><span>Privacy</span><b>Visible only to you</b><small>Cases, history and tracked subjects are stored in your own account.</small></Link>
            <Link to="/features"><span>Reports</span><b>PDF, JSON or CSV</b><small>Export a case, or share a view-only link and stop sharing at any time.</small></Link>
          </div>
        </div>
      </section>
    </>
  );
};
