import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'snapomat_data';

export const APRIL_MAY_2026_TEST_EXPENSES = [
  { id: 20260403001, merchant: 'HOFER KG', amount: 43.2, date: '2026-04-03', category: 'food' },
  { id: 20260407001, merchant: 'OMV Tankstelle', amount: 67.5, date: '2026-04-07', category: 'mobility' },
  { id: 20260410001, merchant: 'Netflix', amount: 15.99, date: '2026-04-10', category: 'fixed' },
  { id: 20260415001, merchant: 'Friseur Salon', amount: 28, date: '2026-04-15', category: 'health' },
  { id: 20260419001, merchant: 'Intersport', amount: 89.9, date: '2026-04-19', category: 'shopping' },
  { id: 20260428001, merchant: 'BILLA', amount: 34.75, date: '2026-04-28', category: 'food' },
  { id: 20260502001, merchant: 'HOFER KG', amount: 51.3, date: '2026-05-02', category: 'food' },
  { id: 20260509001, merchant: 'Shell Tankstelle', amount: 72, date: '2026-05-09', category: 'mobility' },
  { id: 20260512001, merchant: 'Spotify', amount: 9.99, date: '2026-05-12', category: 'fixed' },
  { id: 20260520001, merchant: 'Apotheke Wien', amount: 22.4, date: '2026-05-20', category: 'health' },
  { id: 20260527001, merchant: 'Zara', amount: 64.95, date: '2026-05-27', category: 'shopping' },
];

export async function seedAprilMay2026TestExpenses() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = raw ? JSON.parse(raw) : {};
  const existing = Array.isArray(parsed.expenses) ? parsed.expenses : [];
  const seedIds = new Set(APRIL_MAY_2026_TEST_EXPENSES.map((entry) => entry.id));
  const expenses = [
    ...existing.filter((entry) => !seedIds.has(entry.id)),
    ...APRIL_MAY_2026_TEST_EXPENSES,
  ];

  const latestRaw = await AsyncStorage.getItem(STORAGE_KEY);
  const latest = latestRaw ? JSON.parse(latestRaw) : parsed;

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...latest,
      expenses,
    }),
  );

  return APRIL_MAY_2026_TEST_EXPENSES.length;
}
