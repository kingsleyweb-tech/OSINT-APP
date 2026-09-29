import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FolderOpen, Globe, MapPin, Search } from 'lucide-react';
import { PlatformIcon } from '../ui/PlatformIcon';
import type { DiscoveredIdentity } from './PossibleIdentitiesView';
import type { SocialProfile } from '../../types/investigation';

type Match = 'exact' | 'variation' | 'related' | 'similar';

const MATCH_LABEL: Record<Match, string> = {
  exact: 'Exact match',
  variation: 'Username variation',
  related: 'Possibly related',
  similar: 'Other person'
};
const MATCH_RANK: Record<Match, number> = { exact: 0, variation: 1, related: 2, similar: 3 };

/** Platform tabs: the main networks by name, everything else grouped. */
const PLATFORM_GROUPS: Array<[string, RegExp]> = [
  ['Facebook', /facebook/i], ['X', /^x\b|twitter/i], ['Instagram', /instagram/i], ['Snapchat', /snapchat/i],
  ['TikTok', /tiktok/i], ['YouTube', /youtube/i], ['LinkedIn', /linkedin/i], ['Reddit', /reddit/i],
  ['Threads', /threads/i], ['Telegram', /telegram/i], ['GitHub', /github/i]
];
const SOCIALISH = /mastodon|bluesky|twitch|vimeo|pinterest|medium|dev\b|docker|npm|stack|quora|vk|weibo|discord|soundcloud|spotify|behance|dribbble|flickr/i;
function platformGroup(platform: string, url: string): string {
  const hit = PLATFORM_GROUPS.find(([, re]) => re.test(platform) || re.test(url));
  if (hit) return hit[0];
  return SOCIALISH.test(platform) || SOCIALISH.test(url) ? 'Other social media' : 'Google / Web';
}

const norm = (s?: string) => String(s || '').trim().replace(/^@/, '').toLowerCase();
const alnum = (s?: string) => norm(s).replace(/[^a-z0-9]/g, '');

/** For results saved before match types existed: the same rules, from the handle alone. */
function fallbackMatch(p: SocialProfile, target: string, variants: Set<string>): Match {
  const h = norm(p.matchedHandle || p.username);
  if (h && h === target) return 'exact';
  if (h && (variants.has(h) || alnum(h) === alnum(target))) return 'variation';
  return p.relation === 'similar' ? 'similar' : 'related';
}

/** The searched username highlighted inside a handle (exact text, ignoring case). */
const Highlight: React.FC<{ text: string; target: string; exact: boolean }> = ({ text, target, exact }) => {
  if (exact) return <mark className="ur-mark ur-mark-exact">{text}</mark>;
  const i = text.toLowerCase().indexOf(target);
  if (i < 0 || !target) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="ur-mark">{text.slice(i, i + target.length)}</mark>{text.slice(i + target.length)}</>;
};

interface Row { p: SocialProfile; identity: DiscoveredIdentity; match: Match; group: string; handle: string }

/**
 * Username search results: an overview (the searched username highlighted, what was found, the variations
 * searched), then the profiles by platform, each with how it matches and why. Exact matches and variations
 * open the investigation they belong to; other handles open a search of their own (never merged).
 */
export const UsernameResults: React.FC<{ query: string; identities: DiscoveredIdentity[]; onSelectIdentity: (i: DiscoveredIdentity) => void }> = ({ query, identities, onSelectIdentity }) => {
  const target = norm(query);
  const variations = useMemo<Array<{ value: string; kind: string }>>(() => identities.find(i => i.investigation?.usernameVariations)?.investigation?.usernameVariations || [], [identities]);
  const variantSet = useMemo(() => new Set(variations.map(v => v.value)), [variations]);

  const rows = useMemo(() => {
    const seen = new Map<string, Row>();
    identities.forEach(identity => ((identity.investigation?.socialProfiles || []) as SocialProfile[]).forEach(p => {
      const url = String(p.profileUrl || p.url || '');
      const key = url.replace(/^https?:\/\/(www\.|m\.)?/i, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
      if (!key || seen.has(key)) return;
      const match: Match = p.usernameMatch || fallbackMatch(p, target, variantSet);
      seen.set(key, { p, identity, match, group: platformGroup(String(p.platform || ''), url), handle: p.matchedHandle || p.username || '' });
    }));
    return Array.from(seen.values()).sort((a, b) => MATCH_RANK[a.match] - MATCH_RANK[b.match] || (b.p.confidence || 0) - (a.p.confidence || 0));
  }, [identities, target, variantSet]);

  const [platform, setPlatform] = useState('All');
  const [filter, setFilter] = useState<'main' | 'related' | 'similar' | 'all'>('main');

  const counts = (m: Match) => rows.filter(r => r.match === m).length;
  const inFilter = (r: Row) => filter === 'all' || (filter === 'main' ? r.match === 'exact' || r.match === 'variation' : r.match === filter);
  const groups = Array.from(new Set(rows.filter(inFilter).map(r => r.group)));
  const order = [...PLATFORM_GROUPS.map(g => g[0]), 'Other social media', 'Google / Web'];
  groups.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const shown = rows.filter(r => inFilter(r) && (platform === 'All' || r.group === platform));

  if (!rows.length) return null;

  return (
    <div className="search-section-block ur">
      {/* Overview */}
      <div className="ur-overview">
        <div className="ur-searched">
          <span className="ur-kicker">You searched</span>
          <mark className="ur-mark ur-mark-exact ur-big">@{target}</mark>
        </div>
        <div className="ur-counts">
          <button type="button" className={filter === 'main' ? 'on' : ''} onClick={() => { setFilter('main'); setPlatform('All'); }}>
            <b>{counts('exact')}</b> exact · <b>{counts('variation')}</b> variation{counts('variation') === 1 ? '' : 's'}
          </button>
          <button type="button" className={filter === 'related' ? 'on' : ''} onClick={() => { setFilter('related'); setPlatform('All'); }} disabled={!counts('related')}>
            <b>{counts('related')}</b> possibly related
          </button>
          <button type="button" className={filter === 'similar' ? 'on' : ''} onClick={() => { setFilter('similar'); setPlatform('All'); }} disabled={!counts('similar')}>
            <b>{counts('similar')}</b> other people
          </button>
          <button type="button" className={filter === 'all' ? 'on' : ''} onClick={() => { setFilter('all'); setPlatform('All'); }}>All {rows.length}</button>
        </div>
        {variations.length > 1 && (
          <div className="ur-variations">
            <span className="ur-kicker">Variations searched</span>
            {variations.map(v => (
              <span key={v.value} className={`ur-var${v.value === target ? ' is-exact' : ''}`} title={v.kind}>{v.value}</span>
            ))}
          </div>
        )}
      </div>

      {/* Platform tabs (only platforms with results) */}
      <div className="ur-tabs" role="tablist">
        {['All', ...groups].map(g => {
          const n = g === 'All' ? rows.filter(inFilter).length : rows.filter(r => inFilter(r) && r.group === g).length;
          return (
            <button key={g} type="button" role="tab" aria-selected={platform === g} className={`ur-tab${platform === g ? ' on' : ''}`} onClick={() => setPlatform(g)}>
              {g !== 'All' && g !== 'Google / Web' && g !== 'Other social media' && <PlatformIcon platform={g === 'X' ? 'X (Twitter)' : g} size={14} />}
              {g === 'Google / Web' && <Globe size={14} />}
              {g} <span>{n}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="section-block-sub">No {filter === 'main' ? 'exact or variation' : filter === 'related' ? 'possibly related' : filter === 'similar' ? 'other-person' : ''} profiles{platform !== 'All' ? ` on ${platform}` : ''}.</p>
      ) : (
        <div className="ur-grid">
          {shown.map(({ p, identity, match, handle }) => {
            const url = String(p.profileUrl || p.url || '');
            const investigateOwn = match === 'exact' || match === 'variation';
            return (
              <article key={url} className={`ur-card ur-${match}`}>
                <div className="ur-card-top">
                  <span className="ur-platform"><PlatformIcon platform={p.platform} size={16} /> {p.platform}</span>
                  <span className={`ur-badge ur-badge-${match}`}>{MATCH_LABEL[match]}</span>
                </div>
                <div className="ur-id">
                  {(p.thumbnail || p.avatarUrl) && <img src={p.thumbnail || p.avatarUrl} alt="" className="ur-avatar" referrerPolicy="no-referrer" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                  <div className="ur-id-text">
                    <div className="ur-handle">{handle ? <>@<Highlight text={handle} target={target} exact={match === 'exact'} /></> : <span className="ur-muted">Username not shown</span>}</div>
                    {p.profileName && <div className="ur-name">{p.profileName}</div>}
                  </div>
                </div>
                {(p.bio || p.snippet) && <p className="ur-bio">{String(p.bio || p.snippet).slice(0, 220)}</p>}
                {(p.attributes?.location || p.attributes?.website) && (
                  <div className="ur-meta">
                    {p.attributes?.location && <span><MapPin size={12} /> {p.attributes.location}</span>}
                    {p.attributes?.website && <span><Globe size={12} /> {String(p.attributes.website).replace(/^https?:\/\//, '')}</span>}
                  </div>
                )}
                {Array.isArray(p.matchExplanation) && p.matchExplanation.length > 0 && (
                  <ul className="ur-why">{p.matchExplanation.slice(0, 4).map(w => <li key={w}>{w}</li>)}</ul>
                )}
                <div className="ur-actions">
                  {investigateOwn
                    ? <button type="button" className="ur-btn" onClick={() => onSelectIdentity(identity)}><FolderOpen size={14} /> Open investigation</button>
                    : handle && <Link className="ur-btn" to={`/new-investigation?type=Username&q=${encodeURIComponent(handle)}&run=1&open=${encodeURIComponent(url)}`}><Search size={14} /> Investigate @{handle}</Link>}
                  <a className="ur-link" href={url} target="_blank" rel="noopener noreferrer">View profile <ExternalLink size={12} /></a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
