'use client'

import { useEffect, useState } from 'react'
import { useWallet, useConnex } from '@vechain/dapp-kit-react'

export function useVeChainDAppKitWallet() {
  const [chain, setChain] = useState<any>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const { account, connect: walletConnect, disconnect: walletDisconnect } = useWallet()
  const { thor, vendor } = useConnex()

  const currentNetwork = {
    id: 0x4a,
    name: 'VeChain',
    token: 'VET',
  }

  useEffect(() => {
    setChain(currentNetwork)
  }, [])

  const connect = async () => {
    try {
      setIsConnecting(true)
      await walletConnect()
      return account
    } catch (error) {
      console.error('Failed to connect:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = async () => {
    try {
      await walletDisconnect()
      return true
    } catch (error) {
      console.error('Failed to disconnect:', error)
      throw error
    }
  }

  const sendTransaction = async (transaction: any) => {
    try {
      if (!vendor) throw new Error('Vendor not available')
      if (!thor) throw new Error('Thor not available')
      
      const { to, data, value = '0x0' } = transaction
      
      // Create a transaction clause
      const clause = {
        to,
        value,
        data,
      }

      // Sign and send the transaction
      const response = await vendor.sign('tx', [clause]).request()
      
      // Wait for transaction to be mined
      const tx = thor.transaction(response.txid)
      await tx.getReceipt()
      
      return response.txid
    } catch (error) {
      console.error('Error signing transaction:', error)
      throw error
    }
  }

  return {
    address: account,
    chain,
    isConnecting,
    connect,
    disconnect,
    sendTransaction
  }
} 