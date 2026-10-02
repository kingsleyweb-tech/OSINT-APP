import React from 'react';
import appLogo from '../../../assets/images/osint-logo.svg';
import entityGraph from '../../../assets/images/entity-graph.png';

/* Illustrations of the app inside a laptop and a phone frame (decorative, aria-hidden by the caller). */

const C = { exact: '#22c55e', variation: '#3b82f6', related: '#7c3aed', other: '#ef4444' };

const Dot: React.FC<{ c: string }> = ({ c }) => <i style={{ background: c }} />;

const Levels: React.FC<{ on: 'Raw' | 'Relevant' | 'Validated' }> = ({ on }) => (
  <span className="app-lvl">
    {(['Raw', 'Relevant', 'Validated'] as const).map((l) => <span key={l} className={l === on ? 'on' : undefined}>{l}</span>)}
  </span>
);

type LaptopView = 'case' | 'people' | 'org' | 'network';

const NAV: [string, LaptopView[]][] = [
  ['Dashboard', []], ['New Investigation', ['people']], ['Investigations', ['case', 'org']], ['People', []], ['Alerts', []],
];
const NAV_SEARCH = ['Social search', 'News', 'Media', 'Geo search', 'Trends'];

const CaseView: React.FC = () => {
  const rows: [string, string, string, string, string, 'Raw' | 'Relevant' | 'Validated'][] = [
    ['In', 'LinkedIn', 'Reachable', C.exact, 'Exact match', 'Validated'],
    ['Fb', 'Facebook', 'Reachable', C.exact, 'Exact match', 'Validated'],
    ['Ig', 'Instagram', 'Reachable', C.variation, 'Username variation', 'Relevant'],
    ['Gh', 'GitHub', 'Reachable', C.exact, 'Exact match', 'Relevant'],
    ['X', 'X (Twitter)', 'Unverifiable', C.related, 'Possibly related', 'Raw'],
    ['Yt', 'YouTube', 'Similar account · kept apart', C.other, 'Other person', 'Raw'],
  ];
  return (
    <>
      <div className="app-top">
        <div><div className="app-h">Kwame Mensah</div><div className="app-sub">Name investigation · Accra · Completed</div></div>
        <div className="app-btns"><span className="app-btn">Re-run</span><span className="app-btn">Share</span><span className="app-btn p">Export</span></div>
      </div>
      <div className="app-tabs">
        {['Overview', 'Profiles', 'Activity', 'Associations', 'Sources', 'Web', 'News', 'Images', 'Location', 'Contact', 'Metrics', 'Audit'].map((t) => <span key={t} className={t === 'Profiles' ? 'on' : undefined}>{t}</span>)}
      </div>
      <div className="app-body">
        <div className="app-card">
          <div className="app-ct">Profiles <span>6 found · each with its source</span></div>
          {rows.map(([ic, name, sub, c, lab, lvl]) => (
            <div className="app-row" key={name}><span className="app-ic">{ic}</span><div><b>{name}</b><small>{sub}</small></div><span className="app-lab"><Dot c={c} />{lab}</span><Levels on={lvl} /></div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1cqw' }}>
          <div className="app-card">
            <div className="app-ct">Evidence levels</div>
            <div className="app-row"><div><b>Validated</b><small>Checked by you</small></div><span className="app-lab">2</span></div>
            <div className="app-row"><div><b>Relevant</b><small>Worth keeping</small></div><span className="app-lab">2</span></div>
            <div className="app-row"><div><b>Raw</b><small>Found, not reviewed</small></div><span className="app-lab">2</span></div>
          </div>
          <div className="app-card">
            <div className="app-ct">Audit <span>time-stamped</span></div>
            <div className="app-row"><div><b>LinkedIn marked Validated</b><small>Evidence level changed</small></div></div>
            <div className="app-row"><div><b>Case opened</b><small>6 profiles · news · images</small></div></div>
            <div className="app-row"><div><b>Name search</b><small>Standard · location “Accra”</small></div></div>
          </div>
        </div>
      </div>
    </>
  );
};

const PeopleView: React.FC = () => (
  <>
    <div className="app-top">
      <div><div className="app-h">“Kwame Mensah”</div><div className="app-sub">Name search · Intelligent mode · 3 possible people</div></div>
      <div className="app-btns"><span className="app-btn">Add location</span><span className="app-btn p">New search</span></div>
    </div>
    <div className="app-tabs"><span className="on">Possible people</span><span>Web</span><span>News</span><span>Search path</span></div>
    <div className="app-body three">
      <div className="app-card">
        <div className="app-ct">Person 1 <span>Strong evidence</span></div>
        <div className="app-row"><span className="app-ic">In</span><div><b>LinkedIn</b><small>Profile match</small></div></div>
        <div className="app-row"><span className="app-ic">Fb</span><div><b>Facebook</b><small>Profile match</small></div></div>
        <div className="app-row"><span className="app-ic">Gh</span><div><b>GitHub</b><small>Likely match</small></div></div>
        <div className="app-row"><span className="app-btn p">Open case</span></div>
      </div>
      <div className="app-card">
        <div className="app-ct">Person 2 <span>Possible match</span></div>
        <div className="app-row"><span className="app-ic">Ig</span><div><b>Instagram</b><small>Possible match</small></div></div>
        <div className="app-row"><span className="app-ic">X</span><div><b>X (Twitter)</b><small>Possible match</small></div></div>
        <div className="app-row"><span className="app-btn">Open case</span></div>
      </div>
      <div className="app-card">
        <div className="app-ct">Person 3 <span>Mention only</span></div>
        <div className="app-row"><span className="app-ic">Nw</span><div><b>News article</b><small>Name mentioned</small></div></div>
        <div className="app-row"><span className="app-btn">Open case</span></div>
      </div>
    </div>
  </>
);

const OrgView: React.FC = () => (
  <>
    <div className="app-top">
      <div><div className="app-h">[Organisation name]</div><div className="app-sub">Organisation · University · Strong evidence</div></div>
      <div className="app-btns"><span className="app-btn">Track organisation</span><span className="app-btn">Share</span><span className="app-btn p">Export</span></div>
    </div>
    <div className="app-tabs">
      {['Overview', 'Organisation', 'Profiles', 'Activity', 'Associations', 'Sources', 'Web', 'News', 'Images', 'Location', 'Contact'].map((t) => <span key={t} className={t === 'Organisation' ? 'on' : undefined}>{t}</span>)}
    </div>
    <div className="app-body">
      <div className="app-card">
        <div className="app-ct">Sources and verification <span>each fact keeps its source</span></div>
        <div className="app-row"><div><b>Official name</b><small>and short forms</small></div><span className="app-lab"><Dot c={C.exact} />Confirmed by 4 independent sources</span></div>
        <div className="app-row"><div><b>Official website</b><small>About · Contact · Leadership read</small></div><span className="app-lab"><Dot c={C.exact} />Verified</span></div>
        <div className="app-row"><div><b>Headquarters</b><small>Maps listing · opening hours</small></div><span className="app-lab"><Dot c={C.exact} />Confirmed by 3 independent sources</span></div>
        <div className="app-row"><div><b>Leadership</b><small>Named on the official website</small></div><span className="app-lab"><Dot c={C.variation} />Single source</span></div>
        <div className="app-row"><div><b>Founding year</b><small>Both answers shown</small></div><span className="app-lab"><Dot c={C.other} />Sources disagree</span></div>
        <div className="app-row"><div><b>Phone number</b><small>No public source gives it</small></div><span className="app-lab">Not found</span></div>
      </div>
      <div className="app-card">
        <div className="app-ct">News and media <span>last 12 months</span></div>
        <div className="app-row"><span className="app-ic">Nw</span><div><b>[Headline]</b><small>Publisher · date</small></div></div>
        <div className="app-row"><span className="app-ic">Nw</span><div><b>[Headline]</b><small>Publisher · date</small></div></div>
        <div className="app-row"><span className="app-ic">Vd</span><div><b>[Video title]</b><small>Channel · date</small></div></div>
        <div className="app-row"><span className="app-ic">Nw</span><div><b>[Headline]</b><small>Publisher · date</small></div></div>
      </div>
    </div>
  </>
);

const NetworkView: React.FC = () => (
  <>
    <div className="app-top">
      <div><div className="app-h">Network</div><div className="app-sub">How the people, usernames, organisations and websites in your cases connect</div></div>
      <div className="app-btns"><span className="app-btn">Compare two cases</span></div>
    </div>
    <div className="app-body one" style={{ paddingTop: 0 }}>
      <div className="app-card" style={{ position: 'relative', padding: 0, background: '#000' }}>
        <img className="app-img hue" src={entityGraph} alt="" />
      </div>
    </div>
  </>
);

export const AppLaptop: React.FC<{ view?: LaptopView }> = ({ view = 'case' }) => (
  <div className="laptop">
    <div className="lid">
      <div className="notch"><span /></div>
      <div className="screen">
        <div className="app">
          <aside className="app-side">
            <div className="app-brand"><img src={appLogo} alt="" />OSINT Platform</div>
            {NAV.map(([label, views]) => <div key={label} className={`app-nav ${views.includes(view) ? 'on' : ''}`}>{label}</div>)}
            <div className="app-sec">Search</div>
            {NAV_SEARCH.map((l) => <div key={l} className="app-nav">{l}</div>)}
            <div className="app-sec">Analyse</div>
            <div className={`app-nav ${view === 'network' ? 'on' : ''}`}>Network</div>
            <div className="app-nav">Content analysis</div>
            <div className="app-nav">Search history</div>
          </aside>
          <div className="app-main">
            {view === 'case' && <CaseView />}
            {view === 'people' && <PeopleView />}
            {view === 'org' && <OrgView />}
            {view === 'network' && <NetworkView />}
          </div>
        </div>
        <div className="glare" />
      </div>
    </div>
    <div className="base"><div className="groove" /></div>
  </div>
);

type PhoneView = 'username' | 'alerts' | 'search';

const PaCard: React.FC<{ ic: string; title: string; sub: string; lab?: React.ReactNode; newCount?: string; note?: string }> = ({ ic, title, sub, lab, newCount, note }) => (
  <div className="pa-card">
    <div className="pa-row"><span className="pa-ic">{ic}</span><div><b>{title}</b><small>{sub}</small></div>{newCount && <span className="pa-new">{newCount}</span>}</div>
    {lab && <span className="pa-lab">{lab}</span>}
    {note && <div className="pa-note">{note}</div>}
  </div>
);

export const AppPhone: React.FC<{ view?: PhoneView }> = ({ view = 'username' }) => (
  <div className="phone">
    <div className="body">
      <span className="btn-side b1" /><span className="btn-side b2" /><span className="btn-side b3" /><span className="btn-side b4" />
      <div className="screen">
        <div className="island"><span /></div>
        <div className="pa">
          <div className="pa-top">
            <div className="pa-brand"><img src={appLogo} alt="" />OSINT Platform</div>
            <div className="pa-menu"><i /><i /><i /></div>
          </div>
          {view === 'username' && (
            <>
              <div className="pa-h">humblechild_99</div>
              <div className="pa-sub">Username search · 5 accounts · 3 variations searched</div>
              <div className="pa-tabs"><span className="on">All</span><span>GitHub</span><span>Reddit</span><span>TikTok</span><span>YouTube</span></div>
              <div className="pa-list">
                <PaCard ic="Gh" title="GitHub" sub="humblechild_99" lab={<><Dot c={C.exact} />Exact match</>} />
                <PaCard ic="Rd" title="Reddit" sub="humblechild99" lab={<><Dot c={C.variation} />Username variation</>} />
                <PaCard ic="Tk" title="TikTok" sub="99_humblechild" lab={<><Dot c={C.variation} />Username variation</>} />
                <PaCard ic="Yt" title="YouTube" sub="Same display name" lab={<><Dot c={C.related} />Possibly related</>} />
                <PaCard ic="Ma" title="Mastodon" sub="Nothing links it to your subject" lab={<><Dot c={C.other} />Other person</>} />
              </div>
            </>
          )}
          {view === 'alerts' && (
            <>
              <div className="pa-h">Alerts</div>
              <div className="pa-sub">Keyword alerts · emailed only to you</div>
              <div className="pa-tabs"><span className="on">Active</span><span>Paused</span></div>
              <div className="pa-list">
                <PaCard ic="#" title="[Your keyword]" sub="News + 3 platforms" newCount="3 NEW" note="Checks every 12 hours · last email sent" />
                <PaCard ic="#" title="[A place]" sub="News · one country" newCount="1 NEW" note="Checks once a day · last email sent" />
                <PaCard ic="#" title="[An event]" sub="News + 2 platforms" note="Checks every 6 hours · nothing new" />
                <PaCard ic="+" title="New alert" sub="Up to 5 keywords · shows the search cost first" />
              </div>
            </>
          )}
          {view === 'search' && (
            <>
              <div className="pa-h">News</div>
              <div className="pa-sub">Google News · Bing News · exact phrase</div>
              <div className="pa-tabs"><span className="on">Any country</span><span>Ghana</span><span>Last 12 months</span></div>
              <div className="pa-list">
                {[1, 2, 3, 4, 5].map((i) => <PaCard key={i} ic="Nw" title="[Headline]" sub="Publisher · date" lab="Save to case" />)}
              </div>
            </>
          )}
        </div>
        <div className="glare" />
      </div>
    </div>
  </div>
);
