import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Image as ImageIcon, RotateCw } from 'lucide-react';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Empty, SectionHead } from '../workspace/ui';
import { useSearchRun } from '../../explore/useSearchRun';
import { SearchLoader } from '../../ui/SearchLoader';
import { subjectQuery } from '../../../lib/caseSave';
import { fmtDate, hostOf, newAuditEvent } from '../../../lib/workspace';
import type { CaseImage } from '../../../types/investigation';

const MAX_IMAGES = 60;

/**
 * Pictures of the subject: image search on the exact name (Google Images + Bing Images). Only images
 * whose own title or page names the subject are kept. Each shows the picture, its source and its page.
 * The first visit searches by itself; results are saved in the case, so later visits cost nothing.
 */
export const ImagesTab: React.FC = () => {
  const { inv, commit } = useWorkspace();
  const { run, cancel, running, steps } = useSearchRun();
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(0);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const started = useRef(false);
  const images = inv.imageResults || [];

  const search = useCallback(async () => {
    setError('');
    const query = subjectQuery(inv);
    const out = await run([{ key: 'img', label: 'Images', capability: 'images', query }]).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'The image search failed.');
      return null;
    });
    if (!out) return;
    const r = out.img;
    const now = new Date().toISOString();
    // Keep only images whose title or page names the subject (all name words present).
    const kept = r.items.filter(i => i.relevance.label === 'Strong match');
    setHidden(r.items.length - kept.length + r.stats.filteredOut);
    const found: CaseImage[] = kept.slice(0, MAX_IMAGES).map(i => ({
      id: i.id,
      pageUrl: i.url,
      ...(i.image ? { imageUrl: i.image } : {}),
      ...(i.thumbnail ? { thumbnail: i.thumbnail } : {}),
      title: i.title,
      source: i.author || i.domain || hostOf(i.url),
      engine: i.engines.join(', '),
      foundAt: now
    }));
    commit(current => {
      const seen = new Set((current.imageResults || []).map(x => x.pageUrl + (x.imageUrl || '')));
      const merged = [...(current.imageResults || []), ...found.filter(x => !seen.has(x.pageUrl + (x.imageUrl || '')))].slice(0, MAX_IMAGES * 2);
      return { ...current, imageResults: merged, imagesCheckedAt: now };
    }, [newAuditEvent({ action: 'Image search', object: query, detail: `${found.length} image${found.length === 1 ? '' : 's'} naming the subject kept of ${r.stats.returned} returned`, group: 'Searches', kind: 'system' })]);
    if (r.engines.every(e => e.status === 'error' || e.status === 'quota')) setError(r.notices[0] || 'The image engines could not be reached.');
  }, [inv, run, commit]);

  useEffect(() => {
    if (started.current || inv.imagesCheckedAt) return undefined;
    started.current = true;
    const t = setTimeout(() => { search(); }, 0);
    return () => clearTimeout(t);
  }, [inv.imagesCheckedAt, search]);

  const shown = images.filter(i => !broken.has(i.id));

  return (
    <div>
      <SectionHead title="Images" count={shown.length} noRule right={
        <button type="button" className="ws-btn" onClick={search} disabled={running}><RotateCw size={15} /> Search again</button>
      } />
      <p className="ws-sub" style={{ margin: '0 0 16px' }}>
        Pictures found by Google Images and Bing Images for {subjectQuery(inv)}. Only images whose title or page names the subject are kept.
        A picture appearing next to the name is not proof it shows this person — open the page to check.
        {inv.imagesCheckedAt && ` Last searched ${fmtDate(inv.imagesCheckedAt, true)} (2 searches).`}
        {hidden > 0 && ` ${hidden} image${hidden === 1 ? ' was' : 's were'} left out because they do not name the subject.`}
      </p>
      {error && <p style={{ color: '#b45309', fontSize: 14, margin: '0 0 12px' }}>{error}</p>}
      {running ? (
        <SearchLoader title={`Searching for pictures of ${subjectQuery(inv)}`} steps={steps} onCancel={cancel} />
      ) : shown.length === 0 ? (
        <Empty title={inv.imagesCheckedAt ? 'No pictures naming the subject were found' : 'No image search yet'}>
          {inv.imagesCheckedAt ? 'Try again later, or check the Profiles tab for profile photos.' : 'Press "Search again" to look for pictures.'}
        </Empty>
      ) : (
        <div className="ws-images">
          {shown.map(img => (
            <figure key={img.id} className="ws-image">
              <a href={img.pageUrl} target="_blank" rel="noopener noreferrer" className="ws-image-frame" title={img.title}>
                <img src={img.thumbnail || img.imageUrl} alt={img.title} loading="lazy" referrerPolicy="no-referrer"
                  onError={() => setBroken(prev => new Set(prev).add(img.id))} />
              </a>
              <figcaption>
                <span className="ws-image-source">{img.source}</span>
                <span className="ws-image-links">
                  <a href={img.pageUrl} target="_blank" rel="noopener noreferrer">Page <ExternalLink size={11} /></a>
                  {img.imageUrl && <a href={img.imageUrl} target="_blank" rel="noopener noreferrer">Image <ImageIcon size={11} /></a>}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
};
