import React from 'react';
import { PLATFORM_ICONS } from './platformIcons';

/* Line icons for sources that are not a single brand. */
const GENERIC: Record<string, React.ReactNode> = {
  web: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  event: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  org: <><path d="M4 20.5V6l8-3 8 3v14.5" /><path d="M2.5 20.5h19M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 20.5v-4h4v4" /></>,
};

/** Relative luminance of a hex colour (0 = black, 1 = white). */
const luminance = (hex: string) => {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** A platform's real logo in its brand colour, on a small tile. */
export const PlatformIcon: React.FC<{ id: string; size?: number }> = ({ id, size = 18 }) => {
  const brand = PLATFORM_ICONS[id];
  if (!brand) {
    return (
      <span className="el-ic gen" aria-hidden="true">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{GENERIC[id]}</svg>
      </span>
    );
  }
  // Very light brand colours (e.g. Snapchat yellow) are unreadable on white: fill the tile instead.
  const light = luminance(brand.hex) > 0.55;
  return (
    <span className="el-ic" aria-hidden="true" style={light ? { background: `#${brand.hex}`, borderColor: `#${brand.hex}` } : undefined}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={light ? '#111' : `#${brand.hex}`}><path d={brand.path} /></svg>
    </span>
  );
};
