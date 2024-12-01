'use client';

import ConnectButton from 'components/header/ConnectButton';
import SearchBar from 'components/header/SearchBar';
import { useVeChainWallet } from 'lib/hooks/vechain/useVeChainWallet';
import { useTranslations } from 'next-intl';
import LandingParagraph from './LandingParagraph';
import AllowanceDashboard from 'components/allowances/dashboard/AllowanceDashboard';
import { AddressPageContextProvider } from 'lib/hooks/page-context/AddressPageContext';
import AddressHeader from 'components/address/AddressHeader';

const HeroSection = () => {
  const t = useTranslations();
  const { address } = useVeChainWallet();

  if (address) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 lg:px-8">
        <AddressPageContextProvider address={address as `0x${string}`}>
          <AddressHeader />
          <AllowanceDashboard />
        </AddressPageContextProvider>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8 mx-auto gap-16 sm:mt-32">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">{t('common.hero.title')}</h1>
        <LandingParagraph>
          {t('common.hero.description')}
        </LandingParagraph>
      </div>
      <div className="flex flex-col items-center gap-12 w-full">
        <div className="flex flex-col items-center gap-2">
          <ConnectButton size="lg" />
        </div>
        <div className="flex items-center gap-4 w-full">
          <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-700" />
          <div className="text-gray-500 dark:text-gray-400 font-medium">OR</div>
          <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex flex-col items-center gap-2 w-full">
          <SearchBar />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
