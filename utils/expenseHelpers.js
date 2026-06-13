const MONTH_NAMES = [
  'JANUAR', 'FEBRUAR', 'MÄRZ', 'APRIL', 'MAI', 'JUNI',
  'JULI', 'AUGUST', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DEZEMBER',
];

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
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount ?? 0);
}

export function formatAmountNumber(amount) {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function formatMonthLabel(year, month) {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function getDayLabel(date, now = new Date()) {
  if (isSameDay(date, now)) return 'HEUTE';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'GESTERN';
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).toUpperCase();
}

export function groupExpensesByDay(expenses, now = new Date()) {
  const sorted = [...expenses].sort(
    (a, b) => parseExpenseDate(b.date) - parseExpenseDate(a.date),
  );

  const groups = [];
  const map = new Map();

  sorted.forEach((expense) => {
    const date = parseExpenseDate(expense.date);
    const key = date.toDateString();
    if (!map.has(key)) {
      const group = {
        id: key,
        label: getDayLabel(date, now),
        isToday: getDayLabel(date, now) === 'HEUTE',
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
