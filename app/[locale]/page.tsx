import SharedLayout from 'app/layouts/SharedLayout';
import HeroSection from 'components/landing/HeroSection';
import type { Metadata, NextPage } from 'next';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import Script from 'next/script';

interface Props {
  params: {
    locale: string;
  };
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  logo: 'https://revoke.vechain.energy/assets/images/revoke-icon-orange-black.svg',
  url: 'https://revoke.vechain.energy',
};

export const generateMetadata = async ({ params: { locale } }): Promise<Metadata> => {
  const t = await getTranslations({ locale });

  return {
    title: 'revoke.vechain.energy - VeChain Approval Manager',
    description: t('common.meta.description', { chainName: 'VeChain' }),
  };
};

const LandingPage: NextPage<Props> = ({ params }) => {
  unstable_setRequestLocale(params.locale);

  return (
    <>
      <SharedLayout searchBarOnDisconnect={false}>
        <div className="flex flex-col items-center">
          <HeroSection />
        </div>
      </SharedLayout>
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
};

export default LandingPage;
