import { defaultTranslationValues, locales } from 'lib/i18n/config';
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: {
      address: (await import(`../locales/${locale}/address.json`)).default,
      common: (await import(`../locales/${locale}/common.json`)).default,
      landing: (await import(`../locales/${locale}/landing.json`)).default,
      networks: (await import(`../locales/${locale}/networks.json`)).default
    },
    defaultTranslationValues,
  };
}); 