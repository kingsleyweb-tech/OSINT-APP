import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from './Icons';

/** Dot-grid hero used at the top of every inner page. */
export const PageHero: React.FC<{
  crumb: string;
  tag: string;
  title: React.ReactNode;
  lead: string;
  stats?: { value: string; label: string }[];
  children?: React.ReactNode;
}> = ({ crumb, tag, title, lead, stats, children }) => {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };
  return (
    <section className="phero">
      <div className="wrap">
        <div className="crumb">
          <button type="button" className="back" onClick={goBack}><ArrowLeft />Back</button>
          <span>Home / {crumb}</span>
        </div>
        <span className="tag on-dark"><i />{tag}</span>
        <h1 className="d1">{title}</h1>
        <p className="lead">{lead}</p>
        {stats && stats.length > 0 && (
          <div className="hstats">
            {stats.map((s) => <div className="glass" key={s.label}><b>{s.value}</b><span>{s.label}</span></div>)}
          </div>
        )}
        {children}
      </div>
    </section>
  );
};

/** Previous / next band at the bottom of an inner page. */
export const NextPrev: React.FC<{
  prev: { to: string; small: string; label: string };
  next: { to: string; small: string; label: string };
  flush?: boolean;
}> = ({ prev, next, flush }) => (
  <div className="wrap">
    <div className="nextp" style={flush ? { paddingTop: 0 } : undefined}>
      <Link to={prev.to}><span><small>{prev.small}</small><b>{prev.label}</b></span></Link>
      <Link to={next.to} className="go">
        <span><small>{next.small}</small><b>{next.label}</b></span>
        <span className="round"><ArrowRight size={20} width={2} /></span>
      </Link>
    </div>
  </div>
);

/** Scrolls to an in-page section without changing the route (HashRouter-safe). */
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

type TocItem = { id: string; label: string; n?: string };

/** "On this page" card used beside legal articles. */
export const TocCard: React.FC<{ title: string; role: string; items: TocItem[] }> = ({ title, role, items }) => {
  const [active, setActive] = useState(items[0]?.id);
  return (
    <aside className="idcard">
      <nav className="b" aria-label="On this page">
        <b>{title}</b>
        <div className="role">{role}</div>
        {items.map((it) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            className={`dl ${active === it.id ? 'on' : ''}`}
            onClick={(e) => { e.preventDefault(); setActive(it.id); scrollTo(it.id); }}
          >
            {it.n && <small>{it.n}</small>}{it.label}
          </a>
        ))}
      </nav>
    </aside>
  );
};

/** Chip row of in-page links under an inner-page hero. */
export const SectionChips: React.FC<{ items: TocItem[] }> = ({ items }) => {
  const [active, setActive] = useState(items[0]?.id);
  return (
    <div className="wrap subbar">
      <nav className="chips" aria-label="On this page">
        {items.map((it) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            className={`chip ${active === it.id ? 'on' : ''}`}
            onClick={(e) => { e.preventDefault(); setActive(it.id); scrollTo(it.id); }}
          >
            {it.label}
          </a>
        ))}
      </nav>
    </div>
  );
};

/** Numbered article section used on the legal pages. */
export const Art: React.FC<{ id: string; n: string; title: string; children: React.ReactNode }> = ({ id, n, title, children }) => (
  <section className="art" id={id}>
    <span className="n">{n}</span>
    <h2 className="d3">{title}</h2>
    {children}
  </section>
);
