export const ACCENT = '#E8B84B';

const SHARED = {
  accent: ACCENT,
  muted: '#666666',
  dim: '#333333',
  green: '#4CD964',
  red: '#FF3B30',
};

export const THEMES = {
  gold: {
    id: 'gold',
    name: 'Midnight Gold',
    bg: '#000000',
    card: '#181818',
    text: '#FFFFFF',
    border: '#2a2a2a',
    ...SHARED,
  },
  forest: {
    id: 'forest',
    name: 'Forest Green',
    bg: '#08120A',
    card: '#102114',
    text: '#FFFFFF',
    border: '#2a2a2a',
    ...SHARED,
  },
  burgundy: {
    id: 'burgundy',
    name: 'Burgundy',
    bg: '#120707',
    card: '#1C0D0D',
    text: '#FFFFFF',
    border: '#2a2a2a',
    ...SHARED,
  },
  blue: {
    id: 'blue',
    name: 'Midnight Blue',
    bg: '#070A12',
    card: '#0D1420',
    text: '#FFFFFF',
    border: '#2a2a2a',
    ...SHARED,
  },
  light: {
    id: 'light',
    name: 'Light',
    bg: '#F2F1EC',
    card: '#FFFFFF',
    text: '#0A0A0A',
    border: '#E0DFD8',
    ...SHARED,
  },
};

export const DEFAULT_THEME_ID = 'gold';

export const THEME_ALIASES = {
  midnightGold: 'gold',
  forestGreen: 'forest',
  midnightBlue: 'blue',
};

export function resolveThemeId(stored) {
  if (stored && THEMES[stored]) return stored;
  if (stored && THEME_ALIASES[stored]) return THEME_ALIASES[stored];
  return DEFAULT_THEME_ID;
}
