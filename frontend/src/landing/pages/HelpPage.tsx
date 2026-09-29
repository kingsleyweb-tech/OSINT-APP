import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Search } from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'general' | 'search' | 'accuracy' | 'account' | 'privacy';
  question: string;
  answer: string;
}

export const PublicHelpPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const faqs: FAQItem[] = [
    { id: 'faq-1', category: 'general', question: 'What is the OSINT Investigation Platform?', answer: 'A workspace for lawful open-source investigations. It finds public information about a person, a username or an organisation — and about places, news and topics — and keeps it in cases you can review, save, re-run and export. Every finding keeps a link to its source.' },
    { id: 'faq-2', category: 'general', question: 'Where does the information come from?', answer: 'From public sources only: Google, Bing, DuckDuckGo, Yahoo and YouTube, Google News and Bing News, Google Images and Bing Images, Google Maps and Google Trends (through SerpApi), direct public checks on platforms such as GitHub, Reddit, Mastodon and Bluesky, Wikidata, and the public pages of organisations’ own websites.' },
    { id: 'faq-3', category: 'general', question: 'What can I search?', answer: 'People by name, usernames, organisations, public social posts and forums, news, images and videos, places, and search trends. Each search page shows how many searches it will use, and results can be saved to a case.' },
    { id: 'faq-4', category: 'search', question: 'How does a name search work?', answer: 'It searches the exact name on Google and the main platforms (LinkedIn, Facebook, Instagram, X, TikTok and Threads, YouTube, developer and writing sites). Adding a location or organisation narrows common names. Results are grouped into possible people, and you pick the one to investigate. While you type, the page can suggest matching organisations.' },
    { id: 'faq-5', category: 'search', question: 'Can I search for an organisation or company?', answer: 'Yes. Type its name in a Name search. The platform recognises companies, universities and schools, government agencies, military organisations, associations and NGOs, and shows an Organisation card. Its case has an Organisation tab with the type, official name, website, locations, units, leadership, contact details, social accounts, recent news and the sources behind each fact.' },
    { id: 'faq-6', category: 'search', question: 'What if I only know the short form, like UPSA or GRA?', answer: 'Search it. The platform reads what the results say it stands for and counts how many sites agree. If one full name is clearly supported it is used; if several organisations share the abbreviation, you are shown the choices and pick one. Nothing is assumed from one source only.' },
    { id: 'faq-7', category: 'search', question: 'How does a username search work?', answer: 'It checks many platforms directly and searches Google, DuckDuckGo and Yahoo — also for common variations such as humblechild99 or 99_humblechild. Results are shown by platform, and each account is labelled Exact match, Username variation, Possibly related or Other person, with the reason. The exact username you searched is highlighted.' },
    { id: 'faq-8', category: 'search', question: 'What happens if I misspell a search?', answer: 'In Intelligent mode the platform checks the spelling first. If it is sure, it searches the correction and shows “Showing results for … · Search instead for …”. If not, it runs your search and suggests “Did you mean …?”. Precise mode searches exactly what you typed. Usernames are never corrected.' },
    { id: 'faq-9', category: 'search', question: 'Can I limit news to one country or to recent news?', answer: 'Yes. On the News, Geo and Trends pages you can choose a country, or “Any country” for worldwide results. For organisations, the news and videos shown are from the last 12 months; older items can still be opened if you ask for them.' },
    { id: 'faq-10', category: 'accuracy', question: 'What should I do if a search returns nothing?', answer: 'Check the “Did you mean” suggestion, try Intelligent mode, remove the location or organisation, or search the username instead of the name. The platform never fills empty results with made-up data.' },
    { id: 'faq-11', category: 'accuracy', question: 'What does “Not found” mean?', answer: 'The sources that were checked do not give that detail. The platform shows “Not found” (or “Could not be verified”) instead of guessing. “Unable to retrieve” means a source did not answer — try again later.' },
    { id: 'faq-12', category: 'accuracy', question: 'How are similar names and usernames handled?', answer: 'Accounts that only look similar are kept apart and are never counted as your subject’s. They are labelled “Other person”, or “Possibly related” when real evidence links them (for example the same display name or website). You can open any of them as its own investigation.' },
    { id: 'faq-13', category: 'accuracy', question: 'How do I record what I have checked?', answer: 'Mark each result as Raw (found, not reviewed), Relevant or Validated (checked by you). Every search and change is written to the case’s Audit tab with the time.' },
    { id: 'faq-14', category: 'account', question: 'How do I sign in?', answer: 'Choose Continue with Google, or sign in with email and password. Passwords are handled by Google Firebase; the platform never stores them. If you forget your password, use “Forgot password?” on the sign-in page. Guest access is not available.' },
    { id: 'faq-15', category: 'account', question: 'Where are my saved cases and past searches?', answer: 'Cases are under Investigations — including cases created when you save a result from a search page. Every search you run is in Search history, where you can view the results again without using a new search. People and organisations you track are on the People page.' },
    { id: 'faq-16', category: 'account', question: 'Can I export my work?', answer: 'Yes. A case can be downloaded as a JSON file or a CSV spreadsheet, and its Sources and Audit lists as CSV files. In Settings you can export all of your data.' },
    { id: 'faq-17', category: 'account', question: 'Do searches have a limit?', answer: 'Searches run through SerpApi, which has a monthly allowance. Each search page shows its cost before you search, and the same search repeated within 12 hours is free. Each account can run a limited number of searches in a short time, to prevent misuse.' },
    { id: 'faq-18', category: 'account', question: 'How is my data protected?', answer: 'Every page and every search requires sign-in, and the server checks it on each request. Your cases, history, tracked people and notifications are stored in your own account, and other users cannot read them. You can export or delete all your data in Settings.' },
    { id: 'faq-19', category: 'privacy', question: 'Does the platform access private data?', answer: 'No. It only uses publicly available pages and public platform services. Private accounts, private messages, passwords and non-public or paid databases are never accessed.' },
    { id: 'faq-20', category: 'privacy', question: 'Are people notified when I search for them?', answer: 'No. Searches go through search engines and public services; nobody is contacted or notified.' },
    { id: 'faq-21', category: 'privacy', question: 'Is facial recognition available?', answer: 'No. The platform does not do any face matching.' }
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">

          <div style={{ textAlign: 'center', maxWidth: '840px', margin: '0 auto 40px' }}>
            <div className="lp-badge" style={{ margin: '0 auto 16px' }}>
              <HelpCircle size={14} />
              <span>Support & Help Center</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
              How can we help?
            </h1>
            <p className="lp-subtitle">
              Answers about searching people, usernames and organisations, accuracy, sign-in, saved cases, exports and privacy.
            </p>

            <div style={{ position: 'relative', marginTop: '28px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                aria-label="Search help"
                placeholder="Search questions, e.g. organisation, abbreviation, export, similar accounts"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '14px 16px 14px 48px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div className="pd-tabs" role="tablist" aria-label="Help topics">
            {[
              { id: 'all', label: 'All topics' },
              { id: 'general', label: 'General' },
              { id: 'search', label: 'Searching' },
              { id: 'accuracy', label: 'Accuracy' },
              { id: 'account', label: 'Account & cases' },
              { id: 'privacy', label: 'Privacy & ethics' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat.id}
                className={`pd-tab${selectedCategory === cat.id ? ' on' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="pd-faq">
            {filteredFaqs.length === 0 && <p className="pd-empty">No questions match “{searchTerm}”.</p>}
            {filteredFaqs.map((faq, i) => (
              <details key={faq.id} open={i === 0 || searchTerm.trim() !== ''}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>

          <div className="pd-links">
            <div>
              <h3>Documentation</h3>
              <p>How every search, case tab and organisation feature works.</p>
              <Link to="/documentation">Read the documentation →</Link>
            </div>
            <div>
              <h3>Responsible use</h3>
              <p>What the platform may and may not be used for.</p>
              <Link to="/responsible-use">Read the policy →</Link>
            </div>
            <div>
              <h3>Open the workspace</h3>
              <p>Sign in with Google or email to start an investigation.</p>
              <Link to="/auth">Sign in →</Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};
