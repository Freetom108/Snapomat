import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DEFAULT_THEME_ID, THEMES, resolveThemeId } from '../constants/colors';
import { getTheme, saveTheme as persistTheme } from '../store/storage';

const ThemeContext = createContext(null);

function withAlpha(hex, alpha) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

function buildColors(theme) {
  return {
    id: theme.id,
    background: theme.bg,
    card: theme.card,
    border: theme.border,
    text: theme.text,
    muted: theme.muted,
    accent: theme.accent,
    accentFaint: withAlpha(theme.accent, 0.12),
    accentDim: withAlpha(theme.accent, 0.25),
    dim: theme.dim,
    green: theme.green,
    red: theme.red,
  };
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getTheme().then((stored) => {
      setThemeId(resolveThemeId(stored));
      setReady(true);
    });
  }, []);

  const setTheme = useCallback(async (id) => {
    const resolved = resolveThemeId(id);
    if (!THEMES[resolved]) return;
    setThemeId(resolved);
    await persistTheme(resolved);
  }, []);

  const theme = THEMES[themeId] ?? THEMES[DEFAULT_THEME_ID];

  const colors = useMemo(() => buildColors(theme), [themeId]);

  const value = useMemo(
    () => ({ theme, colors, themeId, setTheme, ready }),
    [theme, colors, themeId, setTheme, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
