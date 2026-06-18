import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'snapomat_data';
const MERCHANT_LIBRARY_KEY = 'snapomat_merchant_library';
const TRIAL_START_KEY = 'snapomat_trial_start';
const SUBSCRIBED_KEY = 'snapomat_subscribed';
const TRIAL_DAYS = 30;

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
  onboardingCompleted: false,
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
    const data = normalizeStoredData(parsed);
    const dedupedExpenses = deduplicateExpenses(data.expenses);

    if (dedupedExpenses.length !== data.expenses.length) {
      data.expenses = dedupedExpenses;
      await saveData(data);
    }

    return data;
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

function normalizeExpenseId(id) {
  if (id === null || id === undefined || id === '') return null;
  return String(id);
}

function deduplicateExpenses(expenses) {
  if (!Array.isArray(expenses) || expenses.length === 0) return [];

  const byId = new Map();

  expenses.forEach((expense, index) => {
    if (!expense || typeof expense !== 'object') return;

    const id = normalizeExpenseId(expense.id);
    if (!id) return;

    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, { expense, index });
      return;
    }

    const existingDate = parseExpenseDate(existing.expense.date);
    const currentDate = parseExpenseDate(expense.date);
    if (currentDate > existingDate || (currentDate === existingDate && index > existing.index)) {
      byId.set(id, { expense, index });
    }
  });

  return Array.from(byId.values())
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.expense);
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
  const targetId = normalizeExpenseId(id);
  if (!targetId) return false;

  const data = await loadData();
  const nextExpenses = data.expenses.filter(
    (expense) => expense && normalizeExpenseId(expense.id) !== targetId,
  );

  if (nextExpenses.length === data.expenses.length) {
    return false;
  }

  data.expenses = nextExpenses;
  await saveData(data);
  return true;
}

export async function updateExpense(id, updates) {
  const targetId = normalizeExpenseId(id);
  if (!targetId) return null;

  const data = await loadData();
  const index = data.expenses.findIndex(
    (expense) => normalizeExpenseId(expense?.id) === targetId,
  );
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

export async function deductCredit() {
  const data = await loadData();
  const current = data.credits ?? DEFAULT_DATA.credits;
  data.credits = Math.max(0, current - 1);
  await saveData(data);
  return data.credits;
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

function isOnboardingCompleted(data) {
  return data.onboardingCompleted === true || data.onboardingDone === true;
}

export async function getOnboardingDoneLive() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isOnboardingCompleted(parsed)) return true;
    }
  } catch {
    // ignore parse errors
  }

  const legacy = await AsyncStorage.getItem('hasOnboarded');
  return legacy === 'true';
}

export async function getOnboardingDone() {
  const data = await loadData();
  if (isOnboardingCompleted(data)) return true;

  const legacy = await AsyncStorage.getItem('hasOnboarded');
  if (legacy === 'true') {
    data.onboardingCompleted = true;
    data.onboardingDone = true;
    await saveData(data);
    return true;
  }

  return false;
}

export async function setOnboardingDone() {
  const data = await loadData();
  data.onboardingCompleted = true;
  data.onboardingDone = true;
  await saveData(data);
  await AsyncStorage.removeItem('hasOnboarded');
}

export async function clearOnboardingDone() {
  const data = await loadData();
  data.onboardingCompleted = false;
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

export async function getHistorySelectedMonth() {
  const data = await loadData();
  const value = data.historySelectedMonth;
  if (
    value
    && Number.isInteger(value.year)
    && Number.isInteger(value.month)
    && value.month >= 0
    && value.month <= 11
  ) {
    return { year: value.year, month: value.month };
  }
  return null;
}

export async function saveHistorySelectedMonth(year, month) {
  const data = await loadData();
  data.historySelectedMonth = {
    year: Number(year),
    month: Number(month),
  };
  await saveData(data);
}

function normalizeMerchantKey(name) {
  return String(name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9äöüß]/gi, '');
}

function longestCommonSubstringLength(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let maxLen = 0;
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        maxLen = Math.max(maxLen, dp[i][j]);
      }
    }
  }

  return maxLen;
}

function calculateMerchantSimilarity(a, b) {
  const left = normalizeMerchantKey(a);
  const right = normalizeMerchantKey(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const lcs = longestCommonSubstringLength(left, right);
  return lcs / Math.max(left.length, right.length);
}

export async function getMerchantLibrary() {
  try {
    const raw = await AsyncStorage.getItem(MERCHANT_LIBRARY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveMerchantToLibrary(recognizedName, confirmedName) {
  const canonicalName = String(confirmedName ?? '').trim();
  if (!canonicalName) return;

  const key = normalizeMerchantKey(recognizedName) || normalizeMerchantKey(canonicalName);
  if (!key) return;

  const library = await getMerchantLibrary();
  library[key] = canonicalName;
  await AsyncStorage.setItem(MERCHANT_LIBRARY_KEY, JSON.stringify(library));
}

export async function findMerchantMatch(recognizedName) {
  const query = String(recognizedName ?? '').trim();
  if (!query) {
    return { match: null, confidence: 'low' };
  }

  const library = await getMerchantLibrary();
  let bestScore = 0;
  let bestMatch = null;

  Object.entries(library).forEach(([key, canonicalName]) => {
    const score = Math.max(
      calculateMerchantSimilarity(query, key),
      calculateMerchantSimilarity(query, canonicalName),
    );
    if (score > bestScore) {
      bestScore = score;
      bestMatch = canonicalName;
    }
  });

  if (bestScore > 0.7) {
    return { match: bestMatch, confidence: 'high' };
  }
  if (bestScore >= 0.4) {
    return { match: bestMatch, confidence: 'medium' };
  }
  return { match: null, confidence: 'low' };
}

export async function exportData() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const merchantLibrary = await getMerchantLibrary();
  if (!raw) {
    return JSON.stringify(
      {
        ...normalizeStoredData({ expenses: [] }),
        snapomat_merchant_library: merchantLibrary,
      },
      null,
      2,
    );
  }
  return JSON.stringify(
    {
      ...normalizeStoredData(JSON.parse(raw)),
      snapomat_merchant_library: merchantLibrary,
    },
    null,
    2,
  );
}

export async function importData(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    const payload = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    if (!payload || typeof payload !== 'object') return false;

    const library = parsed.snapomat_merchant_library ?? payload.snapomat_merchant_library;
    if (library && typeof library === 'object') {
      await AsyncStorage.setItem(MERCHANT_LIBRARY_KEY, JSON.stringify(library));
    }

    const { snapomat_merchant_library: _library, ...dataPayload } = payload;
    await saveData(normalizeStoredData(dataPayload));
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

export async function initTrialIfNeeded() {
  const existing = await AsyncStorage.getItem(TRIAL_START_KEY);
  if (!existing) {
    await AsyncStorage.setItem(TRIAL_START_KEY, new Date().toISOString());
  }
}

export async function isTrialActive() {
  const startRaw = await AsyncStorage.getItem(TRIAL_START_KEY);
  if (!startRaw) return false;

  const start = new Date(startRaw);
  if (Number.isNaN(start.getTime())) return false;

  const elapsedMs = Date.now() - start.getTime();
  return elapsedMs < TRIAL_DAYS * 24 * 60 * 60 * 1000;
}

export async function isSubscribed() {
  const value = await AsyncStorage.getItem(SUBSCRIBED_KEY);
  return value === 'true';
}

export async function hasAccess() {
  await initTrialIfNeeded();
  const [trialActive, subscribed] = await Promise.all([isTrialActive(), isSubscribed()]);
  return trialActive || subscribed;
}

export async function setSubscribed(subscribed = true) {
  await AsyncStorage.setItem(SUBSCRIBED_KEY, subscribed ? 'true' : 'false');
}
