import AsyncStorage from '@react-native-async-storage/async-storage';
import { getT, getLocale } from '../i18n';
import { CATEGORIES } from '../constants/categories';
import { getActiveCurrency, formatCurrencyWithCode } from './currency';

let cachedCurrency = 'EUR';

export async function initCurrency() {
  const storedCode = (await AsyncStorage.getItem('app_currency')) ?? 'AUTO';
  cachedCurrency = getActiveCurrency(storedCode, getLocale());
  return cachedCurrency;
}

export function parseExpenseDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr.includes('.')) {
    const [day, month, year] = dateStr.split('.');
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

export function isSameMonth(date, year, month) {
  return date.getFullYear() === year && date.getMonth() === month;
}

export function getMonthExpenses(expenses, year, month) {
  return expenses.filter((expense) => {
    const date = parseExpenseDate(expense.date);
    return isSameMonth(date, year, month);
  });
}

export function formatCurrency(amount) {
  return formatCurrencyWithCode(amount ?? 0, cachedCurrency);
}

export function formatAmountNumber(amount) {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function getDateLocaleTag() {
  const locale = getLocale();
  if (locale === 'de') return 'de-DE';
  if (locale === 'en') return 'en-GB';
  return locale;
}

function diffCalendarDays(date, now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((startOfToday - startOfDate) / (1000 * 60 * 60 * 24));
}

export function formatRelativeDate(dateStr, now = new Date()) {
  const date = parseExpenseDate(dateStr);
  const diffDays = diffCalendarDays(date, now);

  if (diffDays === 0) return getT('dates.today');
  if (diffDays === 1) return getT('dates.yesterday');

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}

export function formatMonthLabel(year, month) {
  return `${getT(`months.${month}`)} ${year}`;
}

export function getDayLabel(date, now = new Date()) {
  const diffDays = diffCalendarDays(date, now);

  if (diffDays === 0) return getT('dates.today');
  if (diffDays === 1) return getT('dates.yesterday');

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}

export function groupExpensesByDay(expenses, now = new Date()) {
  const sorted = [...expenses].sort(
    (a, b) => parseExpenseDate(b.date) - parseExpenseDate(a.date),
  );

  const groups = [];
  const map = new Map();

  sorted.forEach((expense) => {
    const date = parseExpenseDate(expense.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) {
      const group = {
        id: key,
        label: getDayLabel(date, now),
        isToday: isSameDay(date, now),
        items: [],
        total: 0,
      };
      map.set(key, group);
      groups.push(group);
    }
    const group = map.get(key);
    group.items.push(expense);
    group.total += Number(expense.amount) || 0;
  });

  return groups.map((group) => ({
    ...group,
    total: formatCurrency(group.total),
  }));
}

export function toRowExpense(expense) {
  return {
    ...expense,
    categoryId: expense.category ?? expense.categoryId,
  };
}

function getCategoryEmoji(categoryId) {
  const id = categoryId ?? 'food';
  return CATEGORIES[id]?.emoji ?? CATEGORIES.food.emoji;
}

export function buildMonthlyShareReport(monthExpenses, year, month, t) {
  const sorted = [...monthExpenses].sort(
    (a, b) => parseExpenseDate(a.date) - parseExpenseDate(b.date),
  );
  const total = sorted.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const label = formatMonthLabel(year, month);
  const header = t('settings.shareReportMessage', {
    month: label,
    total: formatCurrency(total),
    count: sorted.length,
  });
  const entryLines = sorted.map((expense) => {
    const categoryId = expense.category ?? expense.categoryId ?? 'food';
    const emoji = getCategoryEmoji(categoryId);
    const amount = formatCurrency(Number(expense.amount) || 0);
    return `${emoji} ${expense.merchant ?? ''} – ${amount}`;
  });

  if (entryLines.length === 0) return header;
  return `${header}\n\n${entryLines.join('\n')}`;
}

export function calcMonthStats(expenses, budget, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthExpenses = getMonthExpenses(expenses, year, month);
  const spent = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const remaining = budget - spent;
  const progress = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const percent = Math.round(progress * 100);

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const remainingDays = Math.max(daysInMonth - dayOfMonth + 1, 1);

  const avgPerDay = dayOfMonth > 0 ? Math.round(spent / dayOfMonth) : 0;
  const perDayLeft = remaining > 0 ? Math.round(remaining / remainingDays) : 0;

  return {
    spent,
    remaining,
    progress,
    percent,
    avgPerDay,
    perDayLeft,
    monthLabel: formatMonthLabel(year, month),
    budgetFormatted: formatAmountNumber(budget),
  };
}
