'use client';

import { usePathname, useRouter } from 'lib/i18n/navigation';
import { isSupportedChain } from 'lib/utils/chains';
import { useSearchParams } from 'next/navigation';
import React, { ReactNode, useContext, useLayoutEffect, useState } from 'react';
import useLocalStorage from 'use-local-storage';
import { Address } from 'viem';
import { useAccount } from 'wagmi';
import { useEvents } from '../ethereum/events/useEvents';
import { useAllowances } from '../ethereum/useAllowances';

interface AddressContext {
  address?: Address;
  selectedChainId?: number;
  selectChain?: (chainId: number) => void;
  eventContext?: ReturnType<typeof useEvents>;
  allowanceContext?: ReturnType<typeof useAllowances>;
  signatureNoticeAcknowledged?: boolean;
  acknowledgeSignatureNotice?: () => void;
}

interface Props {
  children: ReactNode;
  address: Address;
  initialChainId?: number;
}

const AddressPageContext = React.createContext<AddressContext>({});

export const AddressPageContextProvider = ({ children, address, initialChainId }: Props) => {
  const { chain } = useAccount();

  // Always use VeChain (100009) as the default chain
  const [selectedChainId, setSelectedChainId] = useState<number>(100009);

  // Force VeChain selection when no chain is selected
  useLayoutEffect(() => {
    if (!selectedChainId) {
      setSelectedChainId(100009);
    }
  }, [selectedChainId]);

  const eventContext = useEvents(address, selectedChainId);
  const allowanceContext = useAllowances(address, eventContext?.events, selectedChainId);
  allowanceContext.error = allowanceContext?.error || eventContext?.error;
  allowanceContext.isLoading =
    (allowanceContext?.isLoading || eventContext?.isLoading || !allowanceContext?.allowances) &&
    !allowanceContext?.error;

  const [signatureNoticeAcknowledged, setAcknowledged] = useLocalStorage('signature-notice-acknowledged', false);
  const acknowledgeSignatureNotice = () => setAcknowledged(true);

  return (
    <AddressPageContext.Provider
      value={{
        address,
        selectedChainId,
        selectChain: setSelectedChainId,
        eventContext,
        allowanceContext,
        signatureNoticeAcknowledged,
        acknowledgeSignatureNotice,
      }}
    >
      {children}
    </AddressPageContext.Provider>
  );
};

export const useAddressPageContext = () => useContext(AddressPageContext);

export const useAddressEvents = () => useContext(AddressPageContext).eventContext;
export const useAddressAllowances = () => useContext(AddressPageContext).allowanceContext;
