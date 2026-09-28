import React, { useMemo } from 'react';
import { AlertTriangle, Building2, Loader2 } from 'lucide-react';
import { shortUrl } from '../../../lib/workspace';
import {
  entityClass, orgActivities, orgActivityInputs, orgProfile, sectionLabels, type FactGroup, type OrgSection
} from '../../../lib/organizationProfile';
import { allLocationRefs } from '../../../lib/locationEvidence';
import type { OrgField } from '../../../types/investigation';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { useOrgPipeline } from '../workspace/useOrgPipeline';

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const OFFICIAL_KINDS = ['website', 'wikidata', 'knowledge_panel'];

/**
 * The Overview of an organisation case: an identity header (what kind of entity it is, how sure, which
 * abbreviation), then one short card per section that has information — each built from the cross-checked
 * organisation profile and opening the matching section of the Organisation tab. Sections with nothing
 * found are listed in one line instead of empty cards.
 */
export const OrgOverview: React.FC<{ contact: React.ReactNode; platforms: string[] }> = ({ contact, platforms }) => {
  const { inv, d, goTab } = useWorkspace();
  const { running } = useOrgPipeline();
  const org = inv.organization!;
  const profile = useMemo(() => orgProfile(inv), [inv]);
  const cls = useMemo(() => entityClass(inv, profile), [inv, profile]);
  const labels = sectionLabels(cls.category);
  const inputs = useMemo(() => orgActivityInputs(inv, d.buckets.news), [inv, d.buckets.news]);
  const activities = useMemo(() => orgActivities([...inputs.news, ...inputs.mentions, ...inputs.sitePosts]), [inputs]);
  const places = useMemo(() => allLocationRefs(inv).filter(r => r.status !== 'unconfirmed'), [inv]);
  const f = profile.facts;
  const site = inv.websiteIntel;
  const official = Boolean(site?.reachable && site.verification.status !== 'unverified');

  const first = (field: OrgField) => f[field]?.[0];
  const conf = (g?: FactGroup) => (g ? (g.independent >= 2 ? ` (${g.independent} sources)` : '') : '');
  const values = (field: OrgField, n: number) => (f[field] || []).slice(0, n).map(g => cap(g.value));
  const go = (s: OrgSection) => () => goTab('organization', s);

  const hq = first('headquarters');
  const leaders = (f.person || []).filter(g => g.claims.some(c => OFFICIAL_KINDS.includes(c.sourceKind))).slice(0, 4);
  const website = first('website');
  const pageHeadings = official ? site!.pages.filter(p => ['services', 'products', 'programs', 'departments'].includes(p.kind)).flatMap(p => p.headings).slice(0, 6) : [];
  const products = [...values('product', 4), ...values('service', 3)];
  const latest = inputs.news[0] || inputs.mentions[0];
  const activityCounts = activities.reduce<Record<string, number>>((m, a) => ({ ...m, [a.kind]: (m[a.kind] || 0) + 1 }), {});
  const abbreviations = values('alt_name', 3).filter(a => /^[A-Z0-9&.]{2,8}$/.test(a));
  const industry = [...values('industry', 3), ...values('sector', 2)];

  const cards: Array<{ title: string; section: OrgSection; has: boolean; content: React.ReactNode }> = [
    {
      title: 'Identity', section: 'summary', has: true,
      content: <>
        <div><b>{cap(first('official_name')?.value || org.name)}</b>{abbreviations.length > 0 && <span className="ws-sub"> · {abbreviations.join(', ')}</span>}</div>
        {first('description') && <div>{first('description')!.value}</div>}
        <div className="ws-sub">Founded: {first('founded') ? `${first('founded')!.value}${conf(first('founded'))}` : 'Not found'}</div>
      </>
    },
    { title: 'Industry / sector', section: 'summary', has: industry.length > 0, content: industry.join(' · ') },
    {
      title: labels.locations || 'Headquarters & locations', section: 'locations', has: Boolean(hq || f.address?.length || inv.orgEnrich?.mapsListings.length || places.length),
      content: <>
        <div>Headquarters: {hq ? <b>{hq.value}{conf(hq)}</b> : <span className="ws-sub">Not found</span>}
          {profile.conflicts.includes('headquarters') && <span className="ws-org-conflict" style={{ marginLeft: 6 }}><AlertTriangle size={12} /> location discrepancy</span>}</div>
        <div className="ws-sub">
          {[first('country') ? `Country: ${first('country')!.value}` : '', f.address?.length ? `${f.address.length} address${f.address.length === 1 ? '' : 'es'}` : '',
            inv.orgEnrich?.mapsListings.length ? `${inv.orgEnrich.mapsListings.length} Google Maps listing${inv.orgEnrich.mapsListings.length === 1 ? '' : 's'}` : '',
            places.length ? `places in sources: ${Array.from(new Set(places.map(p => p.place))).slice(0, 3).join(', ')}` : ''].filter(Boolean).join(' · ')}
        </div>
      </>
    },
    { title: labels.products || 'Products & services', section: 'products', has: products.length > 0 || pageHeadings.length > 0, content: (products.length ? products : pageHeadings).join(' · ') },
    {
      title: 'Official website', section: 'online', has: Boolean(website),
      content: website && <>
        <a className="ws-link" href={website.value} target="_blank" rel="noopener noreferrer">{shortUrl(website.value)}</a>
        <span className="ws-sub"> · {site ? (site.reachable ? { verified: 'verified from the website itself', probable: 'probably official', unverified: 'could not be verified' }[site.verification.status] : 'could not be read') : 'not read yet'}{site?.reachable ? `, ${site.pages.length} pages read` : ''}</span>
        <div className="ws-sub">Listed by {website.sources.slice(0, 3).join(', ')}</div>
      </>
    },
    { title: 'Contact', section: 'locations', has: Boolean(f.phone?.length || f.email?.length), content: <>{contact}</> },
    { title: labels.people || 'Leadership', section: 'people', has: leaders.length > 0, content: leaders.map(p => `${p.value}${p.roles.length ? ` (${p.roles[0]})` : ''}`).join(' · ') },
    {
      title: 'Social presence', section: 'online', has: Boolean(f.social?.length || platforms.length),
      content: `${(f.social || []).length} account${(f.social || []).length === 1 ? '' : 's'}${f.social?.length ? `: ${Array.from(new Set(f.social.map(g => g.roles[0]).filter(Boolean))).slice(0, 5).join(', ')}` : ''}`
    },
    {
      title: 'News & activities', section: 'news', has: Boolean(inputs.news.length || inputs.mentions.length || activities.length),
      content: <>
        <div>{inputs.news.length} news · {inputs.mentions.length} mentions · {inv.orgEnrich?.videos.length || 0} videos{activities.length ? ` · ${Object.entries(activityCounts).map(([k, n]) => `${n} ${k.toLowerCase()}`).join(', ')}` : ''}</div>
        {latest && <div className="ws-sub">Latest: <a className="ws-link" href={latest.url} target="_blank" rel="noopener noreferrer">{latest.title}</a></div>}
      </>
    },
    { title: 'Key sources', section: 'sources', has: profile.sources.length > 0, content: profile.sources.slice(0, 4).map(s => `${s.label} (${s.facts})`).join(' · ') },
    {
      title: 'Verification status', section: 'sources', has: true,
      content: <>
        <div><b>{profile.stats.confirmed}</b> facts confirmed by 2+ sources · <b>{profile.stats.single}</b> single-source</div>
        <div className={profile.stats.conflicts ? 'ws-org-conflict' : 'ws-sub'}>
          {profile.stats.conflicts ? <><AlertTriangle size={12} /> Sources disagree on {profile.conflicts.map(c => c.replace('_', ' ')).join(', ')}</> : 'No disagreements between sources'}
        </div>
      </>
    }
  ];
  const shown = cards.filter(c => c.has);
  const missing = cards.filter(c => !c.has).map(c => c.title);

  return (
    <div className="ws-infobox" style={{ display: 'block' }}>
      <div className="ws-infobox-head">
        <span className="ws-org-kind" title={cls.basis.join('; ')}><Building2 size={15} /> {cls.category} · {cls.confidence}</span>
        <span className="ws-sub">
          {cls.basis.length ? `Type from ${cls.basis.slice(0, 2).join(' and ')}.` : 'The sources do not state what kind of organisation it is.'}
          {inv.entityResolution?.kind === 'resolved' && ` “${inv.entityResolution.query.toUpperCase()}” stands for ${inv.entityResolution.candidates[0].name} in ${inv.entityResolution.candidates[0].support} sources.`}
        </span>
        {running && <span className="ws-org-running" style={{ margin: 0 }}><Loader2 size={14} className="ws-spin" /> {running === 'enrich' ? 'Searching more sources…' : 'Reading the website…'}</span>}
      </div>

      <div className="ws-org-sections">
        {shown.map(c => (
          <div key={c.title} className="ws-org-card">
            <h4>{c.title} <button type="button" className="ws-link" onClick={go(c.section)}>Details →</button></h4>
            <div className="v">{c.content}</div>
          </div>
        ))}
      </div>
      {missing.length > 0 && <p className="ws-sub" style={{ margin: '12px 0 0' }}>Not found in the sources so far: {missing.join(', ')}.</p>}
    </div>
  );
};
