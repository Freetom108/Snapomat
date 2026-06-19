import { useEffect, useState } from 'react';
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
import nl from './nl';
import ja from './ja';

const translations = { de, en, fr, es, it, pt, tr, pl, nl, ja };

export const SUPPORTED_LOCALES = Object.keys(translations);
export const FALLBACK_LOCALE = 'en';

let currentLocale = FALLBACK_LOCALE;
const listeners = new Set();

function resolveDeviceLocale() {
  const deviceLocale = Localization.getLocales()[0]?.languageCode ?? FALLBACK_LOCALE;
  return SUPPORTED_LOCALES.includes(deviceLocale) ? deviceLocale : FALLBACK_LOCALE;
}

function interpolate(template, params = {}) {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function lookupTranslation(key, locale) {
  const keys = key.split('.');
  let value = translations[locale];

  for (const part of keys) {
    value = value?.[part];
  }

  return value;
}

export function getT(key, params = {}) {
  let value = lookupTranslation(key, currentLocale);

  if (value == null && currentLocale !== FALLBACK_LOCALE) {
    value = lookupTranslation(key, FALLBACK_LOCALE);
  }

  if (value == null) return key;
  if (typeof value !== 'string') return value;

  return interpolate(value, params);
}

export const t = getT;

export function subscribeLocale(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyLocaleChange() {
  listeners.forEach((listener) => listener());
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
  notifyLocaleChange();
  return currentLocale;
}

export async function setLocale(locale) {
  if (locale === 'auto') {
    currentLocale = resolveDeviceLocale();
    await persistLocale('auto');
    notifyLocaleChange();
    return;
  }
  if (!translations[locale]) return;
  currentLocale = locale;
  await persistLocale(locale);
  notifyLocaleChange();
}

export function getLocale() {
  return currentLocale;
}

export { translations };
