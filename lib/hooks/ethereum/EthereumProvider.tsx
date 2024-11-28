'use client';

import { createViemPublicClientForChain, getViemChainConfig, ORDERED_CHAINS } from 'lib/utils/chains';
import { SECOND } from 'lib/utils/time';
import { ReactNode } from 'react';
import { Chain } from 'viem';
import { createConfig, WagmiProvider } from 'wagmi';

interface Props {
  children: ReactNode;
}

export const connectors = [];

export const wagmiConfig = createConfig({
  chains: ORDERED_CHAINS.map(getViemChainConfig) as [Chain, ...Chain[]],
  connectors,
  // @ts-ignore TODO: This gives a TypeScript error since Wagmi v2
  client: ({ chain }) => {
    return createViemPublicClientForChain(chain.id) as any;
  },
  ssr: true,
  batch: { multicall: true },
  cacheTime: 4 * SECOND,
});

export const EthereumProvider = ({ children }: Props) => {
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      {children}
    </WagmiProvider>
  );
};
