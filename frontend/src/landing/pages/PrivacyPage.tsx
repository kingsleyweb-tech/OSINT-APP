import React from 'react';
import { Link } from 'react-router-dom';
import { Art, NextPrev, PageHero, TocCard } from '../components/site/PageParts';

const EFFECTIVE = 'September 29, 2026';

const TOC = [
  { id: 'p1', n: '01', label: 'Scope' },
  { id: 'p2', n: '02', label: 'Information we store about you' },
  { id: 'p3', n: '03', label: 'What is sent to other services' },
  { id: 'p4', n: '04', label: 'How long results are kept' },
  { id: 'p5', n: '05', label: 'How your data is protected' },
  { id: 'p6', n: '06', label: 'Your choices and rights' },
  { id: 'p7', n: '07', label: 'Children and changes' },
];

export const PrivacyPage: React.FC = () => (
  <>
    <PageHero
      crumb="Privacy Policy"
      tag="Privacy & data protection"
      title={<>Privacy<br /><em>policy.</em></>}
      lead="What we store, what is sent to search services, and how your work is kept private."
      stats={[{ value: String(TOC.length), label: 'Sections' }, { value: 'Sep 29', label: 'Effective 2026' }]}
    />

    <section className="sec">
      <div className="wrap ov2">
        <TocCard title="On this page" role={`Effective ${EFFECTIVE}`} items={TOC} />

        <div>
          <Art id="p1" n="01" title="Scope">
            <p className="txt">This policy covers the OSINT Investigation Platform. The platform searches information that is already public — search engines, news, maps, public social media pages, Wikidata and organisations’ own websites. We do not buy, build or sell private databases about people.</p>
          </Art>

          <Art id="p2" n="02" title="Information we store about you">
            <p className="txt">To run your workspace we keep only what is needed:</p>
            <ul className="duties">
              <li><strong>Account:</strong> your email address, display name and how you sign in (email and password, or Google). Sign-in is handled by Google Firebase — the platform never sees or stores your password.</li>
              <li><strong>Your work:</strong> your investigations (cases) and what they contain — profiles, pages, news, images, places and contact details found, your evidence levels (Raw, Relevant, Validated) and each case’s audit log.</li>
              <li><strong>Activity in the app:</strong> your search history and saved results, the people and organisations you track, your keyword alerts and the results they found, your notifications, and your settings (such as your default search mode). When you share a case, a view-only copy of it is kept until you stop sharing.</li>
              <li><strong>On your device:</strong> your browser keeps your sign-in session, some page state (so results stay when you switch pages) and preferences such as light or dark mode.</li>
            </ul>
          </Art>

          <Art id="p3" n="03" title="What is sent to other services when you search">
            <p className="txt">To find public information, your search terms are sent by our server to:</p>
            <ul className="duties">
              <li><strong>SerpApi</strong>, which runs the searches on Google, Bing, DuckDuckGo, Yahoo, YouTube, Google News, Bing News, Google Images, Bing Images, Google Maps and Google Trends.</li>
              <li><strong>Public platform services</strong> (such as GitHub, Reddit, Mastodon and Bluesky) for username checks.</li>
              <li><strong>Wikidata</strong>, for organisation names.</li>
              <li><strong>Brevo</strong>, our email provider, which delivers keyword-alert emails. It receives your account email address and the alert results being sent to you — nothing else.</li>
              <li><strong>Organisations’ own websites</strong>, whose public pages our server reads to build an organisation profile.</li>
            </ul>
            <p className="txt" style={{ marginTop: 20 }}>These requests come from our server, not your browser. Your name, email address and account are not attached to them, and the people or organisations you search for are not contacted or notified.</p>
          </Art>

          <Art id="p4" n="04" title="How long search results are kept on our server">
            <p className="txt">To save searches, the server keeps each search result for 12 hours, so the same search repeated in that time is answered from the saved copy. To prevent misuse, the server also counts how many searches each account (or network address) makes in a few minutes; this count is kept in memory only and is not saved. Your cases and history stay in your account until you delete them.</p>
          </Art>

          <Art id="p5" n="05" title="How your data is protected">
            <ul className="duties">
              <li>Every page and every search requires you to be signed in, and the server checks your sign-in on each request.</li>
              <li>Your data is stored in Google Firebase (Firestore). Security rules make sure only you can read or change your own cases, history, tracked people and notifications.</li>
              <li>The keys for the search services are kept on the server and are never sent to your browser.</li>
              <li>When it is switched on, Firebase App Check (which uses Google reCAPTCHA) helps block automated abuse.</li>
            </ul>
          </Art>

          <Art id="p6" n="06" title="Your choices and rights">
            <p className="txt">Your work belongs to you. You can delete single cases, delete single searches or clear your whole search history, and stop tracking anyone at any time. In <strong style={{ color: 'var(--ink)' }}>Settings → Data &amp; privacy</strong> you can export all of your data, delete all your investigations, or delete your account.</p>
          </Art>

          <Art id="p7" n="07" title="Children and changes to this policy">
            <p className="txt">The platform is for adults (18 or older) doing professional or lawful research. We do not knowingly collect information from children under 13. If this policy changes, the effective date at the top of this page is updated.</p>
            <div className="notice" style={{ marginTop: 28 }}>
              <span>Questions about this Privacy Policy?</span>
              <Link className="btn btn-line" to="/help-center" style={{ height: 42, padding: '0 18px', fontSize: 14, marginLeft: 'auto' }}>Visit the Help Center</Link>
            </div>
          </Art>
        </div>
      </div>
    </section>

    <NextPrev
      flush
      prev={{ to: '/help-center', small: '← Help', label: 'Help Center' }}
      next={{ to: '/terms', small: 'Next →', label: 'Terms of Service' }}
    />
  </>
);
