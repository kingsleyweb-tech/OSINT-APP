import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight } from 'lucide-react';

interface FeatureDetailProps {
  num: string;
  id: string;
  title: string;
  whatItIs: string;
  whyItExists: string;
  howItWorks: string;
  whatUsersSee: string;
  limitations: string;
  whatToVerify: string;
  tags: string[];
}

const EditorialFeatureRow: React.FC<FeatureDetailProps> = ({
  num,
  id,
  title,
  whatItIs,
  whyItExists,
  howItWorks,
  whatUsersSee,
  limitations,
  whatToVerify,
  tags
}) => (
  <div id={id} className="lp-editorial-row" style={{ scrollMarginTop: '100px' }}>
    <div className="lp-editorial-num">{num}</div>
    <div className="lp-editorial-title-box">
      <h3>{title}</h3>
      <div className="lp-editorial-tags" style={{ marginTop: '12px' }}>
        {tags.map((t, idx) => (
          <span key={idx} className="lp-editorial-tag">{t}</span>
        ))}
      </div>
    </div>

    <div className="lp-editorial-body">
      <div className="lp-editorial-grid-2">
        <div className="lp-editorial-spec-item">
          <strong>What It Is</strong>
          <p>{whatItIs}</p>
        </div>
        <div className="lp-editorial-spec-item">
          <strong>Why It Exists</strong>
          <p>{whyItExists}</p>
        </div>
      </div>

      <div style={{ marginTop: '8px' }}>
        <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>How It Works</strong>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.65 }}>{howItWorks}</p>
      </div>

      <div>
        <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>What Users Can See</strong>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.65 }}>{whatUsersSee}</p>
      </div>

      <div className="lp-editorial-grid-2" style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)', marginTop: '4px' }}>
        <div className="lp-editorial-spec-item">
          <strong style={{ color: '#ef4444' }}>Limitations</strong>
          <p>{limitations}</p>
        </div>
        <div className="lp-editorial-spec-item">
          <strong style={{ color: '#22c55e' }}>What to Verify</strong>
          <p>{whatToVerify}</p>
        </div>
      </div>
    </div>
  </div>
);

export const FeaturesPage: React.FC = () => {
  const featuresList: FeatureDetailProps[] = [
    {
      num: '01',
      id: 'name-investigation',
      title: 'Name Investigation',
      tags: ['Exact Name', 'Per-Platform Searches', 'Possible People', 'Name Suggestions'],
      whatItIs: 'A search that finds a person’s public profiles, web pages and news from their full name — or recognises that the name belongs to an organisation.',
      whyItExists: 'Searching by hand means writing many site-by-site searches and sorting through results about many different people with the same name.',
      howItWorks: 'Searches the exact name on Google, then once per platform group (LinkedIn, Facebook, Instagram, X, TikTok and Threads, YouTube, developer and writing sites). A location or organisation can be added to narrow a common name, and deep searches confirm the best Facebook and Instagram matches. While typing, the page can suggest matching organisations.',
      whatUsersSee: 'Possible people (and an Organisation card when it is an organisation), each with its profiles, web pages and news, and a label showing how strong the evidence is.',
      limitations: 'Very common names return many different people; the platform separates them but cannot know which one you mean.',
      whatToVerify: 'Check the city, employer and bio on the original pages before choosing a person.'
    },
    {
      num: '02',
      id: 'username-investigation',
      title: 'Username Investigation',
      tags: ['Variations', 'Match Labels', 'Platform Tabs', 'Direct Checks'],
      whatItIs: 'Finds accounts that use a username, including common variations — for example humblechild_99, humblechild99, humblechild.99 and 99_humblechild.',
      whyItExists: 'People reuse usernames across platforms, often with small changes in punctuation or where a number goes.',
      howItWorks: 'Checks many platforms directly (such as GitHub, Reddit, Mastodon, Bluesky, Telegram, Twitch, YouTube, TikTok and Snapchat) and searches Google, DuckDuckGo and Yahoo for the username and its close variations. Looser variations (the number removed or shortened) get a search of their own so they do not crowd out the real matches.',
      whatUsersSee: 'An overview with the searched username highlighted, results by platform, and each account labelled Exact match, Username variation, Possibly related or Other person — with the reason.',
      limitations: 'The same username on two platforms does not prove it is the same person.',
      whatToVerify: 'Compare photos, bios, links and posting times across the accounts found.'
    },
    {
      num: '03',
      id: 'organisation-intelligence',
      title: 'Organisation Intelligence',
      tags: ['Entity Type', 'Cross-Checked Facts', 'Units', 'Leadership'],
      whatItIs: 'A structured profile of a company, school, university, government agency, military organisation, association, NGO or other organisation.',
      whyItExists: 'Facts about an organisation are spread across its website, maps, encyclopaedias, news and social media, and they do not always agree.',
      howItWorks: 'Collects facts from Google’s knowledge panel, Wikidata, Google Maps, Google, Google News, DuckDuckGo, public social pages and the organisation’s own website. Each fact keeps its source, and matching facts from different sources are grouped together.',
      whatUsersSee: 'Type, official name and short forms, description, industry, founding year, headquarters and addresses (with Maps listings, coordinates and opening hours), units or divisions, leadership, contact details, social accounts, recent news and videos, and activities.',
      limitations: 'Small organisations may have few public sources, so some details will show “Not found”.',
      whatToVerify: 'Check “Single source” facts and any “Sources disagree” warnings on the original pages.'
    },
    {
      num: '04',
      id: 'entity-type',
      title: 'Abbreviations & Entity Type',
      tags: ['UPSA → Full Name', 'Multiple Meanings', 'Strong / Possible'],
      whatItIs: 'Understands short forms such as “UPSA” or “GRA”, and works out what kind of organisation something is.',
      whyItExists: 'A short form can look like a person’s name or have several meanings; treating it as a person gives wrong results.',
      howItWorks: 'Reads what the search results say an abbreviation stands for and counts how many independent sites agree. The organisation type is worked out from what the sources say — knowledge panel, Wikidata, the website’s own words, the Google Maps category and the web address — not from the name alone.',
      whatUsersSee: 'The full name the abbreviation stands for, or a “Multiple possible entities” choice; and a type such as University, Company, Government agency or Association with “Strong evidence” or “Possible match”.',
      limitations: 'An abbreviation used by several organisations cannot be resolved automatically — you choose.',
      whatToVerify: 'Confirm the full name on the organisation’s official website.'
    },
    {
      num: '05',
      id: 'website-intelligence',
      title: 'Official Website Intelligence',
      tags: ['Website Check', 'About / Contact / Leadership', 'Related Sites'],
      whatItIs: 'Finds an organisation’s official website, checks that it really belongs to the organisation, and reads its public pages.',
      whyItExists: 'The first website in a search is not always the official one, and the official site is often the best source for contacts, leadership and services.',
      howItWorks: 'Picks the address the sources agree on, then checks it (listed by other sources, name in the site title, matching address). It reads pages such as About, Contact, Services, Products, Programmes, Departments, Leadership, Locations, News, Events and Careers.',
      whatUsersSee: 'The website marked Verified, Probably official or Could not be verified, the pages read with their key text, people named in leadership roles, units, contact details, and related and third-party websites.',
      limitations: 'Only public pages are read; sites that block automatic reading or are offline show “Could not be read”.',
      whatToVerify: 'Open the official site to confirm leadership names and contact details are current.'
    },
    {
      num: '06',
      id: 'search-intelligence',
      title: 'Search Intelligence (Spelling Help)',
      tags: ['Did You Mean', 'Intelligent / Precise', 'Confidence', 'Search Path'],
      whatItIs: 'A spelling check that runs before a search, so typos like “Kingley Anab” still find the right results.',
      whyItExists: 'A single wrong letter can make a search return nothing, and the investigator may not notice.',
      howItWorks: 'In Intelligent mode one saved Google check reads Google’s own spelling fix and the spellings the results use. Confident corrections are searched directly (“Showing results for … · Search instead for …”); less certain ones become a “Did you mean” suggestion. Precise mode searches exactly what was typed. Usernames are never corrected.',
      whatUsersSee: 'The correction with its confidence, the reason, and the full search path.',
      limitations: 'A correction is a best guess; unusual spellings of real names can be corrected wrongly.',
      whatToVerify: 'If the correction looks wrong, click “Search instead for” your original spelling.'
    },
    {
      num: '07',
      id: 'profiles',
      title: 'Profiles & Link Checks',
      tags: ['Own Accounts', 'Link Status', 'Stated Gender Only'],
      whatItIs: 'The subject’s own accounts on each platform, in one list.',
      whyItExists: 'Investigators need to see every account in one place and know whether each link still works.',
      howItWorks: 'Profiles come from the searches and direct platform checks. Each link is checked (Reachable, Unreachable or Unverifiable). Gender is only shown when the profile itself states it, for example with pronouns.',
      whatUsersSee: 'Profiles by platform with a match label and link status. Look-alike accounts are listed separately and can be opened as their own investigation.',
      limitations: 'Private accounts show only what search engines have indexed about them.',
      whatToVerify: 'Open each profile to review its bio, photos and privacy settings.'
    },
    {
      num: '08',
      id: 'activity-discovery',
      title: 'Public Activity',
      tags: ['Posts', 'Videos', 'Articles', 'Timeline'],
      whatItIs: 'Public posts, videos, articles and code activity from the subject’s own accounts.',
      whyItExists: 'A subject’s public activity is spread across many platforms.',
      howItWorks: 'Activity found by the searches is linked to the account that published it and placed in date order. Activity from look-alike accounts is never counted as the subject’s.',
      whatUsersSee: 'A date-ordered list of public activity, each item with its source link.',
      limitations: 'Only activity that is public and has been indexed can be found; some items have no date.',
      whatToVerify: 'Check dates and context on the original platform.'
    },
    {
      num: '09',
      id: 'associations',
      title: 'Associations',
      tags: ['Organisations', 'Named Together', 'Linked Usernames'],
      whatItIs: 'Organisations, people named together with the subject, and usernames linked to the subject.',
      whyItExists: 'Links to organisations and other people give important context.',
      howItWorks: 'Found in the profiles and pages collected for the case; each association keeps the source that connects it.',
      whatUsersSee: 'A list of associations with their source, which can be marked Relevant or Validated.',
      limitations: 'Being named in the same article does not prove a formal link.',
      whatToVerify: 'Confirm memberships and roles on official sources.'
    },
    {
      num: '10',
      id: 'location',
      title: 'Location Evidence',
      tags: ['Stated / Reported / Mentioned', 'Maps', 'No Guessing'],
      whatItIs: 'Places that public sources connect to the subject.',
      whyItExists: 'Location claims need to show exactly what the source said, because a place mentioned in a post is not where someone lives.',
      howItWorks: 'Searches the web, news and Google Maps (and, on request, videos, images and social posts). A place is only recorded when a source states it next to the subject, with the source’s own words. Pages about someone with the same name are kept apart.',
      whatUsersSee: 'Each place with its type (profile location, residence, hometown, workplace, organisation location, event or mention) and strength: stated, reported, only mentioned or unconfirmed.',
      limitations: 'No coordinates or places are ever guessed; many people have no public location at all.',
      whatToVerify: 'Read the source sentence before relying on a place.'
    },
    {
      num: '11',
      id: 'contact',
      title: 'Public Contact Details',
      tags: ['Email', 'Phone', 'With Source'],
      whatItIs: 'Public email addresses and phone numbers of the subject.',
      whyItExists: 'Contact details are often published on profiles, pages or an organisation’s website, but are scattered.',
      howItWorks: 'Searches Google, Bing, DuckDuckGo and social profiles, and reads the subject’s own profile fields and, for organisations, the official website. Details are only kept when a public source shows them.',
      whatUsersSee: 'Each email or phone number with where it appears and whether it is on the subject’s own profile, on a linked page, or unconfirmed.',
      limitations: 'Details on pages not tied to the subject stay unconfirmed; nothing is generated.',
      whatToVerify: 'Handle contact details with care and follow the Responsible Use policy.'
    },
    {
      num: '12',
      id: 'news-articles',
      title: 'News & Articles',
      tags: ['Google News', 'Bing News', 'Country Editions', 'Last 12 Months'],
      whatItIs: 'News coverage of a person, organisation, place or topic, and automatic news for each case.',
      whyItExists: 'Press coverage gives independent context about a subject.',
      howItWorks: 'Searches Google News and Bing News. Several words are matched as an exact phrase in the article text; if that finds nothing, a looser search runs. Choosing a country shows only that country’s news. For organisations, news and videos from the last 12 months are shown first.',
      whatUsersSee: 'Headlines, publishers, dates and thumbnails, newest first for organisations.',
      limitations: 'Articles that spell the name differently need their own search.',
      whatToVerify: 'Read the full article to confirm it is about your subject and not someone with the same name.'
    },
    {
      num: '13',
      id: 'sources',
      title: 'Sources, Audit Log & API Reference',
      tags: ['Audit Log', 'Search Log', 'Sources Page', 'API Docs'],
      whatItIs: 'A record of where every result came from, plus a Sources page listing every provider and API the platform uses.',
      whyItExists: 'Investigations need a clear record of where each piece of evidence came from.',
      howItWorks: 'Each case keeps every source address, the searches that found it and a time-stamped audit log. The Sources page lists all sources and, in its API endpoints tab, every service the platform connects to.',
      whatUsersSee: 'Source and audit tables (exportable as CSV), the full search log in Metrics, and the Sources & API reference.',
      limitations: 'Web pages can change or be removed after they were found.',
      whatToVerify: 'Export important sources while they are available.'
    },
    {
      num: '14',
      id: 'investigation-management',
      title: 'Cases, Tracking, History & Export',
      tags: ['Evidence Levels', 'Track', 'Re-run', 'Export'],
      whatItIs: 'Your workspace: cases, saved findings, tracked subjects and a history of every search.',
      whyItExists: 'Investigations run over many sessions and many kinds of search.',
      howItWorks: 'Results from any search page can be saved to a case (one is created if needed). Each result can be marked Raw, Relevant or Validated. Cases can be re-run to see what changed, tracked on the People page, and exported as JSON or CSV. Every search is kept in Search history and can be viewed again without a new search.',
      whatUsersSee: 'Investigations list, case tabs (plus an Organisation tab for organisations), People page and Search history.',
      limitations: 'Data is stored in your own account and visible only to you.',
      whatToVerify: 'Export important cases for your records.'
    },
    {
      num: '15',
      id: 'explore-searches',
      title: 'Social, Media, Geo & Trends Searches',
      tags: ['Social Posts', 'Images & Videos', 'Places & Map', 'Trends'],
      whatItIs: 'Keyword searches across public social content, images and videos, places and search trends.',
      whyItExists: 'Investigations often start from a topic, image or place rather than a person.',
      howItWorks: 'Social search runs one search per chosen platform (such as X, Facebook, Instagram, TikTok, YouTube, LinkedIn, Reddit, Threads, Telegram, VK and Weibo) or searches forums, with date, country and language filters. Media finds public images and videos. Geo search covers places with reviews, news, social posts, web pages, events and similar places on a map with a satellite view. Trends shows interest over time and by region, related searches and topics, and what is trending now.',
      whatUsersSee: 'Result lists with each source’s status, thumbnails and a Save button on each result.',
      limitations: 'Only content that is public and indexed can be found.',
      whatToVerify: 'Open posts and images on the original platform to confirm context and date.'
    },
    {
      num: '16',
      id: 'similar-accounts',
      title: 'Look-alike Separation',
      tags: ['Kept Apart', 'Possibly Related', 'Investigate Separately'],
      whatItIs: 'Keeps people and accounts that only look like your subject apart from your subject.',
      whyItExists: 'Names and usernames one letter apart often belong to different people, and mixing them spoils an investigation.',
      howItWorks: 'Look-alike accounts are listed separately. They are only marked “Possibly related” when real evidence links them (such as the same display name or website), and are never merged. Any of them can be opened as its own investigation.',
      whatUsersSee: 'A separate list of similar accounts in Profiles and in search results, each with the reason.',
      limitations: 'A look-alike can still be your subject using a different username.',
      whatToVerify: 'Look for shared photos, links or contacts before linking a look-alike to your subject.'
    },
    {
      num: '17',
      id: 'analysis',
      title: 'Network & Content Analysis',
      tags: ['Connections', 'Case Comparison', 'Hashtags & Languages', 'No Searches Used'],
      whatItIs: 'Analysis of the data already saved in your cases.',
      whyItExists: 'Patterns across cases are easier to see in charts and graphs than in lists.',
      howItWorks: 'Network links the people, usernames, organisations and websites in your cases and compares two cases. Content analysis charts saved results by month, platform, type, website, hashtags, most active accounts, languages and locations, with a word cloud. Neither uses any searches.',
      whatUsersSee: 'A connection view, case comparison, and charts of saved content.',
      limitations: 'Only as complete as the data you have saved.',
      whatToVerify: 'Confirm important connections on the original sources.'
    },
    {
      num: '18',
      id: 'account-security',
      title: 'Sign-in & Protected Access',
      tags: ['Google or Email', 'Protected Searches', 'Private Data'],
      whatItIs: 'Account sign-in and protection for your workspace and the search service.',
      whyItExists: 'Investigation data is sensitive, and the search service must not be open to anyone.',
      howItWorks: 'Sign in with Google or with email and password through Firebase; the platform never stores passwords, and a forgotten password can be reset. Every page requires sign-in, the server checks it on every search, searches are limited per account, and database rules keep each account’s data private.',
      whatUsersSee: 'Continue with Google on the sign-in page, and Security and Data & privacy settings (export or delete your data).',
      limitations: 'Guest access is not available.',
      whatToVerify: 'Sign out on shared computers.'
    },
    {
      num: '19',
      id: 'keyword-alerts',
      title: 'Keyword Alerts by Email',
      tags: ['Keywords', 'Scheduled Checks', 'Email Only to You', 'NEW Results'],
      whatItIs: 'Alerts that watch keywords — a hashtag, a place, an event or a name — in the news and on the social platforms you choose.',
      whyItExists: 'Some investigations need to know as soon as something new is published, without searching again by hand every day.',
      howItWorks: 'Create an alert with up to 5 keywords, the sources, a country and how often to check (once a day, every 12 or every 6 hours). The first check shows what was published in the last 7 days; later checks run on schedule and email you only results that were not found before. Each alert has its own page listing every result by check, with the new ones marked NEW. Before saving, the form shows how many searches a check uses; alerts stop for the day at a daily limit and keep a monthly reserve.',
      whatUsersSee: 'The Alerts page (with a “how it works” box), an “N NEW” badge on alerts with unseen results, each alert’s results page, and the alert emails.',
      limitations: 'Results come from search engines: news usually appears within minutes, social posts can take hours and some are never indexed. It is not live monitoring of the platforms. Emails may land in Spam until you mark them “Not spam”.',
      whatToVerify: 'Open each result on its original source before relying on it.'
    },
    {
      num: '20',
      id: 'reports-sharing',
      title: 'PDF Reports & View-only Sharing',
      tags: ['PDF Report', 'Clean Links', 'View-only Link', 'Stop Sharing'],
      whatItIs: 'A professional PDF report of a case, and a link that lets someone view the case without being able to change it.',
      whyItExists: 'Findings often have to be handed to a supervisor or another investigator.',
      howItWorks: 'Export builds a PDF from the data already saved in the case — no new searches — with a cover page, summary, identity or organisation details, profiles, activity, associations, locations, web and news, images, sources, metrics and the audit trail. Missing details read “Not found”, results marked Raw are left out, and search-result, tracking, image and duplicate links are removed. Share creates a view-only link: anyone with it can see every tab, but cannot search, change or export anything, and you can stop sharing at any time.',
      whatUsersSee: 'Export (Download PDF / Open preview) and Share in a case’s header; the shared page shows a “View only” banner.',
      limitations: 'Links are cleaned, not re-opened, when the report is made; a page can change after it was collected. Anyone who has a share link can view the case.',
      whatToVerify: 'Share links only with people who are allowed to see the case, and stop sharing when it is no longer needed.'
    }
  ];

  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">
          
          <div style={{ marginBottom: '50px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <Layers size={14} />
              <span>Detailed Feature Catalog</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
              Product Feature Reference
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '820px' }}>
              How every capability works — for people, usernames and organisations — what it shows, its limits, and what to verify.
            </p>
          </div>

          <div className="lp-editorial-list" style={{ marginBottom: '60px' }}>
            {featuresList.map((feat) => (
              <EditorialFeatureRow key={feat.id} {...feat} />
            ))}
          </div>

          <div style={{ textAlign: 'center', paddingTop: '20px' }}>
            <Link to="/auth" className="btn-primary-warm" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
              Launch Workspace & Try Features <ArrowRight size={18} />
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
};
