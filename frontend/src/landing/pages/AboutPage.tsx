import React from 'react';
import { Link } from 'react-router-dom';
import { PageHero, NextPrev } from '../components/site/PageParts';
import { Ar } from '../components/site/Icons';
import { useSession } from '../../context/SessionContext';

const GLANCE: [string, string][] = [
  ['What you can search', 'People, usernames, organisations, places, news, media and trends — plus keyword alerts by email'],
  ['Where results come from', 'Google, Bing, DuckDuckGo, Yahoo, YouTube, Google News, Bing News, Google Maps, Google Trends (through SerpApi), Wikidata, public platform checks and official websites'],
  ['Who it is for', 'Investigators, analysts, researchers and journalists'],
  ['Where your work is kept', 'In your own account (Firebase) — other users cannot see it'],
];

const PRINCIPLES = [
  'Public information only — no private accounts or private messages',
  'Every finding keeps a link to its source',
  'Missing details are shown as “Not found”, never guessed',
  'A full record (audit trail) of every search and change in a case',
];

const CAPABILITIES: [string, string][] = [
  ['Name and username searches', 'Group results into possible people, and label each account as an exact match, a username variation, possibly related or another person — with the reason.'],
  ['Organisation profiles', 'For companies, schools, universities, government agencies, associations and NGOs: type, official name, website, locations, leadership, units, contact details, social accounts and recent news — each fact checked against several sources.'],
  ['Search pages', 'For social media posts, news, images and videos, places (with a map) and search trends.'],
  ['Cases', 'Separate tabs for profiles, activity, links to others, sources, web pages, news, images, locations and contact details, plus metrics and an audit trail. Cases can be re-run, tracked, exported as a PDF report and shared with a view-only link.'],
  ['Keyword alerts', 'Watch news and social platforms for your keywords on a schedule and email you — only you — when new results appear, each alert with its own page of results.'],
  ['Analysis', 'Of connections between cases and of the content saved in them.'],
];

export const AboutPage: React.FC = () => {
  const { user } = useSession();
  return (
    <>
      <PageHero
        crumb="About"
        tag="About the platform"
        title={<>About the<br /><em>platform.</em></>}
        lead="A web application that finds public information about people, usernames and organisations, and keeps every finding in one organised case — together with the source it came from."
      />

      <section className="sec">
        <div className="wrap ov2">
          <aside className="idcard">
            <div className="b">
              <b>At a glance</b>
              <div className="role">OSINT Investigation Platform</div>
              {GLANCE.map(([k, v]) => <div className="row" key={k}><span>{k}</span>{v}</div>)}
            </div>
          </aside>

          <div>
            <span className="tag"><i />Why it exists</span>
            <h2 className="d2" style={{ margin: '16px 0 30px' }}>The problem <em>we solve.</em></h2>
            <p className="lede">Open-source intelligence (OSINT) research used to mean opening dozens of browser tabs, writing search after search by hand, and sorting out which results really belong to the person or organisation you are looking for.</p>
            <p className="txt">The platform searches many public sources at once — search engines, news, maps, public social media pages, Wikidata and organisations’ own websites. It removes results that do not match, keeps people with a similar name apart, and saves everything into a case you can review, re-run and export.</p>
            <ul className="duties" style={{ marginTop: 32 }}>
              {PRINCIPLES.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="sec surface">
        <div className="wrap">
          <div className="shd">
            <div className="l">
              <span className="tag"><i />Capabilities</span>
              <h2 className="d2">What the platform <em>does.</em></h2>
            </div>
            <p>Six areas of work, from the first search to the report you hand over.</p>
          </div>
          <div className="pd">
            {CAPABILITIES.map(([title, text], i) => (
              <div className="pc" key={title}>
                <span className="pill g">{String(i + 1).padStart(2, '0')}</span>
                <h3>{title}</h3>
                <p className="sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap intro" style={{ alignItems: 'start' }}>
          <div>
            <span className="tag"><i />Ethics</span>
            <h2 className="d2">Responsible use <em>and limits.</em></h2>
            <p className="txt">The platform only uses information that is already public. It does not know for certain that two accounts belong to the same person: match labels and confidence levels help you judge, but they are not proof. Always open the original source before you reach a conclusion. The platform does not access private accounts, private messages or paid databases, and it does not do facial recognition.</p>
            <div className="btn-row" style={{ marginTop: 32 }}>
              <Link className="btn btn-br" to={user ? '/dashboard' : '/auth'}>Open the investigation workspace <Ar /></Link>
              <Link className="btn btn-line" to="/responsible-use">Responsible Use policy</Link>
            </div>
          </div>
          <div className="french">
            <span className="lbl">FCRA notice</span>
            <b>Not a consumer reporting agency</b>
            <p>The platform is not a Consumer Reporting Agency (CRA) under the FCRA and must not be used for credit, employment, housing or insurance decisions.</p>
          </div>
        </div>
      </section>

      <NextPrev
        flush
        prev={{ to: '/documentation', small: '← Previous', label: 'Documentation' }}
        next={{ to: '/help-center', small: 'Next →', label: 'Help Center' }}
      />
    </>
  );
};
