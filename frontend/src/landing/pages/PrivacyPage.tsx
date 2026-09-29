import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

const Section: React.FC<{ n: number; title: string; last?: boolean; children: React.ReactNode }> = ({ n, title, last, children }) => (
  <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0', ...(last ? { borderBottom: '1px solid var(--border-color)' } : {}) }}>
    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION {String(n).padStart(2, '0')}</div>
    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>{n}. {title}</h2>
    {children}
  </div>
);

const P: React.FC<{ children: React.ReactNode; mb?: number }> = ({ children, mb = 0 }) => (
  <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: mb }}>{children}</p>
);

const List: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.8 }}>{children}</ul>
);

export const PrivacyPage: React.FC = () => {
  const lastUpdated = 'September 29, 2026';

  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">

          <div style={{ marginBottom: '44px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <Lock size={14} />
              <span>Privacy & data protection</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
              Privacy Policy
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              Effective date: {lastUpdated} · What we store, what is sent to search services, and how your work is kept private.
            </p>
          </div>

          <div style={{ lineHeight: 1.75, color: 'var(--text-muted)', width: '100%' }}>

            <Section n={1} title="Scope">
              <P>
                This policy covers the OSINT Investigation Platform. The platform searches information that is already public — search engines,
                news, maps, public social media pages, Wikidata and organisations’ own websites. We do not buy, build or sell private databases
                about people.
              </P>
            </Section>

            <Section n={2} title="Information we store about you">
              <P mb={14}>To run your workspace we keep only what is needed:</P>
              <List>
                <li><strong>Account:</strong> your email address, display name and how you sign in (email and password, or Google). Sign-in is handled by Google Firebase — the platform never sees or stores your password.</li>
                <li><strong>Your work:</strong> your investigations (cases) and what they contain — profiles, pages, news, images, places and contact details found, your evidence levels (Raw, Relevant, Validated) and each case’s audit log.</li>
                <li><strong>Activity in the app:</strong> your search history and saved results, the people and organisations you track, your notifications, and your settings (such as your default search mode).</li>
                <li><strong>On your device:</strong> your browser keeps your sign-in session, some page state (so results stay when you switch pages) and preferences such as light or dark mode.</li>
              </List>
            </Section>

            <Section n={3} title="What is sent to other services when you search">
              <P mb={14}>To find public information, your search terms are sent by our server to:</P>
              <List>
                <li><strong>SerpApi</strong>, which runs the searches on Google, Bing, DuckDuckGo, Yahoo, YouTube, Google News, Bing News, Google Images, Bing Images, Google Maps and Google Trends.</li>
                <li><strong>Public platform services</strong> (such as GitHub, Reddit, Mastodon and Bluesky) for username checks.</li>
                <li><strong>Wikidata</strong>, for organisation names.</li>
                <li><strong>Organisations’ own websites</strong>, whose public pages our server reads to build an organisation profile.</li>
              </List>
              <P mb={0}>
                These requests come from our server, not your browser. Your name, email address and account are not attached to them, and the people
                or organisations you search for are not contacted or notified.
              </P>
            </Section>

            <Section n={4} title="How long search results are kept on our server">
              <P>
                To save searches, the server keeps each search result for 12 hours, so the same search repeated in that time is answered from the
                saved copy. To prevent misuse, the server also counts how many searches each account (or network address) makes in a few minutes;
                this count is kept in memory only and is not saved. Your cases and history stay in your account until you delete them.
              </P>
            </Section>

            <Section n={5} title="How your data is protected">
              <List>
                <li>Every page and every search requires you to be signed in, and the server checks your sign-in on each request.</li>
                <li>Your data is stored in Google Firebase (Firestore). Security rules make sure only you can read or change your own cases, history, tracked people and notifications.</li>
                <li>The keys for the search services are kept on the server and are never sent to your browser.</li>
                <li>When it is switched on, Firebase App Check (which uses Google reCAPTCHA) helps block automated abuse.</li>
              </List>
            </Section>

            <Section n={6} title="Your choices and rights">
              <P>
                Your work belongs to you. You can delete single cases, delete single searches or clear your whole search history, and stop tracking
                anyone at any time. In <strong>Settings → Data & privacy</strong> you can export all of your data, delete all your investigations,
                or delete your account.
              </P>
            </Section>

            <Section n={7} title="Children and changes to this policy" last>
              <P mb={24}>
                The platform is for adults (18 or older) doing professional or lawful research. We do not knowingly collect information from
                children under 13. If this policy changes, the effective date at the top of this page is updated.
              </P>

              <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.9rem' }}>
                <span>Questions about this Privacy Policy?</span>
                <Link to="/help-center" style={{ color: 'var(--accent-warm-light)', textDecoration: 'underline' }}>
                  Visit the Help Center
                </Link>
              </div>
            </Section>

          </div>
        </div>
      </section>
    </div>
  );
};
