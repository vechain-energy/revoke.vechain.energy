import { defaultLocale, localePrefix, locales } from 'lib/i18n/config';
import { createSharedPathnamesNavigation } from 'next-intl/navigation';

export { defaultLocale, localePrefix, locales };

export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation({ locales, localePrefix }); 