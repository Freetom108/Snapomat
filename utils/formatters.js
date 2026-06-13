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

export function formatRelativeDate(date, locale = 'de-DE') {
  const value = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - value;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';

  return formatDate(value, locale);
}
