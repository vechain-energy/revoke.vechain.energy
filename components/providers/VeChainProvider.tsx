'use client';

import { VECHAIN_NODE_URL } from 'lib/rpc/thor';
import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

const DAppKitProvider = dynamic(() => import('@vechain/dapp-kit-react').then((mod) => mod.DAppKitProvider), {
  ssr: false,
});

export function VeChainProvider({ children }: Props) {
  return (
    <DAppKitProvider usePersistence genesis="main" nodeUrl={VECHAIN_NODE_URL}>
      {children}
    </DAppKitProvider>
  );
}
