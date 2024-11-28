'use client'

import { useVeChainDAppKitWallet } from './useVeChainDAppKit'
import { getCurrentNetwork } from '../../utils/vechain'
import { useConnex } from '@vechain/dapp-kit-react'

const POLL_INTERVAL = 3000; // 3 seconds
const MAX_ATTEMPTS = 20; // 1 minute total

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        
        try {
          // Poll for transaction receipt
          let attempts = 0;
          let receipt = null;
          
          while (attempts < MAX_ATTEMPTS) {
            const tx = thor.transaction(txid)
            receipt = await tx.getReceipt()
            
            if (receipt) {
              if (receipt.reverted) {
                throw new Error('Transaction reverted')
              }
              return {
                ...receipt,
                transactionHash: txid,
              }
            }
            
            attempts++;
            await sleep(POLL_INTERVAL);
          }
          
          throw new Error('Transaction confirmation timeout')
        } catch (error) {
          console.error('Transaction confirmation failed:', error)
          throw new Error(error instanceof Error ? error.message : 'Transaction failed')
        }
      }

      return {
        hash: txid,
        confirmation: confirmation(),
      }
    } catch (error) {
      console.error('Transaction failed:', error)
      throw error instanceof Error ? error : new Error('Transaction failed')
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