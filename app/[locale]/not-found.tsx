import { GlobeEuropeAfricaIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import ContentPageLayout from 'app/layouts/ContentPageLayout';
import Href from 'components/common/Href';
import NotFoundLink from 'components/common/NotFoundLink';
import { NextPage } from 'next';
import { useTranslations } from 'next-intl';
import NotFoundLinkMyApprovals from './NotFoundLinkMyApprovals';

interface Props {
  params: {
    locale: string;
  };
}

const NotFoundPage: NextPage<Props> = ({ params }) => {
  // Somehow this does not work for the not-found page. This is alright though.
  // unstable_setRequestLocale(params.locale);

  const t = useTranslations();

  return (
    <ContentPageLayout>
      <div className="flex flex-col gap-8 mx-auto max-w-xl">
        <div className="text-center flex flex-col gap-2">
          <p className="text-zinc-900 font-semibold">404</p>
          <h1>{t('common.errors.404.title')}</h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400">{t('common.errors.404.subtitle')}</p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">{t('common.errors.404.suggested_pages.title')}</h2>
        </div>
        <p>
          <Href href="/" className="font-medium" underline="none">
            {t('common.errors.404.go_home')} &rarr;
          </Href>
        </p>
      </div>
    </ContentPageLayout>
  );
};

export default NotFoundPage;
