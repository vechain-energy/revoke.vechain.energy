import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import SignaturesDashboard from 'components/signatures/SignaturesDashboard';

export const generateMetadata = async ({ params: { locale } }): Promise<Metadata> => {
  const t = await getTranslations({ locale });

  return {
    title: t('address.meta.signatures_title'),
  };
};

interface Props {
  params: {
    addressOrName: string;
    locale: string;
  };
}

const SignaturesPage = ({ params }: Props) => {
  return <SignaturesDashboard />;
};

export default SignaturesPage;
