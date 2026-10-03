import type { Investigation } from '../types/investigation';
import { saveInvestigationToDb } from '../firebase/firestore';
import { linkHistoryToCase } from './history';

/** How long opening a new case waits for its first save before showing it anyway. */
const SAVE_WAIT_MS = 4000;

function readSessionCase(id: string): Investigation | null {
  try {
    const raw = sessionStorage.getItem(`osint_inv_${id}`);
    return raw ? (JSON.parse(raw) as Investigation) : null;
  } catch {
    return null;
  }
}

/**
 * Opens the case for a person picked from the search results ("View person").
 *
 * - The same person from the same search has the same case ID: the stored case is reopened as it is, so
 *   review levels, AI findings and notes are never replaced by a fresh copy of the search card.
 * - A new case is kept in sessionStorage and saved to Firestore. Opening waits for the save (up to a few
 *   seconds) so that a refresh, or reopening it from the case list, finds the same record in the account.
 */
export async function openIdentityCase(
  fresh: Investigation,
  opts: { known?: Investigation[]; historyId: string | null }
): Promise<{ investigation: Investigation; reused: boolean; saved: Promise<void> }> {
  const existing = opts.known?.find(i => i.id === fresh.id) || readSessionCase(fresh.id);
  if (existing) return { investigation: existing, reused: true, saved: Promise.resolve() };

  try { sessionStorage.setItem(`osint_inv_${fresh.id}`, JSON.stringify(fresh)); } catch { /* storage full */ }
  linkHistoryToCase(opts.historyId, fresh.id);
  const saved = saveInvestigationToDb(fresh);
  await Promise.race([saved.catch(() => undefined), new Promise(resolve => setTimeout(resolve, SAVE_WAIT_MS))]);
  return { investigation: fresh, reused: false, saved };
}
