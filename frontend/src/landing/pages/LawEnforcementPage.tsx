import React from 'react';
import { Link } from 'react-router-dom';
import { NextPrev, PageHero, SectionChips } from '../components/site/PageParts';

const CHIPS = [
  { id: 'l1', label: 'What the platform is' },
  { id: 'l2', label: 'Information kept about users' },
  { id: 'l3', label: 'Legal process requirements' },
];

const NOT_HELD = [
  'Private messages or chat logs',
  'Passwords or login details of any platform',
  'Private (non-public) social media accounts',
  'Phone company or subscriber records',
  'Phone or device location data',
  'Hidden, paid or non-public databases',
  'Facial recognition data',
];

const LEGAL_PROCESS: [string, string][] = [
  ['Subpoena (or local equivalent)', 'Basic account details, such as email address and account creation date.'],
  ['Court order', 'A user’s search history and activity records.'],
  ['Search warrant', 'The contents of a user’s saved cases.'],
];

export const LawEnforcementPage: React.FC = () => (
  <>
    <PageHero
      crumb="Law Enforcement"
      tag="Legal process & agency guidelines"
      title={<>Law enforcement<br /><em>guide.</em></>}
      lead="For government and law enforcement officers: what the platform is, what information it keeps, and what legal process we require."
      stats={[{ value: String(CHIPS.length), label: 'Sections' }, { value: String(LEGAL_PROCESS.length), label: 'Kinds of legal process' }]}
    />

    <SectionChips items={CHIPS} />

    <section className="sec" id="l1" style={{ paddingTop: 80 }}>
      <div className="wrap">
        <div className="shd">
          <div className="l">
            <span className="tag"><i />01 — The platform</span>
            <h2 className="d2">What the platform <em>is.</em></h2>
          </div>
          <p style={{ maxWidth: 520 }}>The OSINT Investigation Platform is software that searches public sources on behalf of its users: search engines through SerpApi (Google, Bing, DuckDuckGo, Yahoo, YouTube, news, images, maps and trends), public platform services (such as GitHub, Reddit, Mastodon and Bluesky), Wikidata, and the public pages of organisations’ own websites. The platform does not run its own database of personal records, criminal records or telecom data.</p>
        </div>
        <div className="record">
          <span className="tag on-dark"><i />Not held</span>
          <h3 className="d2">What the platform <em>does not have.</em></h3>
          <div className="stamp">Public sources only</div>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255, 255, 255, .78)', marginTop: 16 }}>The platform does not collect, store or give access to:</p>
          <div className="kvs" style={{ marginTop: 28 }}>
            {NOT_HELD.map((k) => <div className="kv one" key={k}><b>{k}</b></div>)}
          </div>
        </div>
      </div>
    </section>

    <section className="sec surface" id="l2">
      <div className="wrap intro" style={{ alignItems: 'start' }}>
        <div>
          <span className="tag"><i />02 — User records</span>
          <h2 className="d2">Information kept <em>about its users.</em></h2>
          <p className="txt">The only non-public information held for the platform is about its own users, stored in Google Firebase.</p>
          <p className="txt">A user’s search history is stored in their own account, which they can delete. Search results are kept on the server for up to 12 hours only, to avoid running the same search twice. The server’s technical output, and the standard logs of our hosting and service providers, may also contain request details for a limited time.</p>
        </div>
        <ul className="duties" style={{ marginTop: 0 }}>
          <li><strong>Account details:</strong> email address, display name, user ID, sign-in method and account creation date (Firebase Authentication).</li>
          <li><strong>Saved cases:</strong> the investigations a user created — the public results they contain, the user’s evidence levels and each case’s audit log.</li>
          <li><strong>Account activity:</strong> the user’s search history, tracked people and organisations, notifications and settings.</li>
        </ul>
      </div>
    </section>

    <section className="sec" id="l3">
      <div className="wrap">
        <div className="shd">
          <div className="l">
            <span className="tag"><i />03 — Legal process</span>
            <h2 className="d2">Legal process <em>requirements.</em></h2>
          </div>
          <p>We require valid legal process before releasing any non-public user information.</p>
        </div>
        <div className="tbl">
          <div className="tr h"><span>No.</span><span>Legal process</span><span>Required for</span></div>
          {LEGAL_PROCESS.map(([k, v], i) => (
            <div className="tr" key={k}><span className="n">{String(i + 1).padStart(2, '0')}</span><b>{k}</b><span className="i">{v}</span></div>
          ))}
        </div>
        <p className="txt" style={{ marginTop: 28, maxWidth: 820 }}>The public information shown in the platform can be found by anyone through the original sources; each result keeps a link to where it came from.</p>
        <div className="notice" style={{ marginTop: 28 }}>
          <span>For official requests or service of legal process:</span>
          <Link className="btn btn-br" to="/help-center" style={{ height: 44, padding: '0 20px', fontSize: 14, marginLeft: 'auto' }}>Contact us through the Help Center</Link>
        </div>
      </div>
    </section>

    <NextPrev
      flush
      prev={{ to: '/responsible-use', small: '← Previous', label: 'Responsible Use' }}
      next={{ to: '/', small: 'Back to →', label: 'Home' }}
    />
  </>
);
