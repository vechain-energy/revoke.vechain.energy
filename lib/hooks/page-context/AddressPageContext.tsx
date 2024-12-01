'use client';

import { usePathname, useRouter } from 'lib/i18n/navigation';
import React, { ReactNode, useContext } from 'react';
import { Address } from 'viem';
import { useEvents } from '../ethereum/events/useEvents';
import { useAllowances } from '../ethereum/useAllowances';

interface AddressContext {
  address?: Address;
  selectedChainId: number;
  eventContext?: ReturnType<typeof useEvents>;
  allowanceContext?: ReturnType<typeof useAllowances>;
}

interface Props {
  children: ReactNode;
  address: Address;
}

const AddressPageContext = React.createContext<AddressContext>({
  selectedChainId: 100009,
});

export const AddressPageContextProvider = ({ children, address }: Props) => {
  // Always use VeChain (100009)
  const selectedChainId = 100009;

  const eventContext = useEvents(address, selectedChainId);
  const allowanceContext = useAllowances(address, eventContext?.events, selectedChainId);
  allowanceContext.error = allowanceContext?.error || eventContext?.error;
  allowanceContext.isLoading =
    (allowanceContext?.isLoading || eventContext?.isLoading || !allowanceContext?.allowances) &&
    !allowanceContext?.error;

  return (
    <AddressPageContext.Provider
      value={{
        address,
        selectedChainId,
        eventContext,
        allowanceContext,
      }}
    >
      {children}
    </AddressPageContext.Provider>
  );
};

export const useAddressPageContext = () => useContext(AddressPageContext);

export const useAddressEvents = () => useContext(AddressPageContext).eventContext;
export const useAddressAllowances = () => useContext(AddressPageContext).allowanceContext;
