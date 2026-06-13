import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_THEME_ID, THEMES } from '../constants/colors';
import { getTheme, saveTheme as persistTheme } from '../store/storage';

const THEME_ALIASES = {
  gold: 'midnightGold',
};

function resolveThemeId(stored) {
  if (stored && THEMES[stored]) return stored;
  if (stored && THEME_ALIASES[stored]) return THEME_ALIASES[stored];
  return DEFAULT_THEME_ID;
}

function withAlpha(hex, alpha) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export function useTheme() {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getTheme().then((stored) => {
      setThemeId(resolveThemeId(stored));
      setReady(true);
    });
  }, []);

  const setTheme = useCallback(async (id) => {
    if (!THEMES[id]) return;
    setThemeId(id);
    await persistTheme(id);
  }, []);

  const theme = THEMES[themeId] ?? THEMES[DEFAULT_THEME_ID];

  const colors = useMemo(
    () => ({
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
    }),
    [themeId],
  );

  return { theme, colors, themeId, setTheme, ready };
}
