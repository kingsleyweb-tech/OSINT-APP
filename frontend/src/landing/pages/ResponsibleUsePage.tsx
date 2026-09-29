import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

const Section: React.FC<{ n: number; title: string; last?: boolean; children: React.ReactNode }> = ({ n, title, last, children }) => (
  <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0', ...(last ? { borderBottom: '1px solid var(--border-color)' } : {}) }}>
    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION {String(n).padStart(2, '0')}</div>
    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>{n}. {title}</h2>
    {children}
  </div>
);

export const ResponsibleUsePage: React.FC = () => {
  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">

          <div style={{ marginBottom: '44px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <ShieldCheck size={14} />
              <span>Ethical OSINT principles</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
              Responsible Use Policy
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              How to use public information fairly: check before you conclude, respect people’s privacy, and handle what you find with care.
            </p>
          </div>

          <div style={{ lineHeight: 1.75, color: 'var(--text-muted)', width: '100%' }}>

            <Section n={1} title="Our ethical framework">
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '20px' }}>
                Open-source intelligence (OSINT) gives researchers powerful tools. With them comes a duty to act lawfully, fairly and only as far
                as the task really needs.
              </p>

              <div className="lp-ethics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '32px', marginTop: '20px' }}>
                <div style={{ borderLeft: '3px solid #22c55e', paddingLeft: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <CheckCircle2 style={{ width: '20px', height: '20px', color: '#22c55e' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Allowed uses</h3>
                  </div>
                  <ul style={{ paddingLeft: '16px', fontSize: '0.925rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>Lawful investigations and fraud or identity checks</li>
                    <li>Security research and threat investigation</li>
                    <li>Journalism: checking public claims and public figures</li>
                    <li>Academic research on public online activity</li>
                    <li>Due diligence on organisations and their public links</li>
                  </ul>
                </div>

                <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <XCircle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Not allowed</h3>
                  </div>
                  <ul style={{ paddingLeft: '16px', fontSize: '0.925rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>Harassment, stalking or intimidation</li>
                    <li>Doxxing — publishing someone’s address, phone number or email to expose or harm them</li>
                    <li>Credit, job, housing or insurance screening (FCRA)</li>
                    <li>Getting around privacy settings or into private accounts</li>
                    <li>Stealing passwords or accessing accounts without permission</li>
                  </ul>
                </div>
              </div>
            </Section>

            <Section n={2} title="Check sources before you conclude">
              <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                A matching name or username does not prove that two accounts belong to the same person. Always open the original source, and look
                for more than one piece of evidence — such as the same display name, location, website or links between profiles — before you
                connect anything to your subject.
              </p>
            </Section>

            <Section n={3} title="Use the platform’s safeguards">
              <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.8 }}>
                <li><strong>Match labels are not proof.</strong> “Exact match”, “Username variation”, “Possibly related” and “Other person” explain why a result was found; they do not confirm identity. Accounts labelled “Other person” belong to someone else unless you can show otherwise.</li>
                <li><strong>Similar names stay apart.</strong> The platform never merges look-alike people or organisations into your subject — do not merge them yourself without evidence.</li>
                <li><strong>“Not found” means not found.</strong> The platform does not guess missing details, and you should not either. Gender is only shown when a profile states it; a place is only recorded when a source states it.</li>
                <li><strong>Organisation facts show their confidence.</strong> “Confirmed by several sources”, “Single source” and “Sources disagree” tell you how far to trust a fact.</li>
                <li><strong>Record what you checked.</strong> Mark results as Raw, Relevant or Validated, and keep the Audit tab as the record of how you reached your conclusion.</li>
              </ul>
            </Section>

            <Section n={4} title="Handle personal information with care" last>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '14px' }}>
                The platform can show public contact details (emails and phone numbers) and places connected to a person. Even when they are
                public, treat them with care:
              </p>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '28px' }}>
                <li>Keep only what your task needs, and delete cases you no longer need.</li>
                <li>Keep your cases and exports confidential, and share them only with people who are allowed to see them.</li>
                <li>Never publish or pass on a person’s contact details or location to expose, harass or harm them.</li>
              </ul>

              <div style={{ textAlign: 'center', paddingTop: '10px' }}>
                <Link to="/auth" className="btn-primary-warm" style={{ padding: '14px 32px', fontSize: '1rem' }}>
                  I understand — open the workspace <ArrowRight size={18} />
                </Link>
              </div>
            </Section>

          </div>
        </div>
      </section>
    </div>
  );
};
