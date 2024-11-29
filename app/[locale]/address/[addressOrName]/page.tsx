import { getTranslations } from 'next-intl/server';
import { getAddressAndDomainName } from 'lib/utils/whois';
import { notFound } from 'next/navigation';
import AllowanceDashboard from 'components/allowances/dashboard/AllowanceDashboard';
import { Address } from 'viem';

interface Props {
  params: {
    addressOrName: string;
    locale: string;
  };
}

export default async function Page({ params: { addressOrName, locale } }: Props) {
  const t = await getTranslations();
  const { address, domainName } = await getAddressAndDomainName(addressOrName);

  if (!address) {
    notFound();
  }

  return <AllowanceDashboard />;
}
