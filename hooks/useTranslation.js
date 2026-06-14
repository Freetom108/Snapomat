import { useEffect, useMemo, useState } from 'react';
import { getLocale, getT, subscribeLocale } from '../i18n';

export function useTranslation() {
  const [, version] = useState(0);

  useEffect(() => subscribeLocale(() => version((value) => value + 1)), []);

  return useMemo(
    () => ({
      t: getT,
      locale: getLocale(),
    }),
    [version],
  );
}
