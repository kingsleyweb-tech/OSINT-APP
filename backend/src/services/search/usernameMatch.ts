/**
 * Username searches: how each profile found relates to the searched username, with the reasons.
 *
 *   exact      the handle is the searched username
 *   variation  the same letters and numbers written differently (separators, number moved/shortened)
 *   related    a different handle, but the profile shares real evidence with an exact/variation profile
 *              (same display name, the bio names the username, the same website) — kept apart, never merged
 *   similar    a different handle with nothing linking it — most likely another person
 *
 * Every reason is taken from the retrieved profiles; nothing is assumed.
 */
import { usernameVariants } from './deepSearchEngine';

export type UsernameMatch = 'exact' | 'variation' | 'related' | 'similar';

const norm = (s?: string) => String(s || '').trim().replace(/^@/, '').toLowerCase();
const alnum = (s?: string) => norm(s).replace(/[^a-z0-9]/g, '');
const hostOf = (u?: string) => { try { return new URL(String(u)).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const SOCIAL_HOST = /(facebook|instagram|twitter|x|tiktok|linkedin|youtube|snapchat|threads|reddit|github|t)\.(com|me|net)$/;

/** The handle of a profile: its username field, or the last part of its address. */
export function handleOf(p: any): string {
  if (p.username) return norm(p.username);
  try {
    const parts = new URL(String(p.profileUrl || p.url)).pathname.split('/').filter(Boolean);
    const last = parts.find(x => x.startsWith('@')) || parts[parts.length - 1] || '';
    // Addresses that do not show a handle (profile.php?id=…, /people/…, /channel/UC…).
    if (/\.php$|^(profile|people|pages|p|watch|channel|user|groups|share)$/i.test(last) || /^UC[\w-]{20,}$/.test(last)) return '';
    return norm(decodeURIComponent(last));
  } catch { return ''; }
}

/** Websites a profile links to (its website field and addresses in its bio), social platforms excluded. */
function sitesOf(p: any): Set<string> {
  const out = new Set<string>();
  const add = (u?: string) => { const h = hostOf(u); if (h && !SOCIAL_HOST.test(h)) out.add(h); };
  add(p.attributes?.website);
  for (const m of String(p.bio || '').matchAll(/https?:\/\/[^\s)]+|(?:www\.)?[a-z0-9-]+\.(?:com|org|net|io|co|gh|me|dev|app)\b[^\s)]*/gi)) add(m[0].startsWith('http') ? m[0] : `https://${m[0]}`);
  return out;
}

/** The display name: the profile's name field, else the name part of its page title ("Khaby Lame (@khaby.lame) | TikTok"). */
const displayName = (p: any) => {
  const raw = String(p.profileName || p.title || '').replace(/\s*[(|•·@-].*$/, '').trim();
  // A title that is only the handle or the platform is not a display name.
  return raw && !/^(tiktok|instagram|facebook|youtube|x|twitter|snapchat|linkedin|reddit)$/i.test(raw) && alnum(raw) !== alnum(handleOf(p)) ? raw : '';
};

export function annotateUsernameMatches(inv: any, searched: string): void {
  const target = norm(searched);
  const variants = usernameVariants(target);
  const variantSet = new Map(variants.map(v => [v.value, v.kind]));
  inv.usernameVariations = variants;

  const profiles: any[] = inv.socialProfiles || [];
  // First pass: what the handle itself says.
  profiles.forEach(p => {
    const h = handleOf(p);
    p.matchedHandle = h || undefined;
    if (h && h === target) {
      p.usernameMatch = 'exact';
      p.matchExplanation = [`The username is exactly “${target}”.`];
    } else if (h && (variantSet.has(h) || (alnum(h) === alnum(target)))) {
      p.usernameMatch = 'variation';
      p.matchExplanation = [`“${h}” is a variation of “${target}” (${variantSet.get(h)?.toLowerCase() || 'same letters and numbers, different punctuation'}).`];
    } else {
      p.usernameMatch = p.relation === 'similar' ? 'similar' : 'related';
      p.matchExplanation = [h ? `The username “${h}” is not “${target}”.` : 'The profile’s username is not shown.'];
    }
    if (p.confidenceLabel === 'Verified Match' || /confirmed public profile/i.test(String(p.bio || p.snippet || ''))) {
      p.matchExplanation.push('The platform itself confirmed the account exists.');
    }
  });

  // Second pass: a different handle is only "possibly related" with evidence shared with an exact or
  // variation profile (same display name, bio naming the username, the same website).
  const anchors = profiles.filter(p => p.usernameMatch === 'exact' || p.usernameMatch === 'variation');
  const anchorNames = new Map(anchors.map(a => [alnum(displayName(a)), a]).filter(([k]) => (k as string).length >= 4) as Array<[string, any]>);
  const anchorSites = new Map<string, any>();
  anchors.forEach(a => sitesOf(a).forEach(h => anchorSites.set(h, a)));
  const anchorHandles = new Set(anchors.map(a => a.matchedHandle).filter(Boolean));

  // A variation's evidence is reported too, so a similar username alone is never presented as the same person.
  profiles.filter(p => p.usernameMatch === 'variation').forEach(p => {
    const others = anchors.filter(a => a !== p && a.usernameMatch === 'exact');
    const n = others.find(a => alnum(displayName(a)).length >= 4 && alnum(displayName(a)) === alnum(displayName(p)));
    const site = others.find(a => Array.from(sitesOf(a)).some(h => sitesOf(p).has(h)));
    if (n) p.matchExplanation.push(`Same display name “${displayName(p)}” as @${n.matchedHandle} on ${n.platform}.`);
    if (site) p.matchExplanation.push(`Links to the same website as @${site.matchedHandle} on ${site.platform}.`);
    // The search already read the page: its title or bio shows the exact searched username.
    const shown = (p.matchReason || []).some((r: string) => /profile title|biography|snippet/i.test(r) && r.toLowerCase().includes(`"${target}"`));
    if (shown) p.matchExplanation.push(`Its page shows the exact username “${target}”.`);
    if (!n && !site && !shown) p.matchExplanation.push('Only the username is similar — not confirmed as the same person.');
  });

  profiles.filter(p => p.usernameMatch === 'similar' || p.usernameMatch === 'related').forEach(p => {
    const reasons: string[] = [];
    const nameMatch = anchorNames.get(alnum(displayName(p)));
    if (nameMatch) reasons.push(`Same display name “${displayName(p)}” as @${nameMatch.matchedHandle} on ${nameMatch.platform}.`);
    const bio = String(p.bio || p.snippet || '').toLowerCase();
    if (bio.includes(target) || Array.from(anchorHandles).some(h => h && h.length >= 4 && bio.includes(String(h)))) reasons.push('Its bio or description names the searched username.');
    for (const h of sitesOf(p)) {
      const a = anchorSites.get(h);
      if (a) { reasons.push(`Links to the same website (${h}) as @${a.matchedHandle} on ${a.platform}.`); break; }
    }
    if (reasons.length) {
      p.usernameMatch = 'related';
      p.matchExplanation = [...p.matchExplanation, ...reasons, 'Not merged: open it to check whether it is the same person.'];
    } else if (p.usernameMatch === 'related') {
      // Accepted by the search (the page shows the username) though its address has another or no handle.
      p.matchExplanation = [...p.matchExplanation, `The search found “${target}” on this page, but its address does not show that username — check it before relying on it.`];
    } else {
      p.matchExplanation = [...p.matchExplanation, 'Nothing links it to the searched username’s profiles — most likely another person.'];
    }
  });
}
