import React from 'react';
import { Link } from 'react-router-dom';
import { NextPrev, PageHero, SectionChips } from '../components/site/PageParts';
import { Ar } from '../components/site/Icons';
import { useSession } from '../../context/SessionContext';

const CHIPS = [
  { id: 'r1', label: 'Our ethical framework' },
  { id: 'r2', label: 'Check sources' },
  { id: 'r3', label: 'The platform’s safeguards' },
  { id: 'r4', label: 'Personal information' },
];

export const ResponsibleUsePage: React.FC = () => {
  const { user } = useSession();
  return (
    <>
      <PageHero
        crumb="Responsible Use"
        tag="Ethical OSINT principles"
        title={<>Responsible<br /><em>use policy.</em></>}
        lead="How to use public information fairly: check before you conclude, respect people’s privacy, and handle what you find with care."
        stats={[{ value: String(CHIPS.length), label: 'Sections' }]}
      />

      <SectionChips items={CHIPS} />

      <section className="sec" id="r1" style={{ paddingTop: 80 }}>
        <div className="wrap">
          <div className="shd">
            <div className="l">
              <span className="tag"><i />01 — Framework</span>
              <h2 className="d2">Our ethical <em>framework.</em></h2>
            </div>
            <p>Open-source intelligence (OSINT) gives researchers powerful tools. With them comes a duty to act lawfully, fairly and only as far as the task really needs.</p>
          </div>
          <div className="vol">
            <div className="vc">
              <div className="hd"><span className="pill">Allowed</span><b>Allowed uses</b></div>
              <ul>
                <li>Lawful investigations and fraud or identity checks</li>
                <li>Security research and threat investigation</li>
                <li>Journalism: checking public claims and public figures</li>
                <li>Academic research on public online activity</li>
                <li>Due diligence on organisations and their public links</li>
              </ul>
            </div>
            <div className="vc no">
              <div className="hd"><span className="pill or-d">Prohibited</span><b>Not allowed</b></div>
              <ul>
                <li>Harassment, stalking or intimidation — including keyword alerts that follow a private person</li>
                <li>Doxxing — publishing someone’s address, phone number or email to expose or harm them</li>
                <li>Credit, job, housing or insurance screening (FCRA)</li>
                <li>Getting around privacy settings or into private accounts</li>
                <li>Stealing passwords or accessing accounts without permission</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="r2" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <span className="tag"><i />02 — Verification</span>
          <h2 className="d2" style={{ marginTop: 18 }}>Check sources <em>before you conclude.</em></h2>
          <div className="quote" style={{ marginBottom: 0 }}>
            <p>A matching name or username does not prove that two accounts belong to the same person. Always open the original source, and look for more than one piece of evidence — such as the same display name, location, website or links between profiles — before you connect anything to your subject.</p>
          </div>
        </div>
      </section>

      <section className="sec surface" id="r3">
        <div className="wrap intro" style={{ alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 120 }}>
            <span className="tag"><i />03 — Safeguards</span>
            <h2 className="d2">Use the platform’s <em>safeguards.</em></h2>
          </div>
          <ul className="duties" style={{ marginTop: 0 }}>
            <li><strong>Match labels are not proof.</strong> “Exact match”, “Username variation”, “Possibly related” and “Other person” explain why a result was found; they do not confirm identity. Accounts labelled “Other person” belong to someone else unless you can show otherwise.</li>
            <li><strong>Similar names stay apart.</strong> The platform never merges look-alike people or organisations into your subject — do not merge them yourself without evidence.</li>
            <li><strong>“Not found” means not found.</strong> The platform does not guess missing details, and you should not either. Gender is only shown when a profile states it; a place is only recorded when a source states it.</li>
            <li><strong>Organisation facts show their confidence.</strong> “Confirmed by several sources”, “Single source” and “Sources disagree” tell you how far to trust a fact.</li>
            <li><strong>Record what you checked.</strong> Mark results as Raw, Relevant or Validated, and keep the Audit tab as the record of how you reached your conclusion.</li>
          </ul>
        </div>
      </section>

      <section className="sec" id="r4">
        <div className="wrap intro" style={{ alignItems: 'start' }}>
          <div>
            <span className="tag"><i />04 — Care</span>
            <h2 className="d2">Handle personal information <em>with care.</em></h2>
            <p className="txt">The platform can show public contact details (emails and phone numbers) and places connected to a person. Even when they are public, treat them with care.</p>
            <div className="btn-row" style={{ marginTop: 32 }}>
              <Link className="btn btn-br" to={user ? '/dashboard' : '/auth'}>I understand — open the workspace <Ar /></Link>
            </div>
          </div>
          <ul className="duties" style={{ marginTop: 0 }}>
            <li>Keep only what your task needs, and delete cases you no longer need.</li>
            <li>Keep your cases, reports and exports confidential. Share view-only links only with people who are allowed to see them, and stop sharing when they no longer need access.</li>
            <li>Use keyword alerts for topics, events and public figures related to your work — not to keep watch on private individuals.</li>
            <li>Never publish or pass on a person’s contact details or location to expose, harass or harm them.</li>
          </ul>
        </div>
      </section>

      <NextPrev
        flush
        prev={{ to: '/terms', small: '← Previous', label: 'Terms of Service' }}
        next={{ to: '/law-enforcement', small: 'Next →', label: 'Law Enforcement Guide' }}
      />
    </>
  );
};
