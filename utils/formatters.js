import { formatRelativeDate as formatRelativeDateI18n } from './expenseHelpers';

export function formatCurrency(amount, locale = 'de-DE', currency = 'EUR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date, locale = 'de-DE') {
  const value = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
}

export function formatRelativeDate(date) {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) {
      return formatRelativeDateI18n(new Date().toISOString().slice(0, 10));
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return formatRelativeDateI18n(`${year}-${month}-${day}`);
  }
  return formatRelativeDateI18n(date);
}
