import React from 'react';
import { Link } from 'react-router-dom';
import { PageHero, NextPrev } from '../components/site/PageParts';
import { Ar } from '../components/site/Icons';
import { useSession } from '../../context/SessionContext';

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
    desc: 'Open the original sources and mark each result Raw, Relevant or Validated. Every search and change is written to the Audit tab with the time. Track the subject on the People page, re-run the case later to see what changed, set a keyword alert to be emailed when something new is published, export a PDF report (or JSON/CSV), or share a view-only link. Your cases are stored in your own account and only you can see them.'
  }
];

const MATCH_LABELS: [string, string][] = [
  ['#22c55e', 'Exact match'], ['#3b82f6', 'Username variation'], ['#7c3aed', 'Possibly related'], ['#ef4444', 'Other person'],
];

const StepCard: React.FC<{ step: Step; now?: boolean }> = ({ step, now }) => (
  <article className={`tc ${now ? 'now' : ''}`}>
    <div className="top"><span className="date">Step {step.num}</span><span className="num">{step.num}</span></div>
    <h3>{step.title}</h3>
    <p className="loc">{step.sub}</p>
    <p className="txt">{step.desc}</p>
    {step.example && (
      <ul className="duties">
        {step.example.map((line) => <li key={line}>{line}</li>)}
      </ul>
    )}
    {step.num === '03' && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {MATCH_LABELS.map(([c, t]) => <span className="pill k" key={t}><i style={{ background: c }} />{t}</span>)}
      </div>
    )}
  </article>
);

export const HowItWorksPage: React.FC = () => {
  const { user } = useSession();
  return (
  <>
    <PageHero
      crumb="How it works"
      tag="From search to report"
      title={<>How the platform<br /><em>works.</em></>}
      lead="What happens between typing a name, username or organisation and having a checked, source-backed case — step by step."
      stats={[{ value: String(STEPS.length), label: 'Steps' }, { value: '12h', label: 'Saved copy of a search' }]}
    />

    <section className="sec">
      <div className="wrap">
        <div className="shd">
          <div className="l">
            <span className="tag"><i />Walkthrough</span>
            <h2 className="d2">From a search to <em>a checked case.</em></h2>
          </div>
          <p>Each step shows what the platform does and, where it helps, the searches that actually run.</p>
        </div>

        <div className="tl">
          {/* Odd steps on the left, even steps on the right (one column on small screens). */}
          <div className="col l">
            {STEPS.filter((_, i) => i % 2 === 0).map((s, i) => <StepCard key={s.num} step={s} now={i === 0} />)}
          </div>
          <div className="col r">
            {STEPS.filter((_, i) => i % 2 === 1).map((s) => <StepCard key={s.num} step={s} />)}
          </div>
        </div>

        <div className="btn-row" style={{ justifyContent: 'center', marginTop: 64 }}>
          <Link to={user ? '/dashboard' : '/auth'} className="btn btn-br">Launch workspace <Ar /></Link>
        </div>
      </div>
    </section>

    <NextPrev
      prev={{ to: '/features', small: '← Previous', label: 'Features' }}
      next={{ to: '/documentation', small: 'Next →', label: 'Documentation' }}
    />
  </>
);
};
