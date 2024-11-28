'use client'

import { useVeChainDAppKitWallet } from './useVeChainDAppKit'
import { getCurrentNetwork } from '../../utils/vechain'
import { useConnex } from '@vechain/dapp-kit-react'

export function useVeChainWallet() {
  const {
    address,
    chain,
    isConnecting,
    connect,
    disconnect,
    sendTransaction
  } = useVeChainDAppKitWallet()

  const { thor } = useConnex()

  const handleTransaction = async (transaction: any) => {
    try {
      const txid = await sendTransaction(transaction)

      // Create a confirmation promise that waits for the transaction receipt
      const confirmation = async () => {
        if (!thor) throw new Error('Thor not available')
        
        // Wait for the transaction to be mined and get receipt
        const tx = thor.transaction(txid)
        const receipt = await tx.getReceipt()
        if (!receipt) throw new Error('Transaction failed')
        
        return {
          ...receipt,
          transactionHash: txid,
        }
      }

      return {
        hash: txid,
        confirmation: confirmation(),
      }
    } catch (error) {
      console.error('Transaction failed:', error)
      throw error
    }
  }

  return {
    address,
    chain: chain || getCurrentNetwork(),
    isConnecting,
    connect,
    disconnect,
    sendTransaction: handleTransaction
  }
} 