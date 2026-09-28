/**
 * Named people in a role, as a source states them. Two forms are recognised:
 *   - a heading with a person's name next to a heading with a role ("Lieutenant General William Agyapong" /
 *     "Chief of The Defence Staff, Ghana Armed Forces") — typical of leadership pages;
 *   - "<Role>, <Name>" or "<Name>, <Role>" in a sentence ("the Vice-Chancellor, Professor Jane Doe").
 * A person is only returned with a role word next to the name and the exact words it came from. Nothing is
 * inferred from a name alone.
 */

export interface NamedPerson { name: string; role: string; quote: string }

const ROLE_WORD = /\b(chief|director|ceo|chief executive|president|vice[- ]president|chair(?:man|woman|person)?|vice[- ]chancellor|chancellor|pro[- ]vice[- ]chancellor|registrar|commander|commissioner|manager|managing director|head|secretary|principal|headmaster|headmistress|dean|founder|co-?founder|governor|deputy|minister|officer|treasurer|provost|rector|executive|general secretary|board member|trustee|superintendent|bishop|archbishop|pastor|imam|editor)\b/i;

const TITLE = '(?:(?:Mr|Mrs|Ms|Miss|Dr|Prof|Professor|Hon|Honourable|Rev|Reverend|Rt\\.? Rev|Sir|Dame|Engr|Ing|Justice|Nana|Alhaji|Hajia|Chief|Lt|Lieutenant|Maj|Major|Brig|Brigadier|Gen|General|Col|Colonel|Capt|Captain|Cdr|Commander|Commodore|Adm|Admiral|Rear|Vice|Air|Marshal|Wing|Group|Squadron|Leader|Flight|Sgt|Sergeant)\\.?\\s+)*';
// A name word, or a middle initial ("S.").
const NAME_PART = "[A-Z](?:[a-zA-Z'’-]+\\.?|\\.)";
const TITLE_WORD = /^(mr|mrs|ms|miss|dr|prof|professor|hon|honourable|rev|reverend|sir|dame|engr|ing|justice|lt|lieutenant|maj|major|brig|brigadier|gen|general|col|colonel|capt|captain|cdr|commander|commodore|adm|admiral|rear|vice|air|marshal|madam)\.?$/i;
const PERSON = new RegExp(`^${TITLE}(${NAME_PART}(?:\\s+${NAME_PART}){1,4})$`);

const NOT_NAME = /\b(of|the|and|for|university|college|school|company|limited|ltd|forces|army|navy|air force|ministry|authority|service|services|department|board|council|office|staff|profile|overview|leadership|management|team|about|contact|news|home|vision|mission|biography|related|links|command|higher|welcome|message|history|our|meet|view|more|read|learn|click|see|show|all|download|apply|login|register|other|others|senior|officers|officials|members|principal officers)\b/i;

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/** A string that is a person's name (optionally with a rank or honorific), not a heading about something else. */
export function personName(text: string, org: string): string | null {
  const t = clean(text).replace(/[,:;]+$/, '');
  if (t.length < 5 || t.length > 70) return null;
  const m = t.match(PERSON);
  if (!m) return null;
  const core = m[1];
  // The name itself must have two real name words (not "Prof. Emmanuel" cut off from its surname).
  const coreWords = core.split(/\s+/);
  if (TITLE_WORD.test(coreWords[0]) || coreWords.filter(w => !/^[A-Z]\.$/.test(w)).length < 2) return null;
  if (NOT_NAME.test(core)) return null;
  // A role or place, not a person ("Vice Chancellor", "GTEC Representative", "Customs Head Quarters").
  if (ROLE_WORD.test(core) || /\b(representative|quarters|headquarters|office|division|unit|campus|hall|centre|center|institute|academy|association|union|committee|secretariat)\b/i.test(core)) return null;
  if (core.split(/\s+/).some(w => /^[A-Z]{2,}$/.test(w) && w.length <= 6 && !/^(II|III|IV|JR|SR)$/.test(w))) return null; // acronyms
  const orgWords = new Set(org.toLowerCase().split(/\s+/));
  if (core.toLowerCase().split(/\s+/).some(w => orgWords.has(w))) return null;
  if (/^[A-Z\s.'’-]+$/.test(core) && core.length > 25) return null; // shouted headings
  return t;
}

/** People from a page's headings (in page order): a name heading next to a role heading. */
export function peopleFromHeadings(headings: string[], org: string): NamedPerson[] {
  const out: NamedPerson[] = [];
  headings.forEach((h, i) => {
    const name = personName(h, org);
    if (!name) return;
    const roleHeading = [headings[i + 1], headings[i - 1]].find(x => x && ROLE_WORD.test(x) && !personName(x, org));
    if (!roleHeading) return;
    out.push({ name, role: clean(roleHeading).slice(0, 90), quote: `${name} — ${clean(roleHeading)}` });
  });
  return dedupe(out);
}

/** People from running text: "<Role>, <Name>" and "<Name>, <Role>". */
export function peopleFromText(text: string, org: string): NamedPerson[] {
  const out: NamedPerson[] = [];
  const sentences = clean(text).split(/(?<=[.!?])\s+/);
  const roleFirst = new RegExp(`((?:[A-Z][\\w'’-]*\\s+){0,5}?(?:${ROLE_WORD.source.slice(3, -3)})(?:\\s+(?:of|for|to)\\s+(?:the\\s+)?[A-Z][\\w'’-]*(?:\\s+[A-Z][\\w'’-]*){0,4})?(?:\\s*\\([A-Z]{2,6}\\))?),\\s+(${TITLE}${NAME_PART}(?:\\s+${NAME_PART}){1,4})`, 'gi');
  for (const s of sentences) {
    for (const m of s.matchAll(roleFirst)) {
      const name = personName(m[2], org);
      const role = clean(m[1]).replace(/^(?:the|a|an)\s+/i, '');
      if (name && ROLE_WORD.test(role) && /^[A-Z]/.test(m[2])) out.push({ name, role: role.slice(0, 90), quote: s.slice(0, 240) });
    }
  }
  return dedupe(out);
}

function dedupe(list: NamedPerson[]): NamedPerson[] {
  const seen = new Set<string>();
  return list.filter(p => {
    const k = personKey(p.name);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 25);
}

/** The same person with or without a title ("Professor Jane Doe" = "Jane Doe"). */
export function personKey(name: string): string {
  return name.replace(new RegExp(`^${TITLE}`), '').toLowerCase().replace(/[^a-z]/g, '');
}
