'use client'

import { ReactNode } from 'react'
import dynamic from 'next/dynamic'

interface Props {
  children: ReactNode
}

const DAppKitProvider = dynamic(
  () => import('@vechain/dapp-kit-react').then(mod => mod.DAppKitProvider),
  { ssr: false }
)

export function VeChainProvider({ children }: Props) {

  return (
    <DAppKitProvider
      usePersistence
      genesis='main'
      nodeUrl={process.env.NEXT_PUBLIC_VECHAIN_NODE_URL ?? ''}
    >
      {children}
    </DAppKitProvider>
  )
} 