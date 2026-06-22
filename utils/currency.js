export const SUPPORTED_CURRENCIES = [
  { code: 'AUTO', label: 'currencyAuto' },
  { code: 'EUR', label: 'EUR', symbol: '€' },
  { code: 'JPY', label: 'JPY', symbol: '¥' },
  { code: 'PLN', label: 'PLN', symbol: 'zł' },
  { code: 'TRY', label: 'TRY', symbol: '₺' },
  { code: 'USD', label: 'USD', symbol: '$' },
  { code: 'GBP', label: 'GBP', symbol: '£' },
];

const LOCALE_CURRENCY_MAP = {
  ja: 'JPY',
  pl: 'PLN',
  tr: 'TRY',
  en: 'USD',
};

export function getActiveCurrency(storedCode, deviceLocale) {
  if (!storedCode || storedCode === 'AUTO') {
    return LOCALE_CURRENCY_MAP[deviceLocale] ?? 'EUR';
  }
  return storedCode;
}

export function formatCurrencyWithCode(amount, currencyCode) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount ?? 0);
}
