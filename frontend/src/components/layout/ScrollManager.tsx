import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** The page a route belongs to: a case's tabs (/investigations/:id/:tab, /shared/:token/:tab) count as one page. */
function pageOf(pathname: string): string {
  const m = pathname.match(/^\/(investigations|shared)\/([^/]+)/);
  return m ? `/${m[1]}/${m[2]}` : pathname;
}

/**
 * Scroll position on navigation (renders nothing):
 * - a new page starts at the top, instead of keeping the previous page's scroll position;
 * - switching tabs inside a case keeps the position, unless the tab bar was scrolled out of view —
 *   then the tab bar is brought back to the top so the new tab's content starts in view.
 * Works for both scroll containers the app uses: the window (phones, public pages) and .main-content.
 */
export function ScrollManager() {
  const { pathname } = useLocation();
  const last = useRef(pathname);

  useEffect(() => {
    const before = last.current;
    last.current = pathname;
    if (before === pathname) return;
    const main = document.querySelector<HTMLElement>('.main-content');
    if (pageOf(before) !== pageOf(pathname)) {
      main?.scrollTo({ top: 0, behavior: 'auto' });
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    const bar = Array.from(document.querySelectorAll<HTMLElement>('.ws-tabs, .ws-mobile-tabs')).find(el => el.offsetParent !== null);
    if (bar && bar.getBoundingClientRect().top < 0) bar.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [pathname]);

  return null;
}
