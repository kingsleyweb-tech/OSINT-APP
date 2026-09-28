import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiAuth';
import { getApiBase } from '../../lib/searchClient';

interface Suggestion { id: string; label: string; description: string; url: string }

const cache = new Map<string, Suggestion[]>();

/**
 * Suggestions while typing a name: organisations, institutions and other entities whose name or
 * abbreviation matches ("UPSA" → University of Professional Studies, Accra — university in Ghana).
 * From Wikidata's free search (no SerpApi searches). Picking one searches that full name.
 */
export const EntitySuggestions: React.FC<{ query: string; open: boolean; onPick: (label: string) => void }> = ({ query, open, onPick }) => {
  const q = query.trim();
  const [items, setItems] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (!open || q.length < 2) return undefined;
    const hit = cache.get(q.toLowerCase());
    const t = setTimeout(async () => {
      if (hit) { setItems(hit); return; }
      try {
        const res = await apiFetch(`${getApiBase()}/organization/suggest?q=${encodeURIComponent(q)}`);
        const data = await res.json().catch(() => ({}));
        const list: Suggestion[] = Array.isArray(data?.suggestions) ? data.suggestions : [];
        cache.set(q.toLowerCase(), list);
        setItems(list);
      } catch {
        setItems([]);
      }
    }, hit ? 0 : 350);
    return () => clearTimeout(t);
  }, [q, open]);

  const visible = open && q.length >= 2 ? items.filter(s => s.label.toLowerCase() !== q.toLowerCase() || s.description) : [];
  if (!visible.length) return null;

  return (
    <div className="entity-suggest" role="listbox" aria-label="Suggestions">
      <div className="entity-suggest-head">Did you mean one of these? <span>(suggestions from Wikidata — pick one to search its full name)</span></div>
      {visible.map(s => (
        <button
          key={s.id}
          type="button"
          role="option"
          aria-selected={false}
          className="entity-suggest-item"
          // mousedown so the pick happens before the input loses focus and the list closes
          onMouseDown={e => { e.preventDefault(); onPick(s.label); }}
        >
          <Building2 size={14} />
          <span className="l">{s.label}</span>
          <span className="d">{s.description}</span>
        </button>
      ))}
    </div>
  );
};
