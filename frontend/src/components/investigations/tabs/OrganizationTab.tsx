import React, { useMemo, useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, ExternalLink, Globe, Loader2, MapPin, RotateCw, XCircle } from 'lucide-react';
import { fmtDate, parseLooseDate, shortUrl } from '../../../lib/workspace';
import {
  FIELD_LABEL, ORG_SECTIONS, confidenceText, entityClass, orgActivities, orgActivityInputs, orgProfile, sectionLabels, unitLabel, websitesAround,
  type ActivityKind, type FactGroup, type OrgSection
} from '../../../lib/organizationProfile';
import { STATUS_LABEL, TYPE_LABEL, allLocationRefs } from '../../../lib/locationEvidence';
import type { OrgField, WebsiteIntel, WebsitePageKind } from '../../../types/investigation';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { useOrgPipeline } from '../workspace/useOrgPipeline';
import { Chips, Empty, SectionHead, SourceLogo } from '../workspace/ui';

const PAGE_LABEL: Record<WebsitePageKind, string> = {
  home: 'Home page', about: 'About', contact: 'Contact', services: 'Services', products: 'Products', programs: 'Programmes',
  leadership: 'Leadership / team', departments: 'Departments / divisions', locations: 'Locations', news: 'News',
  projects: 'Projects', publications: 'Publications', events: 'Events', admissions: 'Admissions', careers: 'Careers'
};

/** People a source that speaks for the organisation names (its website, Wikidata, Google's panel). */
const OFFICIAL_KINDS = ['website', 'wikidata', 'knowledge_panel'];

const VERIFICATION_TEXT: Record<WebsiteIntel['verification']['status'], { label: string; cls: string }> = {
  verified: { label: 'Verified as the official website', cls: 'ok' },
  probable: { label: 'Probably the official website', cls: 'muted' },
  unverified: { label: 'Could not be verified as the official website', cls: 'warn' }
};

const NOT_FOUND = <span className="ws-sub">Not found in the sources</span>;

/** One value with how many independent sources agree, and each source with its link and words. */
const FactValue: React.FC<{ g: FactGroup; link?: boolean }> = ({ g, link }) => {
  const conf = confidenceText(g);
  return (
    <div className="ws-org-fact">
      <div>
        {link ? <a className="ws-link" href={g.value} target="_blank" rel="noopener noreferrer">{shortUrl(g.value)} <ExternalLink size={11} /></a> : <span>{g.value}</span>}
        {g.roles.length > 0 && <span className="ws-sub"> · {g.roles.join(', ')}</span>}
      </div>
      <details className="ws-org-src">
        <summary><span className={`ws-loc-status ${conf.cls}`}>{conf.text}</span> <span className="ws-sub">· {g.sources.length} source{g.sources.length === 1 ? '' : 's'}</span></summary>
        <ul>
          {g.claims.map((c, i) => (
            <li key={i}>
              {c.sourceUrl ? <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">{c.source}</a> : c.source}
              {c.value !== g.value && <span className="ws-sub"> — “{c.value}”</span>}
              {c.quote && <div className="ws-loc-quote">{c.quote}</div>}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
};

export const OrganizationTab: React.FC = () => {
  const { inv, d, focus, goTab, readOnly } = useWorkspace();
  const { running, enrich, readSite } = useOrgPipeline();
  const org = inv.organization;
  const [section, setSection] = useState<OrgSection>(ORG_SECTIONS.some(s => s.key === focus) ? focus as OrgSection : 'summary');
  const [showOlder, setShowOlder] = useState(false);
  const profile = useMemo(() => orgProfile(inv), [inv]);
  const site = inv.websiteIntel;
  const enr = inv.orgEnrich;
  const official = Boolean(site?.reachable && site.verification.status !== 'unverified');
  const ref = inv.lastSearched || inv.createdAt;
  const inputs = useMemo(() => orgActivityInputs(inv, d.buckets.news), [inv, d.buckets.news]);
  const news = useMemo(() => [...inputs.news].sort((x, y) => (parseLooseDate(y.date, ref)?.getTime() || 0) - (parseLooseDate(x.date, ref)?.getTime() || 0)), [inputs, ref]);
  const mentions = inputs.mentions;
  const sitePosts = inputs.sitePosts;
  const activities = useMemo(() => orgActivities([...news, ...mentions, ...sitePosts]), [news, mentions, sitePosts]);
  const cls = useMemo(() => entityClass(inv, profile), [inv, profile]);
  const labels = sectionLabels(cls.category);
  const sites = useMemo(() => websitesAround(inv, profile), [inv, profile]);
  // Places the Location tab connects to the organisation (its searches and this case's pages).
  const places = useMemo(() => allLocationRefs(inv).filter(r => r.status !== 'unconfirmed'), [inv]);

  if (!org) return <Empty title="Not an organisation case">This case is about a person, so there is no organisation information.</Empty>;

  const facts = profile.facts;
  const conflict = (f: OrgField) => profile.conflicts.includes(f);
  const row = (f: OrgField, opts: { max?: number; link?: boolean; label?: string } = {}) => {
    const groups = facts[f] || [];
    const max = opts.max || 8;
    return (
      <tr key={f}>
        <td className="ws-org-k"><b>{opts.label || FIELD_LABEL[f]}</b></td>
        <td className="ws-org-v">
          {conflict(f) && <div className="ws-org-conflict"><AlertTriangle size={13} /> {['headquarters', 'country', 'address'].includes(f) ? 'Location discrepancy detected' : 'Sources disagree'} — each value is shown with its sources.</div>}
          {groups.length ? groups.slice(0, max).map((g, i) => <FactValue key={i} g={g} link={opts.link} />) : NOT_FOUND}
          {groups.length > max && <span className="ws-sub">+{groups.length - max} more</span>}
        </td>
      </tr>
    );
  };
  const table = (rows: React.ReactNode) => <table className="ws-table ws-loc-table ws-org-table"><tbody>{rows}</tbody></table>;
  const pageBlock = (kinds: WebsitePageKind[], none: string) => {
    if (!site?.reachable) return <p className="ws-sub">{site ? 'The website could not be read.' : facts.website ? 'The website has not been read yet.' : 'No official website was found.'}</p>;
    const pages = site.pages.filter(p => kinds.includes(p.kind));
    if (!pages.length) return none ? <p className="ws-sub">{none}</p> : null;
    return (
      <div className="ws-loc-list">
        {pages.map(p => (
          <div key={p.url} className="ws-loc-ref">
            <div className="ws-loc-ref-head"><b>{PAGE_LABEL[p.kind]}</b>{!official && <span className="ws-loc-status warn">Website not confirmed as official</span>}</div>
            <div className="ws-loc-ref-body">
              <a className="ws-link" href={p.url} target="_blank" rel="noopener noreferrer">{p.title || shortUrl(p.url)} <ExternalLink size={12} /></a>
              {p.description && <p className="ws-loc-quote">{p.description}</p>}
              {p.text.slice(0, 3).map((t, i) => <p key={i} className="ws-loc-rel" style={{ margin: 0 }}>{t}</p>)}
              {p.headings.length > 0 && <div className="ws-org-tags">{p.headings.slice(0, 16).map(h => <span key={h} className="ws-tag">{h}</span>)}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  };
  const linkList = (items: Array<{ title: string; url: string; source: string; date?: string; snippet?: string }>) => (
    <div className="ws-loc-sources">
      {items.map(n => (
        <div key={`${n.url}|${n.title}`} className="ws-loc-source ws-org-news">
          <SourceLogo url={n.url} />
          <a className="name" href={n.url} target="_blank" rel="noopener noreferrer" title={n.snippet || n.title}>{n.title}</a>
          <span className="ws-sub ws-trunc">{n.source}{n.date ? ` · ${n.date}` : ''}</span>
        </div>
      ))}
    </div>
  );

  const body = () => {
    switch (section) {
      case 'summary':
        return (
          <>
            {table(<>
              <tr key="entity-type">
                <td className="ws-org-k"><b>Entity type</b></td>
                <td className="ws-org-v">
                  <div className="ws-org-fact">
                    <div><b>{cls.category}</b>{cls.parent && <span className="ws-sub"> · {cls.parent}</span>}</div>
                    <div className="ws-sub">
                      <span className={`ws-loc-status ${cls.confidence === 'Strong evidence' ? 'ok' : cls.confidence === 'Possible match' ? 'muted' : 'warn'}`}>{cls.confidence}</span>
                      {cls.basis.length ? ` · based on ${cls.basis.join('; ')}` : ' · no source describes what kind of organisation it is'}
                    </div>
                    {cls.alternatives.length > 0 && (
                      <div className="ws-sub">Also suggested by some sources: {cls.alternatives.map(a => a.category).join(', ')}</div>
                    )}
                  </div>
                </td>
              </tr>
              {row('official_name', { max: 2 })}
              {row('alt_name', { max: 6 })}
              {row('type', { max: 5 })}
              {row('industry', { max: 5 })}
              {row('sector', { max: 4 })}
              {row('description', { max: 3 })}
              {row('founded')}
              {row('employees', { max: 2 })}
              {row('parent', { max: 3 })}
              {row('subsidiary', { max: 10 })}
            </>)}
            {enr?.wikidata && 'ambiguous' in enr.wikidata && (
              <p className="ws-sub" style={{ marginTop: 12 }}>
                Wikidata has several organisations with this name ({enr.wikidata.ambiguous.map(a => a.description || a.label).join('; ')}); none was used, so they are not mixed up.
              </p>
            )}
            <details className="ws-org-src" style={{ marginTop: 16 }}>
              <summary><b>How it was recognised as an organisation</b></summary>
              <p className="ws-sub">{org.detectionReason}</p>
              {org.signals.map(s => (
                <div key={s.signal} className="ws-loc-place" style={{ fontWeight: 400, padding: '3px 0' }}>
                  {s.matched ? <CheckCircle2 size={15} color="var(--ws-good)" /> : <XCircle size={15} color="var(--ws-muted)" />} {s.signal}
                </div>
              ))}
            </details>
          </>
        );

      case 'locations':
        return (
          <>
            {table(<>
              {row('headquarters', { max: 4 })}
              {row('country', { max: 3 })}
              {row('address', { max: 8, label: 'Addresses' })}
              {row('coordinates', { max: 4 })}
              {row('hours', { max: 3 })}
            </>)}
            <div className="ws-loc-section">
              <SectionHead title="Google Maps listings" count={enr?.mapsListings.length || 0} />
              {!enr ? <p className="ws-sub">Not searched yet.</p> : enr.mapsListings.length === 0 ? <p className="ws-sub">Not found — no Google Maps listing carries the organisation’s name or links to its website.</p> : (
                <div className="ws-loc-list">
                  {enr.mapsListings.map(l => (
                    <div key={l.mapsUrl} className="ws-loc-ref">
                      <div className="ws-loc-ref-head">
                        <span className="ws-loc-place"><MapPin size={14} /> {l.title}</span>
                        {l.category && <span className="ws-tag">{l.category}</span>}
                        {typeof l.rating === 'number' && <span className="ws-sub">★ {l.rating}{l.reviews ? ` (${l.reviews})` : ''}</span>}
                      </div>
                      <div className="ws-loc-ref-body">
                        {l.address && <span>{l.address}</span>}
                        {l.phone && <span className="ws-sub">Phone: {l.phone}</span>}
                        {l.hours && <span className="ws-sub">Hours: {l.hours}</span>}
                        {l.latitude !== undefined && <span className="ws-sub">Coordinates: {l.latitude.toFixed(5)}, {l.longitude?.toFixed(5)}</span>}
                        <span className="ws-sub">Attributed because {l.matchedBy}. A listing can be a branch or office, not the headquarters.</span>
                        <a className="ws-link" href={l.mapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps <ExternalLink size={12} /></a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="ws-loc-section">
              <SectionHead title="Places connected in other sources" count={places.length} right={<button type="button" className="ws-link" onClick={() => goTab('location')}>Location tab →</button>} />
              {places.length === 0 ? <p className="ws-sub">None yet — the Location tab searches the web, news and Google Maps for places connected to the organisation.</p> : (
                <div className="ws-loc-list">
                  {places.slice(0, 20).map(p => (
                    <div key={p.id} className="ws-loc-ref" style={{ padding: '10px 0' }}>
                      <div className="ws-loc-ref-head">
                        <span className="ws-loc-place"><MapPin size={14} /> {p.place}</span>
                        <span className="ws-tag">{TYPE_LABEL[p.type]}</span>
                        <span className={`ws-loc-status ${p.status === 'stated' ? 'ok' : 'muted'}`}>{STATUS_LABEL[p.status]}</span>
                      </div>
                      <div className="ws-loc-ref-body">
                        <span className="ws-sub">{p.sourceKind} · <a className="ws-link" href={p.url} target="_blank" rel="noopener noreferrer">{shortUrl(p.url)}</a></span>
                        {p.evidence && <p className="ws-loc-quote">{p.evidence}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="ws-loc-section">
              <SectionHead title="Locations on the website" />
              {pageBlock(['locations', 'contact'], 'The website has no Locations or Contact page.')}
            </div>
            <p className="ws-sub" style={{ marginTop: 14 }}>
              All places connected to the organisation are also in the <button type="button" className="ws-link" onClick={() => goTab('location')}>Location tab</button>, and its phone numbers and emails in the{' '}
              <button type="button" className="ws-link" onClick={() => goTab('contact')}>Contact tab</button>.
            </p>
          </>
        );

      case 'products':
        return (
          <>
            {table(<>{row('unit', { max: 30, label: unitLabel(cls.category) })}{row('product', { max: 15 })}{row('service', { max: 10 })}</>)}
            <div className="ws-loc-section">
              <SectionHead title="From the organisation’s website" />
              {pageBlock(['services', 'products', 'programs', 'departments', 'admissions'], 'Not found — the website has no Services, Products, Programmes, Departments or Admissions page.')}
            </div>
          </>
        );

      case 'people':
        return (
          <>
            {(() => {
              const all = facts.person || [];
              const official = all.filter(g => g.claims.some(c => OFFICIAL_KINDS.includes(c.sourceKind)));
              const named = all.filter(g => !official.includes(g));
              return (
                <>
                  <SectionHead title="Leadership stated by the organisation" count={official.length} noRule />
                  <p className="ws-sub" style={{ margin: '2px 0 8px' }}>People the organisation’s own website, Wikidata or Google’s knowledge panel names in a role.</p>
                  {official.length ? table(official.map((g, i) => (
                    <tr key={i}><td className="ws-org-k"><b>{g.value}</b></td><td className="ws-org-v"><FactValue g={{ ...g, value: g.roles.join(' · ') || 'Role not stated', roles: [] }} /></td></tr>
                  ))) : <p className="ws-sub">Not found — no source that speaks for the organisation names its leaders.</p>}
                  {named.length > 0 && (
                    <div className="ws-loc-section" style={{ marginTop: 22 }}>
                      <SectionHead title="People named with the organisation in news and search results" count={named.length} />
                      <p className="ws-sub" style={{ margin: '2px 0 8px' }}>The role is as the article or page writes it. They may hold roles in another body — check the source before treating them as its leadership.</p>
                      {table(named.map((g, i) => (
                        <tr key={i}><td className="ws-org-k"><b>{g.value}</b></td><td className="ws-org-v"><FactValue g={{ ...g, value: g.roles.join(' · ') || 'Role not stated', roles: [] }} /></td></tr>
                      )))}
                    </div>
                  )}
                </>
              );
            })()}
            <p className="ws-sub" style={{ marginTop: 8 }}>Only people a source names in a role (founder, chief executive, chairperson, commander…). Nobody is added from a name alone.</p>
            <div className="ws-loc-section">
              <SectionHead title="Leadership page of the website" />
              {pageBlock(['leadership'], 'Not found — the website has no Leadership or Team page.')}
            </div>
          </>
        );

      case 'online':
        return (
          <>
            {table(row('website', { max: 4, link: true }))}
            <div className="ws-loc-section">
              <SectionHead title={<span className="ws-loc-place"><Globe size={16} /> Website intelligence</span>} right={
                facts.website && !readOnly && <button type="button" className="ws-btn ws-btn-sm" onClick={() => { readSite(); }} disabled={Boolean(running)}><RotateCw size={14} /> Read again</button>
              } />
              {!site && <p className="ws-sub">{facts.website ? 'The website has not been read yet.' : 'Not found — no source lists a website for the organisation.'}</p>}
              {site && !site.reachable && <p className="ws-loc-warn">Could not be read: {site.error || 'the website did not respond'}.</p>}
              {site?.reachable && (
                <>
                  <p>
                    <span className={`ws-loc-status ${VERIFICATION_TEXT[site.verification.status].cls}`}>{VERIFICATION_TEXT[site.verification.status].label}</span>
                    <span className="ws-sub"> · {shortUrl(site.finalUrl || site.requestedUrl)} · read {fmtDate(site.fetchedAt, true)} · {site.pages.length} page{site.pages.length === 1 ? '' : 's'}</span>
                  </p>
                  <p className="ws-sub">
                    {site.verification.reasons.length ? `Why: ${site.verification.reasons.map(r => r.replace(/\.$/, '')).join('; ')}.` : 'Nothing on the site ties it to this organisation.'}
                    {site.verification.status === 'unverified' && ' Its details are shown for reference only and are not attributed to the organisation.'}
                  </p>
                  {pageBlock(['home', 'about', 'contact', 'locations', 'careers'], '')}
                </>
              )}
            </div>
            <div className="ws-loc-section">
              <SectionHead title="Related websites" count={sites.related.length} />
              <p className="ws-sub" style={{ margin: '2px 0 8px' }}>Units, affiliated bodies and portals the official website links to, and other addresses listed for the organisation — not its main official website.</p>
              {sites.related.length === 0 ? <p className="ws-sub">None found.</p> : (
                <div className="ws-loc-sources">
                  {sites.related.map(s => (
                    <div key={s.host} className="ws-loc-source ws-org-news">
                      <SourceLogo url={s.url} />
                      <a className="name" href={s.url} target="_blank" rel="noopener noreferrer">{s.label} <span className="ws-sub">· {s.host}</span></a>
                      <span className="ws-sub ws-trunc">{s.basis}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="ws-loc-section">
              <SectionHead title="Third-party sources" count={sites.thirdParty.length} />
              <p className="ws-sub" style={{ margin: '2px 0 8px' }}>Other websites that write about the organisation (news, encyclopaedias, directories). Not the organisation’s own.</p>
              {sites.thirdParty.length === 0 ? <p className="ws-sub">{enr ? 'None found.' : 'Not searched yet.'}</p> : (
                <div className="ws-loc-sources">
                  {sites.thirdParty.map(s => (
                    <div key={s.host} className="ws-loc-source ws-org-news">
                      <SourceLogo url={s.url} />
                      <a className="name" href={s.url} target="_blank" rel="noopener noreferrer" title={s.label}>{s.host}</a>
                      <span className="ws-sub ws-trunc">{s.basis}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="ws-loc-section">
              <SectionHead title="Online accounts" count={facts.social?.length || 0} />
              {!facts.social?.length ? <p className="ws-sub">Not found — no public account of the organisation was found.</p> : (
                <div className="ws-loc-sources">
                  {facts.social.map(g => (
                    <div key={g.value} className="ws-loc-source">
                      <SourceLogo url={g.value} platform={g.roles[0]} />
                      <span className="name">{g.roles[0] || 'Profile'}</span>
                      <a className="ws-url ws-trunc" href={g.value} target="_blank" rel="noopener noreferrer">{shortUrl(g.value)}</a>
                      <span className={`ws-loc-status ${confidenceText(g).cls}`} title={g.sources.join(', ')}>{g.independent >= 2 ? `${g.independent} sources` : g.sources[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        );

      case 'news': {
        // Latest first: the last 12 months are shown; older or undated items are kept but folded away.
        const yearAgo = Date.now() - 365 * 86400000;
        const when = (d?: string) => parseLooseDate(d, ref)?.getTime() || 0;
        const byDate = <T extends { date?: string }>(items: T[]) => [...items].sort((a, b) => when(b.date) - when(a.date));
        const seen = new Set<string>();
        const allNews = byDate([...news, ...mentions.filter(m => (enr?.mentions || []).some(x => x.url === m.url && x.engine === 'google_news'))])
          .filter(n => (seen.has(n.url) ? false : (seen.add(n.url), true)));
        const recentNews = allNews.filter(n => when(n.date) >= yearAgo);
        const olderNews = allNews.filter(n => when(n.date) < yearAgo);
        const pages = mentions.filter(m => !allNews.some(n => n.url === m.url));
        const videos = byDate(enr?.videos || []);
        const recentVideos = videos.filter(v => when(v.date) >= yearAgo);
        const olderVideos = videos.filter(v => when(v.date) < yearAgo);
        const videoGrid = (list: typeof videos) => (
          <div className="ws-org-videos">
            {list.map(v => (
              <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer" className="ws-org-video">
                {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                <span className="t">{v.title}</span>
                <span className="ws-sub">{v.source}{v.date ? ` · ${v.date}` : ''}</span>
              </a>
            ))}
          </div>
        );
        const olderToggle = (n: number, what: string) => n > 0 && (
          <button type="button" className="ws-link" style={{ marginTop: 10 }} onClick={() => setShowOlder(s => !s)}>
            {showOlder ? `Hide older ${what}` : `Show older or undated ${what} (${n})`}
          </button>
        );
        return (
          <>
            <SectionHead title="Latest news · last 12 months" count={recentNews.length} noRule right={<button type="button" className="ws-link" onClick={() => goTab('news')}>News tab →</button>} />
            {recentNews.length > 0 ? linkList(recentNews) : (
              <p className="ws-sub">
                {allNews.length ? 'No news from the last 12 months was found.' : inv.newsCheckedAt || enr ? 'No news article naming the organisation was found.' : 'Not searched yet — the News tab searches Google News and Bing News.'}
              </p>
            )}
            {olderToggle(olderNews.length, 'news')}
            {showOlder && olderNews.length > 0 && <div style={{ marginTop: 8 }}>{linkList(olderNews)}</div>}

            <div className="ws-loc-section">
              <SectionHead title="Latest videos · last 12 months" count={recentVideos.length} right={<button type="button" className="ws-link" onClick={() => goTab('images')}>Images tab →</button>} />
              {recentVideos.length > 0 ? videoGrid(recentVideos) : <p className="ws-sub">{videos.length ? 'No video from the last 12 months was found.' : enr ? 'Not found — no video naming the organisation.' : 'Not searched yet.'}</p>}
              {olderToggle(olderVideos.length, 'videos')}
              {showOlder && olderVideos.length > 0 && <div style={{ marginTop: 8 }}>{videoGrid(olderVideos)}</div>}
            </div>

            <div className="ws-loc-section">
              <SectionHead title="Pages that mention it" count={pages.length} />
              {pages.length === 0 ? <p className="ws-sub">{enr ? 'Not found.' : 'Not searched yet.'}</p> : linkList(pages)}
            </div>
          </>
        );
      }

      case 'activities': {
        const kinds: ActivityKind[] = ['Events', 'Projects', 'Partnerships', 'Announcements', 'Publications', 'Awards'];
        return (
          <>
            <p className="ws-sub ws-loc-intro">
              Grouped from the titles of the news articles, web pages and website pages that name the organisation. Each item links to its source;
              the grouping follows the words used and is not a verified classification.
            </p>
            {activities.length === 0 && <Empty title="No activities found">No events, projects, partnerships, announcements, publications or awards were found in the news and pages checked.</Empty>}
            {kinds.map(k => {
              const items = activities.filter(a => a.kind === k);
              if (!items.length) return null;
              return (
                <div key={k} className="ws-loc-section" style={{ marginTop: 20 }}>
                  <SectionHead title={k} count={items.length} />
                  {linkList(items)}
                </div>
              );
            })}
          </>
        );
      }

      case 'sources':
        return (
          <>
            <div className="ws-org-stats">
              <div><b>{profile.stats.confirmed}</b><span className="ws-sub">facts confirmed by 2+ independent sources</span></div>
              <div><b>{profile.stats.single}</b><span className="ws-sub">facts from a single source</span></div>
              <div><b className={profile.stats.conflicts ? 'bad' : ''}>{profile.stats.conflicts}</b><span className="ws-sub">fields where sources disagree</span></div>
            </div>
            {profile.conflicts.length > 0 && (
              <div className="ws-loc-section" style={{ marginTop: 18 }}>
                <SectionHead title="Where sources disagree" />
                {table(profile.conflicts.map(f => row(f)))}
              </div>
            )}
            <div className="ws-loc-section">
              <SectionHead title="Sources searched" right={readOnly ? undefined :
                <button type="button" className="ws-btn ws-btn-sm" onClick={() => { enrich(); }} disabled={Boolean(running)}><RotateCw size={14} /> Search again</button>
              } />
              {!enr ? <p className="ws-sub">Not searched yet.</p> : enr.error ? <p className="ws-loc-warn">Unable to search the sources: {enr.error}</p> : (
                <table className="ws-table ws-loc-table">
                  <thead><tr><th>Source</th><th>Result</th><th>Used</th></tr></thead>
                  <tbody>
                    {enr.sources.map(s => (
                      <tr key={s.label}>
                        <td><b>{s.label}</b></td>
                        <td><span className={`ws-loc-status ${s.status === 'ok' ? 'ok' : s.status === 'failed' ? 'warn' : 'muted'}`}>{s.status === 'ok' ? `${s.results} result${s.results === 1 ? '' : 's'}` : s.status === 'empty' ? 'Nothing found' : `Unable to retrieve${s.error ? ` — ${s.error}` : ''}`}</span></td>
                        <td>{s.used}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {enr && <p className="ws-sub" style={{ marginTop: 8 }}>Searched {fmtDate(enr.checkedAt, true)}. Uses 6–7 SerpApi searches (Google Maps, Google ×2, Google News for the last 12 months, DuckDuckGo, social platforms, YouTube for this year — repeats within 12 hours are free); Wikidata and the website are read directly at no cost.</p>}
            </div>
            <div className="ws-loc-section">
              <SectionHead title="Key sources" count={profile.sources.length} />
              {profile.sources.length === 0 ? <p className="ws-sub">No source gave facts about the organisation yet.</p> : (
                <div className="ws-loc-sources">
                  {profile.sources.map(s => (
                    <div key={s.label} className="ws-loc-source ws-org-news">
                      <SourceLogo url={s.url} />
                      {s.url ? <a className="name" href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a> : <span className="name">{s.label}</span>}
                      <span className="ws-sub">{s.facts} fact{s.facts === 1 ? '' : 's'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        );
    }
  };

  return (
    <div className="ws-loc">
      <SectionHead title={<span className="ws-loc-place"><Building2 size={16} /> {facts.official_name?.[0]?.value || org.name}</span>} noRule right={
        <span className="ws-org-kind" title={cls.basis.length ? `Based on: ${cls.basis.join('; ')}` : 'No source states what kind of organisation it is'}>
          <Building2 size={14} /> {cls.category}{cls.parent ? ` (${cls.parent})` : ''} · {cls.confidence}
        </span>
      } />
      <p className="ws-sub ws-loc-intro">
        Facts from Google’s knowledge panel, Wikidata, Google Maps, Google, Google News and DuckDuckGo results, social platforms and the organisation’s own
        website. Each fact shows how many independent sources agree; disagreements are shown, never resolved silently. Anything no source
        gives is “Not found” — nothing is filled in or guessed, and organisations with a similar name are not merged in.
      </p>
      {running ? (
        <p className="ws-org-running"><Loader2 size={15} className="ws-spin" /> {running === 'enrich' ? 'Searching Google Maps, Google, Google News, DuckDuckGo, social platforms, YouTube and Wikidata…' : 'Reading and verifying the official website…'}</p>
      ) : (
        <p className="ws-sub ws-org-status">
          {enr
            ? <>Sources searched {fmtDate(enr.checkedAt, true)} · {enr.error ? <span className="ws-loc-warn">{enr.error}</span> : `${enr.sources.filter(s => s.status !== 'failed').length} of ${enr.sources.length} sources answered`}{enr.sources.some(s => s.status === 'failed') && <> · <button type="button" className="ws-link" onClick={() => setSection('sources')}>see which failed</button></>}</>
            : 'The organisation sources have not been searched yet.'}{' '}
          {!readOnly && <button type="button" className="ws-btn ws-btn-sm" onClick={() => { enrich(); }}><RotateCw size={13} /> Search again</button>}
        </p>
      )}
      <Chips options={ORG_SECTIONS.map(s => ({ key: s.key, label: labels[s.key] || s.label }))} value={section} onChange={k => setSection(k as OrgSection)} />
      <div style={{ marginTop: 16 }}>{body()}</div>
    </div>
  );
};
