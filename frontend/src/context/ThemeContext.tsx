import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Light is the default. A theme is remembered only after the user switches it themselves
 * (stored under THEME_CHOICE_KEY). The older "osint_theme" key was written automatically for
 * every visitor, so it is ignored. index.html applies the same rule before the first paint.
 */
const THEME_CHOICE_KEY = 'osint_theme_choice';
const DEFAULT_THEME: Theme = 'light';

function readChoice(): Theme | null {
  try {
    const saved = localStorage.getItem(THEME_CHOICE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

function saveChoice(theme: Theme): void {
  try {
    localStorage.setItem(THEME_CHOICE_KEY, theme);
  } catch { /* storage unavailable */ }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => readChoice() || DEFAULT_THEME);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    saveChoice(newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
