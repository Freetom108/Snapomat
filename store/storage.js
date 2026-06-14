import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'snapomat_data';

const DEFAULT_DATA = {
  expenses: [],
  budget: 1000,
  budgetWarning: 80,
  credits: 5,
  creditRollover: {
    monthKey: null,
    creditsUsedThisMonth: 0,
  },
  theme: 'gold',
  onboardingDone: false,
  locale: 'de',
  userId: null,
};

function normalizeCreditRollover(value) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_DATA.creditRollover };
  }
  return {
    monthKey: value.monthKey ?? null,
    creditsUsedThisMonth: Number(value.creditsUsedThisMonth) || 0,
  };
}

function normalizeStoredData(parsed) {
  return {
    ...DEFAULT_DATA,
    ...parsed,
    expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    creditRollover: normalizeCreditRollover(parsed.creditRollover),
  };
}

function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function loadData() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DATA, expenses: [] };
    const parsed = JSON.parse(raw);
    return normalizeStoredData(parsed);
  } catch {
    return { ...DEFAULT_DATA, expenses: [] };
  }
}

async function saveData(data) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function parseExpenseDate(date) {
  if (!date) return 0;
  if (date.includes('.')) {
    const [day, month, year] = date.split('.');
    return new Date(`${year}-${month}-${day}`).getTime();
  }
  return new Date(date).getTime();
}

export async function saveExpense(expense) {
  const data = await loadData();
  const entry = {
    id: expense.id ?? Date.now(),
    merchant: expense.merchant ?? '',
    amount: Number(expense.amount) || 0,
    date: expense.date ?? new Date().toISOString().slice(0, 10),
    category: expense.category ?? 'food',
  };
  data.expenses.push(entry);
  await saveData(data);
  return entry;
}

export async function getExpenses() {
  const data = await loadData();
  return [...data.expenses].sort(
    (a, b) => parseExpenseDate(b.date) - parseExpenseDate(a.date),
  );
}

export async function deleteExpense(id) {
  const data = await loadData();
  data.expenses = data.expenses.filter((expense) => expense.id !== id);
  await saveData(data);
}

export async function updateExpense(id, updates) {
  const data = await loadData();
  const index = data.expenses.findIndex((expense) => expense.id === id);
  if (index === -1) return null;
  data.expenses[index] = {
    ...data.expenses[index],
    ...updates,
  };
  await saveData(data);
  return data.expenses[index];
}

export async function getBudget() {
  const data = await loadData();
  return data.budget ?? DEFAULT_DATA.budget;
}

export async function saveBudget(amount) {
  const data = await loadData();
  data.budget = Number(amount) || DEFAULT_DATA.budget;
  await saveData(data);
}

export async function getBudgetWarning() {
  const data = await loadData();
  return data.budgetWarning ?? DEFAULT_DATA.budgetWarning;
}

export async function saveBudgetWarning(value) {
  const data = await loadData();
  data.budgetWarning = Number(value) || DEFAULT_DATA.budgetWarning;
  await saveData(data);
}

export async function getCredits() {
  const data = await loadData();
  return data.credits ?? DEFAULT_DATA.credits;
}

export async function saveCredits(amount) {
  const data = await loadData();
  data.credits = Math.max(0, Number(amount) || 0);
  await saveData(data);
}

export async function clearAllData() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function getTheme() {
  const data = await loadData();
  return data.theme ?? DEFAULT_DATA.theme;
}

export async function saveTheme(themeId) {
  const data = await loadData();
  data.theme = themeId;
  await saveData(data);
}

export async function getOnboardingDoneLive() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.onboardingDone === true) return true;
    }
  } catch {
    // ignore parse errors
  }

  const legacy = await AsyncStorage.getItem('hasOnboarded');
  return legacy === 'true';
}

export async function getOnboardingDone() {
  const data = await loadData();
  if (data.onboardingDone) return true;

  const legacy = await AsyncStorage.getItem('hasOnboarded');
  if (legacy === 'true') {
    data.onboardingDone = true;
    await saveData(data);
    return true;
  }

  return false;
}

export async function setOnboardingDone() {
  const data = await loadData();
  data.onboardingDone = true;
  await saveData(data);
  await AsyncStorage.removeItem('hasOnboarded');
}

export async function clearOnboardingDone() {
  const data = await loadData();
  data.onboardingDone = false;
  await saveData(data);
  await AsyncStorage.removeItem('hasOnboarded');
}

function randomHex(length) {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += Math.floor(Math.random() * 16).toString(16).toUpperCase();
  }
  return result;
}

function generateUserId() {
  return `SN-${randomHex(4)}${randomHex(4)}${randomHex(4)}`;
}

export function formatUserIdDisplay(userId) {
  if (!userId) return '';
  const normalized = userId.startsWith('SN-') ? userId : `SN-${userId}`;
  const body = normalized.slice(3);
  if (body.length <= 7) return normalized;
  return `SN-${body.slice(0, 4)}...${body.slice(-3)}`;
}

export async function getUserId() {
  const data = await loadData();
  if (data.userId) return data.userId;
  const userId = generateUserId();
  data.userId = userId;
  await saveData(data);
  return userId;
}

export async function getLocale() {
  const data = await loadData();
  return data.locale ?? DEFAULT_DATA.locale;
}

export async function saveLocale(locale) {
  const data = await loadData();
  data.locale = locale;
  await saveData(data);
}

export async function exportData() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return JSON.stringify(normalizeStoredData({ expenses: [] }), null, 2);
  }
  return JSON.stringify(normalizeStoredData(JSON.parse(raw)), null, 2);
}

export async function importData(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    const payload = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    if (!payload || typeof payload !== 'object') return false;
    await saveData(normalizeStoredData(payload));
    return true;
  } catch {
    return false;
  }
}

export async function applyMonthlyRollover(monthlyLimit) {
  const data = await loadData();
  const limit = Math.max(0, Number(monthlyLimit) || 0);
  const currentMonth = getMonthKey();
  const rollover = normalizeCreditRollover(data.creditRollover);

  if (rollover.monthKey && rollover.monthKey !== currentMonth) {
    const surplus = Math.max(0, limit - rollover.creditsUsedThisMonth);
    const amount = Math.min(surplus, limit);
    data.credits = (data.credits ?? DEFAULT_DATA.credits) + amount;
  }

  data.creditRollover = {
    monthKey: currentMonth,
    creditsUsedThisMonth:
      rollover.monthKey === currentMonth ? rollover.creditsUsedThisMonth : 0,
  };

  await saveData(data);
  return data.credits;
}

export async function cancelSubscription() {
  const data = await loadData();
  data.credits = 25;
  await saveData(data);
  return data.credits;
}
