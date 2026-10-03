/**
 * Facts stated in search-result text about the subject, each kept with the words that state it.
 *
 * Every pattern is anchored on the subject's name ("Prince Ayaata is a Ghanaian musician",
 * "Prince Ayaata, a songwriter", "musician Prince Ayaata", "Prince Ayaata … studied at X").
 * Text that does not name the subject yields nothing, and nothing is inferred from keywords alone:
 * a snippet that only contains the word "musician" somewhere is not an occupation.
 */
import { nameTokens } from './identityMatcher';

export type PersonFactField =
  | 'occupation' | 'role' | 'employer' | 'organization' | 'education' | 'location' | 'nationality' | 'alias';

export interface ExtractedFact {
  field: PersonFactField;
  value: string;
  /** The sentence (or part of it) that states the fact. */
  quote: string;
}

const DEMONYMS: Record<string, string> = {
  ghanaian: 'Ghana', nigerian: 'Nigeria', kenyan: 'Kenya', 'south african': 'South Africa', togolese: 'Togo', ivorian: "Côte d'Ivoire",
  burkinabe: 'Burkina Faso', cameroonian: 'Cameroon', liberian: 'Liberia', 'sierra leonean': 'Sierra Leone', gambian: 'The Gambia',
  senegalese: 'Senegal', ugandan: 'Uganda', tanzanian: 'Tanzania', rwandan: 'Rwanda', ethiopian: 'Ethiopia', egyptian: 'Egypt',
  zambian: 'Zambia', zimbabwean: 'Zimbabwe', malawian: 'Malawi', beninese: 'Benin', malian: 'Mali', nigerien: 'Niger',
  american: 'United States', british: 'United Kingdom', english: 'United Kingdom', scottish: 'United Kingdom', canadian: 'Canada',
  australian: 'Australia', irish: 'Ireland', jamaican: 'Jamaica', indian: 'India', chinese: 'China', french: 'France', german: 'Germany',
  italian: 'Italy', spanish: 'Spain', dutch: 'Netherlands', brazilian: 'Brazil', mexican: 'Mexico'
};
const DEMONYM_RE = new RegExp(`^(${Object.keys(DEMONYMS).sort((a, b) => b.length - a.length).join('|')})(?:[- ]born)?\\b`, 'i');

/** Words that name an occupation or job title. A description must contain one before it is used. */
const OCCUPATION_WORDS = new Set([
  'musician', 'singer', 'songwriter', 'rapper', 'artist', 'artiste', 'producer', 'composer', 'dj', 'drummer', 'guitarist', 'pianist', 'instrumentalist', 'vocalist', 'gospel',
  'actor', 'actress', 'comedian', 'filmmaker', 'director', 'presenter', 'broadcaster', 'host', 'mc', 'influencer', 'blogger', 'vlogger', 'youtuber', 'creator', 'model', 'dancer', 'photographer', 'designer',
  'journalist', 'reporter', 'editor', 'writer', 'author', 'poet', 'columnist', 'publisher',
  'politician', 'legislator', 'minister', 'mp', 'senator', 'governor', 'mayor', 'diplomat', 'ambassador', 'chief', 'activist', 'councillor', 'assemblyman', 'assemblywoman',
  'lawyer', 'barrister', 'solicitor', 'judge', 'attorney', 'doctor', 'physician', 'surgeon', 'nurse', 'pharmacist', 'dentist', 'midwife',
  'engineer', 'developer', 'programmer', 'scientist', 'researcher', 'lecturer', 'professor', 'teacher', 'educator', 'tutor', 'academic', 'student', 'scholar',
  'entrepreneur', 'businessman', 'businesswoman', 'founder', 'co-founder', 'ceo', 'cto', 'cfo', 'coo', 'executive', 'manager', 'consultant', 'accountant', 'banker', 'economist', 'analyst', 'investor',
  'footballer', 'athlete', 'player', 'coach', 'boxer', 'sprinter', 'cricketer', 'striker', 'midfielder', 'defender', 'goalkeeper',
  'pastor', 'priest', 'bishop', 'imam', 'evangelist', 'prophet', 'reverend', 'clergyman', 'preacher',
  'officer', 'soldier', 'police', 'farmer', 'chef', 'pilot', 'architect', 'technician', 'mechanic', 'trader', 'philanthropist', 'administrator', 'secretary', 'president', 'chairman', 'chairperson', 'specialist', 'officer'
]);
const isOccupationWord = (w: string) => OCCUPATION_WORDS.has(w.toLowerCase().replace(/[^a-z-]/g, ''));

/** Words after which a description stops being about what the subject is. */
const DESC_STOP = /\s(?:who|which|that|whose|from|based|born|with|known|popularly|famous|since|and\s+(?:has|is|was|his|her)|in\s+(?:19|20)\d\d)\b|[.,;:()|•·!?"“”]|\s[-–—]\s/i;

const PROPER = `[A-Z][\\w'’&.-]*(?:\\s+(?:of|and|for|the|de|&|[A-Z][\\w'’&.-]*)){0,7}`;

/** A name token as a case-insensitive pattern, so the rest of a regex can stay case-sensitive. */
function tokenPattern(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[a-z]/g, c => `[${c}${c.toUpperCase()}]`);
}

/** Regex source matching the name as written in text (either order for two-word names, optional middle word). */
function namePattern(name: string): string | null {
  const tokens = nameTokens(name);
  if (tokens.length === 0) return null;
  const join = (ts: string[]) => ts.map(tokenPattern).join(`(?:\\s+[A-Z][\\w'’.-]*)?\\s+`);
  const forms = [join(tokens)];
  if (tokens.length === 2) forms.push(join([...tokens].reverse()));
  return `(?:${forms.join('|')})`;
}

/** Praise and size words that describe rather than name an occupation. */
const DESCRIPTORS = /^(?:popular|famous|renowned|young|talented|celebrated|prominent|leading|veteran|upcoming|up-and-coming|budding|seasoned|well-known|top|great|good|best|professional|international|local|multi-talented|award-winning|accomplished|successful|notable|respected|experienced|aspiring|new|rising)$|(?:ing|ed)$/i;

const titleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

function cleanValue(v: string): string {
  return v.replace(/\s+/g, ' ').replace(/^(?:the|a|an)\s+/i, '').replace(/[\s,.;:'"’]+$/, '').trim();
}

function trimProper(v: string): string {
  // Stop an organisation name before a trailing lowercase connector or a new clause.
  return cleanValue(v.replace(/\s+(?:of|and|for|the|de|&)$/i, '').split(/\s+(?:where|since|in\s+(?:19|20)\d\d)\b/)[0]);
}

/** Splits "award-winning Ghanaian highlife musician and songwriter" into nationality + occupation. */
function parseDescription(raw: string, quote: string, out: ExtractedFact[]): void {
  let desc = raw.split(DESC_STOP)[0].trim();
  desc = desc.replace(/^(?:a|an|the)\s+/i, '');
  // "CEO of Acme Ltd", "lecturer at the University of Ghana"
  const roleAt = desc.match(new RegExp(`^(.{2,40}?)\\s+(?:of|at)\\s+(?:[Tt]he\\s+)?(${PROPER})`));
  let words = (roleAt ? roleAt[1] : desc).split(/\s+/).filter(Boolean);

  const demonym = words.map(w => w.match(DEMONYM_RE)).find(Boolean);
  if (demonym) out.push({ field: 'nationality', value: titleCase(demonym[1]), quote });
  // Keep from the first occupation word, plus one field word before it ("highlife musician", "software engineer");
  // praise and nationality words are dropped.
  const firstOcc = words.findIndex(isOccupationWord);
  if (firstOcc < 0) return;
  const prev = words[firstOcc - 1];
  const keepPrev = Boolean(prev) && /^[a-z][a-z-]{2,}$/.test(prev) && !DESCRIPTORS.test(prev) && !DEMONYM_RE.test(prev);
  words = words.slice(keepPrev ? firstOcc - 1 : firstOcc);
  const value = cleanValue(words.slice(0, 6).join(' '));
  if (value.length < 2 || value.length > 60) return;

  if (roleAt) {
    out.push({ field: 'role', value, quote });
    const org = trimProper(roleAt[2]);
    if (org.length >= 3) out.push({ field: /universit|college|school|institute|academy|polytechnic/i.test(org) && /student|graduate|alumn/i.test(value) ? 'education' : 'employer', value: org, quote });
  } else {
    out.push({ field: 'occupation', value, quote });
  }
}

/**
 * Facts the text states about the named subject. `text` is a result's title and snippet.
 * Returns an empty list when the name does not appear.
 */
export function extractFacts(name: string, text: string): ExtractedFact[] {
  const np = namePattern(name);
  if (!np || !text) return [];
  const src = text.replace(/\s+/g, ' ');
  const out: ExtractedFact[] = [];
  const sentences = src.split(/(?<=[.!?])\s+(?=[A-Z])|\s+\.\.\.\s+|\s+…\s*/);

  sentences.forEach(sentence => {
    if (!new RegExp(np, 'i').test(sentence)) return;
    const quote = sentence.trim().slice(0, 300);
    const N = `(?<![\\w])${np}(?![\\w])`;

    // "<Name> is/was a Ghanaian musician", "<Name> (born …) is a …"
    const isA = sentence.match(new RegExp(`${N}(?:\\s*\\([^)]{0,60}\\))?,?\\s+(?:is|was|remains|became)\\s+(?:a|an|the)\\s+([^]{2,120})`, 'i'));
    if (isA) parseDescription(isA[1], quote, out);

    // Appositive: "<Name>, a Ghanaian musician, …"
    const appos = sentence.match(new RegExp(`${N},\\s+(?:a|an|the)\\s+([^,]{2,100}),`, 'i'));
    if (appos) parseDescription(appos[1], quote, out);

    // "<Name> - Musician" / "<Name> | Songwriter" in titles: only when the segment is entirely occupation words.
    const titled = sentence.match(new RegExp(`^${N}\\s+[-–—|]\\s+([A-Za-z &/,-]{3,60}?)(?:\\s+[-–—|]|$)`, 'i'));
    if (titled) {
      const words = titled[1].split(/[\s/&,]+/).filter(Boolean);
      if (words.length <= 4 && words.every(w => isOccupationWord(w) || /^(and|of)$/i.test(w))) out.push({ field: 'occupation', value: cleanValue(titled[1]), quote });
    }

    // Occupation word directly before the name: "Ghanaian musician Prince Ayaata", "Gospel singer Prince Ayaata"
    const before = sentence.match(new RegExp(`(?:^|[\\s"“(])((?:[A-Za-z-]+\\s+){0,2}([A-Za-z-]+))\\s+${N}`, 'i'));
    if (before && isOccupationWord(before[2]) && !/^(?:the|a|an|by|with|and|of|for|to)$/i.test(before[2])) {
      const words = before[1].split(/\s+/);
      const demonym = words.map(w => w.match(DEMONYM_RE)).find(Boolean);
      if (demonym) out.push({ field: 'nationality', value: titleCase(demonym[1]), quote });
      const occ = words.filter(w => !DEMONYM_RE.test(w) && !DESCRIPTORS.test(w) && (isOccupationWord(w) || w === words[words.length - 1]));
      const value = cleanValue(occ.join(' '));
      if (value) out.push({ field: 'occupation', value: value.toLowerCase(), quote });
    }

    // Case-sensitive, so an organisation name stops at the first lowercase word.
    const after = (re: string) => sentence.match(new RegExp(`${N}[^.;]{0,80}?\\b(?:${re})\\s+(?:[Tt]he\\s+)?(${PROPER})`));
    const employer = after('works at|works for|working at|working for|employed (?:at|by)|employee (?:at|of)|CEO of|[Cc]hief [Ee]xecutive of|[Ff]ounder of|[Cc]o-[Ff]ounder of|founded|[Mm]anaging [Dd]irector of|[Dd]irector (?:at|of)|[Mm]anager at|[Ll]ecturer at|teaches at|serves at|[Hh]ead of');
    if (employer) {
      const v = trimProper(employer[1]);
      if (v.length >= 3) out.push({ field: 'employer', value: v, quote });
    }
    const school = after('studied at|studies at|studying at|graduated from|graduate of|alumn(?:us|a|i) of|attended|student at|student of|educated at');
    if (school) {
      const v = trimProper(school[1]);
      if (v.length >= 3) out.push({ field: 'education', value: v, quote });
    }
    const member = after('member of|signed to|signed with|plays for|played for|a member of');
    if (member) {
      const v = trimProper(member[1]);
      if (v.length >= 3) out.push({ field: 'organization', value: v, quote });
    }
    const place = sentence.match(new RegExp(`${N}[^.;]{0,80}?\\b(?:based in|lives in|living in|resides in|resident of|hails from|native of|born in|from)\\s+([A-Z][\\w'’-]*(?:,?\\s+[A-Z][\\w'’-]*){0,3})`));
    if (place) {
      const v = cleanValue(place[1]);
      // "from" alone is weak: accept it only for a place-like value, never for an organisation-like one.
      if (v.length >= 3 && !/\b(University|College|Records|Music|Ltd|Inc|Bank|Group|Company|Church)\b/.test(v)) out.push({ field: 'location', value: v, quote });
    }

    // Other names: "popularly known as X", "known professionally as X", "a.k.a. X", "stage name X"
    const aka = sentence.match(/\b(?:popularly|professionally|better|also)?\s*known\s+as\s+["“']?([A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*){0,3})|\b(?:a\.?k\.?a\.?|stage name)\s+["“']?([A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*){0,3})/);
    if (aka) {
      const v = cleanValue(aka[1] || aka[2] || '');
      if (v.length >= 2 && new RegExp(np, 'i').test(sentence)) out.push({ field: 'alias', value: v, quote });
    }
  });

  // One entry per field + value.
  const seen = new Set<string>();
  return out.filter(f => {
    const k = `${f.field}:${f.value.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function countryForNationality(nationality: string): string | undefined {
  return DEMONYMS[nationality.toLowerCase()];
}
