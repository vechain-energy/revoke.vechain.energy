import SharedLayout from 'app/layouts/SharedLayout';
import AddressHeader from 'components/address/AddressHeader';
import { AddressPageContextProvider } from 'lib/hooks/page-context/AddressPageContext';
import NextIntlClientProvider from 'lib/i18n/NextIntlClientProvider';
import { getMessages, unstable_setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';
import { Address, isAddress } from 'viem';

interface Props {
  children: ReactNode;
  params: {
    locale: string;
    addressOrName: string;
  };
}

interface VetDomainsResponse {
  resolverAddress: string;
  address: string;
  name: string;
}

const AddressPageLayout = async ({ params, children }: Props) => {
  unstable_setRequestLocale(params.locale);
  const messages = await getMessages({ locale: params.locale });

  let address: Address;
  
  // If it's already an address, use it directly
  if (isAddress(params.addressOrName)) {
    address = params.addressOrName as Address;
  } else {
    // Try to resolve the name using VET.domains API
    try {
      const response = await fetch(`https://vet.domains/api/lookup/name/${params.addressOrName}`);
      if (response.ok) {
        const data: VetDomainsResponse = await response.json();
        if (isAddress(data.address)) {
          address = data.address as Address;
        } else {
          notFound();
        }
      } else {
        notFound();
      }
    } catch (error) {
      console.error('Error resolving VET domain:', error);
      notFound();
    }
  }

  if (!address) notFound();

  return (
    <SharedLayout>
      <div className="w-full max-w-7xl mx-auto px-4 lg:px-8">
        <AddressPageContextProvider address={address}>
          <NextIntlClientProvider messages={{ common: messages.common, address: messages.address }}>
            <AddressHeader />
            {children}
          </NextIntlClientProvider>
        </AddressPageContextProvider>
      </div>
    </SharedLayout>
  );
};

export default AddressPageLayout;
