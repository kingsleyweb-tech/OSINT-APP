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
    { id: 'faq-1', category: 'general', question: 'What is the OSINT Investigation Platform?', answer: 'A workspace for lawful open-source investigations. It searches public sources for a person, username, organisation, place or topic — through SerpApi (Google, Bing, DuckDuckGo, Yahoo, YouTube, News, Images, Lens, Maps, Trends) and free public platform APIs — and organises the results into cases you can review, save and export.' },
    { id: 'faq-2', category: 'general', question: 'What can I search?', answer: 'People by name, usernames, public social posts and forums, news, images and videos, reverse images, places and locations, and search trends. Each has its own page, shows its search cost first, and can save results to a case.' },
    { id: 'faq-3', category: 'search', question: 'How does a name search work?', answer: 'It runs exact-name Google searches: the name on its own, then one search per platform group (LinkedIn, Facebook, Instagram, X, TikTok & Threads, YouTube, developer and writing sites). Adding a location or organisation narrows common names. Results are grouped into possible identities, and you pick the one to investigate.' },
    { id: 'faq-4', category: 'search', question: 'How does a username search work?', answer: 'It checks platforms directly for free (GitHub, Reddit, Mastodon, Bluesky, Docker Hub, npm, DEV, Medium, Telegram, Twitch, Vimeo, YouTube, Wikipedia) and searches Google, DuckDuckGo and Yahoo, which also find the handle written with different punctuation (99_humblechild, 99.humblechild_). TikTok accounts are included.' },
    { id: 'faq-5', category: 'search', question: 'What happens if I misspell a search?', answer: 'In Intelligent mode the platform checks the spelling first. If it is sure, it searches the correction and shows “Showing results for … · Search instead for …”. If not, it runs your search and suggests “Did you mean …?”. Precise mode searches exactly what you typed.' },
    { id: 'faq-6', category: 'search', question: 'Can I limit news to one country?', answer: 'Yes. Choosing a country on the News, Geo or Trends pages shows only that country’s news edition. Choose “Any country” for worldwide coverage.' },
    { id: 'faq-7', category: 'accuracy', question: 'What should I do if a search returns nothing?', answer: 'Check the “Did you mean” suggestion, try Intelligent mode, remove the location or organisation, or search the username instead of the name. The platform never fills empty results with made-up data.' },
    { id: 'faq-8', category: 'accuracy', question: 'How are similar names and usernames handled?', answer: 'Accounts that only look similar (for example one letter different) are shown separately as “Similar accounts”, and their activity is never shown as your subject’s. Review the original sources before linking them to your subject.' },
    { id: 'faq-9', category: 'account', question: 'How do I sign in?', answer: 'Choose Continue with Google, or sign in with email and password. Your credentials are held by Google and Firebase; the platform never stores passwords. Guest access is not available.' },
    { id: 'faq-10', category: 'account', question: 'Where are my saved cases and past searches?', answer: 'Cases are under Investigations in the sidebar — including cases created automatically when you save a result from any search page. Every search you run is listed in Search history, grouped by kind.' },
    { id: 'faq-11', category: 'account', question: 'How is my data protected?', answer: 'Every page and every search requires sign-in, and the server verifies it on each request. Your cases, history and notifications are stored in your own account and database rules stop anyone else from reading them. You can export or delete all your data in Settings.' },
    { id: 'faq-12', category: 'privacy', question: 'Does the platform access private data?', answer: 'No. It only uses publicly indexed pages and public platform APIs. Private accounts, private messages and non-public databases are never accessed.' },
    { id: 'faq-13', category: 'privacy', question: 'Are people notified when I search for them?', answer: 'No. Searches go through search engines and public APIs; nobody is contacted or notified.' },
    { id: 'faq-14', category: 'privacy', question: 'Is facial recognition available?', answer: 'Not yet. Reverse image search (Google Lens) is available on the Media page.' }
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
              Answers about searching, accuracy, similar accounts, sign-in, saved cases and privacy.
            </p>

            <div style={{ position: 'relative', marginTop: '28px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                aria-label="Search help"
                placeholder="Search questions, e.g. similar accounts, Google sign-in, saved cases"
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
              <p>How every search, result tab and case feature works.</p>
              <Link to="/documentation">Read the documentation →</Link>
            </div>
            <div>
              <h3>Responsible use</h3>
              <p>What the platform may and may not be used for.</p>
              <Link to="/responsible-use">Read the policy →</Link>
            </div>
            <div>
              <h3>Open the workspace</h3>
              <p>Sign in with Google to start an investigation.</p>
              <Link to="/auth">Sign in →</Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};
