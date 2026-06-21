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

  if (parsed.__devExpensesSeeded) {
    return 0;
  }

  const latestRaw = await AsyncStorage.getItem(STORAGE_KEY);
  const latest = latestRaw ? JSON.parse(latestRaw) : parsed;
  const latestExisting = Array.isArray(latest.expenses) ? latest.expenses : [];

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...latest,
      expenses: [...latestExisting, ...APRIL_MAY_2026_TEST_EXPENSES],
      __devExpensesSeeded: true,
    }),
  );

  return APRIL_MAY_2026_TEST_EXPENSES.length;
}

export const MAY_JUNE_2026_TEST_EXPENSES = [
  { id: 20260502100, merchant: 'HOFER KG', amount: 67.5, date: '2026-05-02', category: 'food' },
  { id: 20260503100, merchant: 'Wiener Linien', amount: 51.0, date: '2026-05-03', category: 'mobility' },
  { id: 20260504100, merchant: 'Netflix', amount: 18.99, date: '2026-05-04', category: 'fixed' },
  { id: 20260506100, merchant: 'Apotheke Zur Gesundheit', amount: 34.2, date: '2026-05-06', category: 'health' },
  { id: 20260508100, merchant: 'BILLA', amount: 43.8, date: '2026-05-08', category: 'food' },
  { id: 20260510100, merchant: 'OMV Tankstelle', amount: 78.4, date: '2026-05-10', category: 'mobility' },
  { id: 20260511100, merchant: 'Zara', amount: 89.95, date: '2026-05-11', category: 'shopping' },
  { id: 20260512100, merchant: 'Spotify', amount: 9.99, date: '2026-05-12', category: 'fixed' },
  { id: 20260514100, merchant: 'Restaurant Zum Wohl', amount: 67.0, date: '2026-05-14', category: 'going-out' },
  { id: 20260515100, merchant: 'HOFER KG', amount: 54.3, date: '2026-05-15', category: 'food' },
  { id: 20260516100, merchant: 'A1 Telekom', amount: 39.99, date: '2026-05-16', category: 'fixed' },
  { id: 20260517100, merchant: 'Libro', amount: 23.9, date: '2026-05-17', category: 'shopping' },
  { id: 20260518100, merchant: 'Fitness First', amount: 49.9, date: '2026-05-18', category: 'health' },
  { id: 20260519100, merchant: 'IKEA', amount: 124.5, date: '2026-05-19', category: 'home' },
  { id: 20260521100, merchant: 'BILLA', amount: 38.6, date: '2026-05-21', category: 'food' },
  { id: 20260522100, merchant: 'Kino Cineplexx', amount: 28.0, date: '2026-05-22', category: 'going-out' },
  { id: 20260523100, merchant: 'dm Drogerie', amount: 31.4, date: '2026-05-23', category: 'health' },
  { id: 20260524100, merchant: 'Shell Tankstelle', amount: 82.3, date: '2026-05-24', category: 'mobility' },
  { id: 20260525100, merchant: 'H&M', amount: 64.95, date: '2026-05-25', category: 'shopping' },
  { id: 20260527100, merchant: 'HOFER KG', amount: 71.2, date: '2026-05-27', category: 'food' },
  { id: 20260528100, merchant: 'Miete', amount: 780.0, date: '2026-05-28', category: 'home' },
  { id: 20260529100, merchant: 'Internet Magenta', amount: 29.99, date: '2026-05-29', category: 'fixed' },
  { id: 20260530100, merchant: 'Café Central', amount: 18.5, date: '2026-05-30', category: 'going-out' },
  { id: 20260601100, merchant: 'Miete', amount: 780.0, date: '2026-06-01', category: 'home' },
  { id: 20260602100, merchant: 'HOFER KG', amount: 58.9, date: '2026-06-02', category: 'food' },
  { id: 20260603100, merchant: 'Netflix', amount: 18.99, date: '2026-06-03', category: 'fixed' },
  { id: 20260604100, merchant: 'Wiener Linien', amount: 51.0, date: '2026-06-04', category: 'mobility' },
  { id: 20260606100, merchant: 'BILLA', amount: 47.3, date: '2026-06-06', category: 'food' },
  { id: 20260607100, merchant: 'Apotheke Zentral', amount: 22.8, date: '2026-06-07', category: 'health' },
  { id: 20260608100, merchant: 'Spotify', amount: 9.99, date: '2026-06-08', category: 'fixed' },
  { id: 20260610100, merchant: 'Restaurant Figlmüller', amount: 54.0, date: '2026-06-10', category: 'going-out' },
  { id: 20260611100, merchant: 'A1 Telekom', amount: 39.99, date: '2026-06-11', category: 'fixed' },
  { id: 20260613100, merchant: 'HOFER KG', amount: 61.4, date: '2026-06-13', category: 'food' },
  { id: 20260615100, merchant: 'dm Drogerie', amount: 28.6, date: '2026-06-15', category: 'health' },
  { id: 20260617100, merchant: 'Intersport', amount: 44.95, date: '2026-06-17', category: 'shopping' },
];

export async function seedMayJune2026TestExpenses() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = raw ? JSON.parse(raw) : {};

  if (parsed.__devMayJuneSeeded) {
    return 0;
  }

  const existing = Array.isArray(parsed.expenses) ? parsed.expenses : [];

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...parsed,
      budget: 1700,
      budgetWarning: 60,
      expenses: [...existing, ...MAY_JUNE_2026_TEST_EXPENSES],
      __devMayJuneSeeded: true,
    }),
  );

  return MAY_JUNE_2026_TEST_EXPENSES.length;
}
