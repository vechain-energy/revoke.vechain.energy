import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations({ locale: 'en' });

  return {
    metadataBase: new URL('https://revoke.vechain.energy'),
    title: {
      template: '%s | revoke.vechain.energy',
      default: t('common.meta.title'),
    },
    description: t('common.meta.description', { chainName: 'VeChain' }),
    applicationName: 'revoke.vechain.energy',
    generator: 'Next.js',
  };
};

const RootLayout = ({ children }) => {
  return <>{children}</>;
};

export default RootLayout;
