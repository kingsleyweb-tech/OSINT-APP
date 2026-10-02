import React from 'react';
import { Link } from 'react-router-dom';
import { Art, NextPrev, PageHero, TocCard } from '../components/site/PageParts';

const EFFECTIVE = 'September 29, 2026';

const TOC = [
  { id: 'fcra', n: '—', label: 'FCRA notice' },
  { id: 't1', n: '01', label: 'Accepting these terms' },
  { id: 't2', n: '02', label: 'Allowed use and what is not allowed' },
  { id: 't3', n: '03', label: 'Where results come from' },
  { id: 't4', n: '04', label: 'Results are a starting point' },
  { id: 't5', n: '05', label: 'Your account and fair use' },
  { id: 't6', n: '06', label: 'No warranty and liability' },
];

export const TermsPage: React.FC = () => (
  <>
    <PageHero
      crumb="Terms of Service"
      tag="Terms of service"
      title={<>Terms of<br /><em>service.</em></>}
      lead="The rules for using the platform, what it does and does not promise, and what is not allowed."
      stats={[{ value: String(TOC.length - 1), label: 'Sections' }, { value: 'Sep 29', label: 'Effective 2026' }]}
    />

    <section className="sec">
      <div className="wrap ov2">
        <TocCard title="On this page" role={`Effective ${EFFECTIVE}`} items={TOC} />

        <div>
          <div className="french" id="fcra" style={{ marginBottom: 56 }}>
            <span className="lbl">FCRA notice</span>
            <b>Not a consumer reporting agency</b>
            <p>The OSINT Investigation Platform is NOT a Consumer Reporting Agency (CRA) as defined by the Fair Credit Reporting Act (FCRA). Its results may NOT be used to decide on credit, employment, housing (tenant screening) or insurance.</p>
          </div>

          <Art id="t1" n="01" title="Accepting these terms">
            <p className="txt">By creating an account or using the platform, you agree to these Terms of Service. You must be 18 or older and must use the platform in line with the laws that apply to you.</p>
          </Art>

          <Art id="t2" n="02" title="Allowed use and what is not allowed">
            <p className="txt">The platform is for lawful research: investigations, security research, journalism, academic study and due diligence on organisations. You must not use it for:</p>
            <ul className="duties">
              <li>Harassment, stalking, bullying or intimidation of anyone — including using keyword alerts to watch a private person.</li>
              <li>Doxxing — publishing someone’s home address, phone number, email address or other personal details to harm or expose them.</li>
              <li>Credit, employment, housing or insurance screening (see the FCRA notice above).</li>
              <li>Getting around privacy settings, getting into private accounts, or stealing passwords.</li>
              <li>Any activity that breaks the law or the rights of others.</li>
            </ul>
          </Art>

          <Art id="t3" n="03" title="Where results come from">
            <p className="txt">Results are collected live from public sources: search engines through <strong style={{ color: 'var(--ink)' }}>SerpApi</strong> (Google, Bing, DuckDuckGo, Yahoo, YouTube, news, images, maps and trends), public platform services, Wikidata and the public pages of organisations’ own websites. We do not control these sources, and we do not promise that their information is complete, up to date or correct.</p>
          </Art>

          <Art id="t4" n="04" title="Results are a starting point, not proof">
            <ul className="duties">
              <li>Match labels (such as Exact match, Possibly related or Strong evidence) and confidence levels help you judge a result. They do not prove that an account or fact belongs to your subject.</li>
              <li>Accounts and organisations with similar names are kept apart, but you must check the original source before you rely on any result.</li>
              <li>When the sources do not give a detail, the platform shows “Not found”. It never fills gaps with invented information.</li>
              <li>You are responsible for the conclusions you draw and for how you use the results.</li>
            </ul>
          </Art>

          <Art id="t5" n="05" title="Your account and fair use">
            <p className="txt">Keep your sign-in details safe; you are responsible for what is done with your account. Searches use a shared monthly allowance, so the number of searches an account can run in a short time is limited. We may limit, suspend or close accounts that break these terms or put the service at risk.</p>
          </Art>

          <Art id="t6" n="06" title="No warranty and limitation of liability">
            <p className="txt" style={{ fontWeight: 600 }}>THE PLATFORM IS PROVIDED “AS IS”, WITHOUT WARRANTIES OF ANY KIND. TO THE EXTENT THE LAW ALLOWS, WE ARE NOT LIABLE FOR DECISIONS MADE OR ACTIONS TAKEN BASED ON ITS RESULTS. WE MAY CHANGE THESE TERMS; THE EFFECTIVE DATE ABOVE SHOWS THE LATEST VERSION.</p>
            <div className="notice" style={{ marginTop: 28 }}>
              <span>Need more detail on acceptable use?</span>
              <Link className="btn btn-line" to="/responsible-use" style={{ height: 42, padding: '0 18px', fontSize: 14, marginLeft: 'auto' }}>Read the Responsible Use policy</Link>
            </div>
          </Art>
        </div>
      </div>
    </section>

    <NextPrev
      flush
      prev={{ to: '/privacy', small: '← Previous', label: 'Privacy Policy' }}
      next={{ to: '/responsible-use', small: 'Next →', label: 'Responsible Use' }}
    />
  </>
);
