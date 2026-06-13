export const CATEGORIES = {
  food: {
    id: 'food',
    label: 'Lebensmittel',
    emoji: '🛒',
    color: '#4CD964',
  },
  'going-out': {
    id: 'going-out',
    label: 'Freizeit',
    emoji: '🍽️',
    color: '#FF9500',
  },
  mobility: {
    id: 'mobility',
    label: 'Mobilität',
    emoji: '🚗',
    color: '#0A84FF',
  },
  home: {
    id: 'home',
    label: 'Wohnen',
    emoji: '🏠',
    color: '#BF5AF2',
  },
  fixed: {
    id: 'fixed',
    label: 'Fixkosten',
    emoji: '📱',
    color: '#FF6B6B',
  },
  shopping: {
    id: 'shopping',
    label: 'Shopping',
    emoji: '🛍️',
    color: '#E8B84B',
  },
  health: {
    id: 'health',
    label: 'Gesundheit',
    emoji: '💊',
    color: '#FF6B6B',
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export function getCategory(id) {
  return CATEGORIES[id] ?? null;
}
