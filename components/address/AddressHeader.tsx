'use client';

import { useQuery } from '@tanstack/react-query';
import { useAddressPageContext } from 'lib/hooks/page-context/AddressPageContext';
import { getNativeTokenPrice } from 'lib/price/utils';
import { usePublicClient } from 'wagmi';
import VeChainAddressDisplay from './VeChainAddressDisplay';
import BalanceDisplay from './BalanceDisplay';
import ConnectedLabel from './ConnectedLabel';
import AddressNavigation from './navigation/AddressNavigation';

const AddressHeader = () => {
  const { address, selectedChainId } = useAddressPageContext();
  const publicClient = usePublicClient({ chainId: selectedChainId });

  const { data: balance, isLoading: balanceIsLoading } = useQuery({
    queryKey: ['balance', address, selectedChainId],
    queryFn: () => publicClient.getBalance({ address }),
    enabled: !!address && !!selectedChainId,
  });

  const { data: nativeAssetPrice, isLoading: nativeAssetPriceIsLoading } = useQuery({
    queryKey: ['nativeAssetPrice', selectedChainId],
    queryFn: () => getNativeTokenPrice(selectedChainId, publicClient),
    enabled: !!selectedChainId,
  });

  return (
    <div className="flex flex-col gap-2 mb-2 border border-black dark:border-white rounded-lg px-4 pt-3">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex flex-col gap-2 items-center sm:items-start pb-2">
          <VeChainAddressDisplay addressOrDomain={address} className="text-2xl font-bold" />
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <BalanceDisplay
                balance={balance}
                price={nativeAssetPrice}
                isLoading={balanceIsLoading || nativeAssetPriceIsLoading}
              />
              <div className="leading-none">&bull;</div>
              <VeChainAddressDisplay addressOrDomain={address} withCopyButton withTooltip />
            </div>
            <ConnectedLabel address={address} />
          </div>
        </div>
      </div>
      <AddressNavigation />
    </div>
  );
};

export default AddressHeader;
