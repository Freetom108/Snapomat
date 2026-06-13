import * as Localization from 'expo-localization';
import { getLocale as getStoredLocale, saveLocale as persistLocale } from '../store/storage';

import de from './de';
import en from './en';
import fr from './fr';
import es from './es';
import it from './it';
import pt from './pt';
import tr from './tr';
import pl from './pl';

const translations = { de, en, fr, es, it, pt, tr, pl };

const SUPPORTED_LOCALES = Object.keys(translations);
const DEFAULT_LOCALE = 'de';

let currentLocale = DEFAULT_LOCALE;

function resolveDeviceLocale() {
  const deviceLocale = Localization.getLocales()[0]?.languageCode ?? DEFAULT_LOCALE;
  return SUPPORTED_LOCALES.includes(deviceLocale) ? deviceLocale : DEFAULT_LOCALE;
}

export async function initI18n() {
  const stored = await getStoredLocale();
  if (stored === 'auto') {
    currentLocale = resolveDeviceLocale();
  } else if (stored && translations[stored]) {
    currentLocale = stored;
  } else {
    currentLocale = resolveDeviceLocale();
  }
  return currentLocale;
}

export async function setLocale(locale) {
  if (locale === 'auto') {
    currentLocale = resolveDeviceLocale();
    await persistLocale('auto');
    return;
  }
  if (!translations[locale]) return;
  currentLocale = locale;
  await persistLocale(locale);
}

export function getLocale() {
  return currentLocale;
}

export function t(key) {
  const keys = key.split('.');
  let value = translations[currentLocale];

  for (const k of keys) {
    value = value?.[k];
  }

  if (value == null && currentLocale !== DEFAULT_LOCALE) {
    let fallback = translations[DEFAULT_LOCALE];
    for (const k of keys) {
      fallback = fallback?.[k];
    }
    return fallback ?? key;
  }

  return value ?? key;
}

export { SUPPORTED_LOCALES, translations };
