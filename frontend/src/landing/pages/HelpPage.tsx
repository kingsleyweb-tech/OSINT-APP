import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Search, ChevronDown, ChevronUp, Mail, MessageSquare, BookOpen, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'general' | 'search' | 'accuracy' | 'account' | 'privacy';
  question: string;
  answer: string;
}

export const PublicHelpPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openId, setOpenId] = useState<string | null>('faq-1');

  const faqs: FAQItem[] = [
    {
      id: 'faq-1',
      category: 'general',
      question: 'What is the OSINT Investigation Platform?',
      answer: 'It is a web-based open-source intelligence research workspace designed for conducting ethical public searches on people and usernames. It automates query building, executes index searches via SerpApi, verifies live profiles, and organizes digital footprints into clean case records.'
    },
    {
      id: 'faq-2',
      category: 'search',
      question: 'How does Person / Name search work?',
      answer: 'Name Search uses SerpApi to query public Google search engine indexes with targeted operators (site constraints, exact match phrase quotes, and role/location qualifiers). It aggregates matching social profiles, news mentions, publications, and web references.'
    },
    {
      id: 'faq-3',
      category: 'search',
      question: 'How does Username search work?',
      answer: 'Username search takes a target handle (e.g. "johndoe") and checks over 30 top public platforms (GitHub, LinkedIn, X, Instagram, Medium, Reddit, YouTube, etc.) for existing profiles and associated public activity.'
    },
    {
      id: 'faq-4',
      category: 'search',
      question: 'What search provider powers the backend?',
      answer: 'Search is powered by SerpApi. SerpApi delivers real-time, structured JSON data directly from public Google search engine indexes safely and reliably.'
    },
    {
      id: 'faq-5',
      category: 'accuracy',
      question: 'What should I do if a search returns zero results?',
      answer: 'Zero results can occur if the subject name is unique with limited web indexing, or if location/role qualifiers were too restrictive. Try broadening search terms, removing quotes, or searching by username handle instead.'
    },
    {
      id: 'faq-6',
      category: 'accuracy',
      question: 'How do I handle similar names or false matches?',
      answer: 'Common names (e.g., "John Smith") frequently produce search engine results for multiple individuals. Review the candidate profile bio, location, employment history, and original URLs before attributing a profile to your subject.'
    },
    {
      id: 'faq-7',
      category: 'privacy',
      question: 'Does the platform collect or store private non-public data?',
      answer: 'No. The platform only queries publicly discoverable search engine indexes and public profile endpoints. It does not hack, access private accounts, or query non-public databases.'
    },
    {
      id: 'faq-8',
      category: 'privacy',
      question: 'Are target subjects notified when I search for them?',
      answer: 'No. All searches are conducted via search index queries through SerpApi. Target profiles are never directly notified or pinged.'
    },
    {
      id: 'faq-9',
      category: 'account',
      question: 'How are saved investigations protected?',
      answer: 'Saved cases, candidate profile bookmarks, and notes are stored in Firebase Firestore and protected by security rules enforcing strict per-user UID isolation.'
    }
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
          
          <div style={{ textAlign: 'center', maxWidth: '840px', margin: '0 auto 48px' }}>
            <div className="lp-badge" style={{ margin: '0 auto 16px' }}>
              <HelpCircle size={14} />
              <span>Support & Help Center</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
              Help Center & Troubleshooting
            </h1>
            <p className="lp-subtitle">
              Find answers to common questions regarding search execution, accuracy verification, case management, and SerpApi integration.
            </p>

            <div style={{ position: 'relative', marginTop: '28px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search help topics, keywords, or error troubleshooting..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
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

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'general', label: 'General Scope' },
              { id: 'search', label: 'Search Workflows' },
              { id: 'accuracy', label: 'Accuracy & Verification' },
              { id: 'account', label: 'Account & Firestore' },
              { id: 'privacy', label: 'Privacy & Ethics' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  background: selectedCategory === cat.id ? 'var(--accent-warm)' : 'transparent',
                  color: selectedCategory === cat.id ? '#ffffff' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: selectedCategory === cat.id ? 'var(--accent-warm)' : 'var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ maxWidth: '960px', margin: '0 auto 60px', display: 'flex', flexDirection: 'column' }}>
            {filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div key={faq.id} style={{ borderTop: '1px solid var(--border-color)', padding: '18px 0' }}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: '4px 0'
                    }}
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp size={20} style={{ color: 'var(--accent-warm-light)', flexShrink: 0 }} />
                    ) : (
                      <ChevronDown size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    )}
                  </button>
                  {isOpen && (
                    <div style={{ padding: '14px 0 6px', color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ borderTop: '1px solid var(--border-color)' }} />
          </div>

          <div className="lp-help-links-grid">
            <div>
              <BookOpen size={24} style={{ color: 'var(--accent-warm-light)', marginBottom: '8px' }} />
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Technical Manual</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: 1.6 }}>Explore in-depth setup, dorks, and confidence rules.</p>
              <Link to="/documentation" className="btn-outline" style={{ fontSize: '0.85rem' }}>
                View Documentation
              </Link>
            </div>

            <div>
              <MessageSquare size={24} style={{ color: 'var(--accent-warm-light)', marginBottom: '8px' }} />
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Responsible Use</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: 1.6 }}>Review ethics guidelines and non-FCRA rules.</p>
              <Link to="/responsible-use" className="btn-outline" style={{ fontSize: '0.85rem' }}>
                View Ethics Policy
              </Link>
            </div>

            <div>
              <Mail size={24} style={{ color: 'var(--accent-warm-light)', marginBottom: '8px' }} />
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Launch Workspace</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: 1.6 }}>Sign in to start your public search investigation.</p>
              <Link to="/auth" className="btn-primary-warm" style={{ fontSize: '0.85rem' }}>
                Launch Workspace <ArrowRight size={14} />
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};
