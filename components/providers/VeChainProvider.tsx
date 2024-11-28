'use client'

import { ReactNode } from 'react'
import { DAppKitProvider } from '@vechain/dapp-kit-react'

interface Props {
  children: ReactNode
}

export function VeChainProvider({ children }: Props) {
  return (
    <DAppKitProvider
      nodeUrl={process.env.NEXT_PUBLIC_VECHAIN_NODE_URL ?? ''}
      genesis="main"
      usePersistence={true}
      requireCertificate={false}
      allowedWallets={['sync2', 'veworld']}
      modalParent={typeof window !== 'undefined' ? document.body : undefined}
    >
      {children}
    </DAppKitProvider>
  )
} 