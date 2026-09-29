import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Cpu } from 'lucide-react';

interface Step { num: string; title: string; sub: string; desc: string; example?: string[] }

const STEPS: Step[] = [
  {
    num: '01', title: 'You start a search', sub: 'Name, username or organisation',
    desc: 'Choose a Name or Username search. You can add a location or organisation to narrow a common name. In Intelligent mode a misspelt name is checked first, and while you type a name the page can suggest matching organisations.',
    example: ['Name: "Kwame Mensah" + location "Accra"', 'Username: humblechild_99', 'Organisation: UPSA']
  },
  {
    num: '02', title: 'Public sources are searched', sub: 'Many sources at the same time',
    desc: 'The platform plans a small, fixed set of searches and runs them together: Google, Bing, DuckDuckGo, Yahoo and YouTube through SerpApi, direct checks on platforms such as GitHub, Reddit, Mastodon and Bluesky, and for organisations also Google Maps, Google News, Wikidata and the organisation’s own website. A progress bar shows each source, and you can cancel at any time. The same search within 12 hours is answered from a saved copy.',
    example: ['"Kwame Mensah" (exact name)', 'site:linkedin.com/in "Kwame Mensah"', '"humblechild_99" OR "humblechild99" OR "99_humblechild"']
  },
  {
    num: '03', title: 'Results are cleaned and checked', sub: 'Only what matches is kept',
    desc: 'Results that do not name your subject are removed, links are cleaned, and post or video links are traced back to the account that owns them. Each account gets a match label with a reason — Exact match, Username variation, Possibly related or Other person.'
  },
  {
    num: '04', title: 'Look-alikes are kept apart', sub: 'People and organisations separated',
    desc: 'Results are grouped into possible people — or an organisation — so that different people with the same name are not mixed. When a search is an organisation, its type is worked out from the sources, and an abbreviation like “UPSA” is matched to its full name only when the sources agree.'
  },
  {
    num: '05', title: 'You open a case', sub: 'Everything in tabs, with sources',
    desc: 'Choosing a person or organisation opens a case with its tabs: Overview, Profiles, Activity, Associations, Sources, Web, News, Images, Location, Contact, Metrics and Audit, plus an Organisation tab for organisations. News, images, places and contact details are gathered automatically when you open their tabs. Every finding keeps its source link, and missing details show as “Not found”.'
  },
  {
    num: '06', title: 'You review, record and report', sub: 'Evidence levels, audit trail, export',
    desc: 'Open the original sources and mark each result Raw, Relevant or Validated. Every search and change is written to the Audit tab with the time. Track the subject on the People page, re-run the case later to see what changed, and export it to JSON or CSV. Your cases are stored in your own account and only you can see them.'
  }
];

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">

          <div style={{ marginBottom: '50px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <Cpu size={14} />
              <span>From search to report</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
              How the Platform Works
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              What happens between typing a name, username or organisation and having a checked, source-backed case — step by step.
            </p>
          </div>

          <div className="lp-editorial-list" style={{ marginBottom: '60px' }}>
            {STEPS.map(s => (
              <div key={s.num} className="lp-editorial-row">
                <div className="lp-editorial-num">{s.num}</div>
                <div className="lp-editorial-title-box">
                  <h3>{s.title}</h3>
                  <p>{s.sub}</p>
                </div>
                <div className="lp-editorial-body">
                  <p className="lp-editorial-desc">{s.desc}</p>
                  {s.example && (
                    <div className="lp-code-block" style={{ padding: '16px', fontSize: '0.875rem', overflowWrap: 'anywhere' }}>
                      {s.example.map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', paddingTop: '20px' }}>
            <Link to="/auth" className="btn-primary-warm" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
              Launch Workspace <ArrowRight size={18} />
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
};
