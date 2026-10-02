import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero, NextPrev } from '../components/site/PageParts';
import { SearchIcon } from '../components/site/Icons';
import { useSession } from '../../context/SessionContext';

interface FAQItem {
  id: string;
  category: 'general' | 'search' | 'accuracy' | 'account' | 'privacy';
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  { id: 'faq-1', category: 'general', question: 'What is the OSINT Investigation Platform?', answer: 'A workspace for lawful open-source investigations. It finds public information about a person, a username or an organisation — and about places, news and topics — and keeps it in cases you can review, save, re-run and export. Every finding keeps a link to its source.' },
  { id: 'faq-2', category: 'general', question: 'Where does the information come from?', answer: 'From public sources only: Google, Bing, DuckDuckGo, Yahoo and YouTube, Google News and Bing News, Google Images and Bing Images, Google Maps and Google Trends (through SerpApi), direct public checks on platforms such as GitHub, Reddit, Mastodon and Bluesky, Wikidata, and the public pages of organisations’ own websites.' },
  { id: 'faq-3', category: 'general', question: 'What can I search?', answer: 'People by name, usernames, organisations, public social posts and forums, news, images and videos, places, and search trends — and you can set keyword alerts to be emailed about new results. Each search page shows how many searches it will use, and results can be saved to a case.' },
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
  { id: 'faq-16', category: 'account', question: 'Can I export my work?', answer: 'Yes. A case can be downloaded as a PDF report, a JSON file or a CSV spreadsheet, and its Sources and Audit lists as CSV files. In Settings you can export all of your data.' },
  { id: 'faq-17', category: 'account', question: 'Do searches have a limit?', answer: 'Searches run through SerpApi, which has a monthly allowance. Each search page shows its cost before you search, and the same search repeated within 12 hours is free. Each account can run a limited number of searches in a short time, to prevent misuse.' },
  { id: 'faq-18', category: 'account', question: 'How is my data protected?', answer: 'Every page and every search requires sign-in, and the server checks it on each request. Your cases, history, tracked people and notifications are stored in your own account, and other users cannot read them. You can export or delete all your data in Settings.' },
  { id: 'faq-19', category: 'privacy', question: 'Does the platform access private data?', answer: 'No. It only uses publicly available pages and public platform services. Private accounts, private messages, passwords and non-public or paid databases are never accessed.' },
  { id: 'faq-20', category: 'privacy', question: 'Are people notified when I search for them?', answer: 'No. Searches go through search engines and public services; nobody is contacted or notified.' },
  { id: 'faq-21', category: 'privacy', question: 'Is facial recognition available?', answer: 'No. The platform does not do any face matching.' },
  { id: 'faq-22', category: 'search', question: 'What are keyword alerts?', answer: 'An alert watches keywords (such as a hashtag, a place or an event) in the news and on the social platforms you choose. Its first check shows what was published in the last 7 days; after that it checks on schedule — once a day, every 12 or 6 hours — and emails you only new results. Each alert has its own page listing every result, with new ones marked NEW.' },
  { id: 'faq-23', category: 'account', question: 'Who receives alert emails, and why are they in Spam?', answer: 'Only the account that created the alert receives its emails. If you cannot find one, look in Spam (or Junk / Promotions), open it and mark it “Not spam”, then add the sender to your contacts so future alerts arrive in your inbox.' },
  { id: 'faq-24', category: 'account', question: 'Can I share a case or make a report?', answer: 'Yes. In a case, Export creates a PDF report from the data already in the case (no new searches), and Share creates a view-only link that anyone can open without changing anything. You can stop sharing at any time.' }
];

const TOPICS = [
  { id: 'all', label: 'All topics' },
  { id: 'general', label: 'General' },
  { id: 'search', label: 'Searching' },
  { id: 'accuracy', label: 'Accuracy' },
  { id: 'account', label: 'Account & cases' },
  { id: 'privacy', label: 'Privacy & ethics' },
];

const Plus: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
);

export const PublicHelpPage: React.FC = () => {
  const { user } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const needle = searchTerm.trim().toLowerCase();

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = !needle || faq.question.toLowerCase().includes(needle) || faq.answer.toLowerCase().includes(needle);
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <PageHero
        crumb="Help Center"
        tag="Support & help center"
        title={<>How can we<br /><em>help?</em></>}
        lead="Answers about searching people, usernames and organisations, accuracy, sign-in, saved cases, exports and privacy."
        stats={[{ value: String(FAQS.length), label: 'Answers' }, { value: String(TOPICS.length - 1), label: 'Topics' }]}
      >
        <label className="hsearch">
          <SearchIcon size={20} />
          <input
            type="text"
            aria-label="Search help"
            placeholder="Search questions, e.g. organisation, export, similar accounts"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>
      </PageHero>

      <div className="wrap subbar">
        <div className="chips" role="tablist" aria-label="Help topics">
          {TOPICS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat.id}
              className={`chip ${selectedCategory === cat.id ? 'on' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}<small>{cat.id === 'all' ? FAQS.length : FAQS.filter((f) => f.category === cat.id).length}</small>
            </button>
          ))}
        </div>
      </div>

      <section className="sec" style={{ paddingTop: 36 }}>
        <div className="wrap">
          <div className="fq" style={{ maxWidth: 1000 }}>
            {filteredFaqs.length === 0 && <p className="notice">No questions match “{searchTerm}”.</p>}
            {filteredFaqs.map((faq, i) => (
              <details key={`${faq.id}-${needle ? 's' : 'n'}`} open={i === 0 || needle !== ''}>
                <summary>{faq.question}<i><Plus /></i></summary>
                <p className="a">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="sec surface">
        <div className="wrap">
          <div className="shd">
            <div className="l">
              <span className="tag"><i />Keep going</span>
              <h2 className="d2">More places <em>to look.</em></h2>
            </div>
            <p>The documentation covers every search and case tab; the policy explains what the platform may and may not be used for.</p>
          </div>
          <div className="pd">
            <div className="pc">
              <span className="pill g">Guide</span>
              <h3>Documentation</h3>
              <p className="sm">How every search, case tab and organisation feature works.</p>
              <Link className="more" to="/documentation">Read the documentation →</Link>
            </div>
            <div className="pc">
              <span className="pill g">Policy</span>
              <h3>Responsible use</h3>
              <p className="sm">What the platform may and may not be used for.</p>
              <Link className="more" to="/responsible-use">Read the policy →</Link>
            </div>
            <div className="pc">
              <span className="pill g">Workspace</span>
              <h3>Open the workspace</h3>
              <p className="sm">Sign in with Google or email to start an investigation.</p>
              <Link className="more" to={user ? '/dashboard' : '/auth'}>{user ? 'Open the dashboard →' : 'Sign in →'}</Link>
            </div>
          </div>
        </div>
      </section>

      <div style={{ paddingTop: 72 }}>
        <NextPrev
          flush
          prev={{ to: '/about', small: '← Previous', label: 'About' }}
          next={{ to: '/', small: 'Next →', label: 'Home' }}
        />
      </div>
    </>
  );
};
