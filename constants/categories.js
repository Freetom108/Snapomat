import { getT } from '../i18n';

const CATEGORY_I18N_KEYS = {
  food: 'food',
  'going-out': 'goingOut',
  mobility: 'mobility',
  home: 'home',
  fixed: 'fixed',
  shopping: 'shopping',
  health: 'health',
};

export const CATEGORIES = {
  food: {
    id: 'food',
    emoji: '🛒',
    color: '#4CD964',
  },
  'going-out': {
    id: 'going-out',
    emoji: '🍽️',
    color: '#FF9500',
  },
  mobility: {
    id: 'mobility',
    emoji: '🚗',
    color: '#0A84FF',
  },
  home: {
    id: 'home',
    emoji: '🏠',
    color: '#BF5AF2',
  },
  fixed: {
    id: 'fixed',
    emoji: '📱',
    color: '#FF6B6B',
  },
  shopping: {
    id: 'shopping',
    emoji: '🛍️',
    color: '#E8B84B',
  },
  health: {
    id: 'health',
    emoji: '💊',
    color: '#FF6B6B',
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export function getCategoryLabel(id) {
  const key = CATEGORY_I18N_KEYS[id] ?? id;
  return getT(`categories.${key}`);
}

export function getCategory(id) {
  const category = CATEGORIES[id];
  if (!category) return null;
  return {
    ...category,
    label: getCategoryLabel(id),
  };
}

export function getCategoryList() {
  return CATEGORY_LIST.map((category) => getCategory(category.id));
}
