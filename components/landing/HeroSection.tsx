import SearchBar from 'components/header/SearchBar';
import { useTranslations } from 'next-intl';
import LandingParagraph from './LandingParagraph';

const HeroSection = () => {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full px-4 py-8 mx-auto gap-8 sm:mt-44">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">{t('common.hero.title')}</h1>
        <LandingParagraph>
          {t('common.hero.description')}
        </LandingParagraph>
      </div>
      <div className="w-full">
        <SearchBar />
      </div>
    </div>
  );
};

export default HeroSection;
