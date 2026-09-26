import {
  LayoutDashboard, Search, FolderSearch, Users, Globe, Settings, HelpCircle,
  MessagesSquare, Newspaper, Image, MapPin, TrendingUp, Share2, BarChart3, History, type LucideIcon
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  /** Section heading; the first section has none. */
  title?: string;
  items: NavItem[];
}

/** Every page in the signed-in app, grouped as in the sidebar. */
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/new-investigation', label: 'New Investigation', icon: Search },
      { path: '/investigations', label: 'Investigations', icon: FolderSearch },
      { path: '/people', label: 'People', icon: Users }
    ]
  },
  {
    title: 'Search',
    items: [
      { path: '/search/social', label: 'Social search', icon: MessagesSquare },
      { path: '/search/news', label: 'News', icon: Newspaper },
      { path: '/search/media', label: 'Media', icon: Image },
      { path: '/search/geo', label: 'Geo search', icon: MapPin },
      { path: '/search/trends', label: 'Trends', icon: TrendingUp }
    ]
  },
  {
    title: 'Analyse',
    items: [
      { path: '/analyse/network', label: 'Network', icon: Share2 },
      { path: '/analyse/content', label: 'Content analysis', icon: BarChart3 },
      { path: '/history', label: 'Search history', icon: History }
    ]
  },
  {
    title: 'More',
    items: [
      { path: '/sources', label: 'Sources', icon: Globe },
      { path: '/help', label: 'Help & Docs', icon: HelpCircle },
      { path: '/settings', label: 'Settings', icon: Settings }
    ]
  }
];

export function isNavActive(path: string, pathname: string): boolean {
  return pathname === path ||
    (path === '/new-investigation' && pathname === '/search') ||
    (path === '/investigations' && pathname.startsWith('/investigations/'));
}
