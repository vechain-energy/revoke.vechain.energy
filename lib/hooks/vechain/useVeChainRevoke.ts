'use client'

import { useCallback } from 'react'
import { AllowanceData, OnUpdate, TransactionType } from 'lib/interfaces'
import { useTransactionStore } from '../../stores/transaction-store'
import { useVeChainWallet } from './useVeChainWallet'
import { useConnex } from '@vechain/dapp-kit-react'
import { isErc721Contract } from 'lib/utils/tokens'
import { ADDRESS_ZERO } from 'lib/constants'
import { encodeFunctionData } from 'viem'

const ERC20_ABI = [{
  name: 'approve',
  type: 'function',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ],
  outputs: [{ type: 'bool' }],
  stateMutability: 'nonpayable'
}] as const

const ERC721_APPROVE_ABI = [{
  name: 'approve',
  type: 'function',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'tokenId', type: 'uint256' }
  ],
  outputs: [],
  stateMutability: 'nonpayable'
}] as const

const ERC721_APPROVAL_FOR_ALL_ABI = [{
  name: 'setApprovalForAll',
  type: 'function',
  inputs: [
    { name: 'operator', type: 'address' },
    { name: 'approved', type: 'bool' }
  ],
  outputs: [],
  stateMutability: 'nonpayable'
}] as const

export const useVeChainRevoke = (allowance: AllowanceData, onUpdate: OnUpdate) => {
  const store = useTransactionStore()
  const { sendTransaction } = useVeChainWallet()

  if (!allowance.spender) {
    return { revoke: undefined }
  }

  const revokeErc20Allowance = async () => {
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [allowance.spender, 0n]
    })

    const clause = {
      to: allowance.contract.address,
      value: '0x0',
      data,
      comment: `Revoke ${allowance.metadata.symbol} token approval for ${allowance.spender}`
    }

    return sendTransaction(clause)
  }

  const revokeErc721Allowance = async () => {
    if (allowance.tokenId !== undefined) {
      const data = encodeFunctionData({
        abi: ERC721_APPROVE_ABI,
        functionName: 'approve',
        args: [ADDRESS_ZERO, allowance.tokenId]
      })

      const clause = {
        to: allowance.contract.address,
        value: '0x0',
        data,
        comment: `Revoke ${allowance.metadata.symbol} NFT #${allowance.tokenId} approval for ${allowance.spender}`
      }

      return sendTransaction(clause)
    }

    const data = encodeFunctionData({
      abi: ERC721_APPROVAL_FOR_ALL_ABI,
      functionName: 'setApprovalForAll',
      args: [allowance.spender, false]
    })

    const clause = {
      to: allowance.contract.address,
      value: '0x0',
      data,
      comment: `Revoke all ${allowance.metadata.symbol} NFT approvals for ${allowance.spender}`
    }

    return sendTransaction(clause)
  }

  const wrappedRevoke = useCallback(async () => {
    try {
      store.updateTransaction(allowance, { status: 'pending' })
      
      const revokeFunction = isErc721Contract(allowance.contract) 
        ? revokeErc721Allowance 
        : revokeErc20Allowance

      const transactionSubmitted = await revokeFunction()

      if (transactionSubmitted?.hash) {
        store.updateTransaction(allowance, { 
          status: 'pending', 
          transactionHash: `0x${transactionSubmitted.hash}` as `0x${string}` 
        })

        // Wait for confirmation
        await transactionSubmitted.confirmation
        store.updateTransaction(allowance, { 
          status: 'confirmed', 
          transactionHash: `0x${transactionSubmitted.hash}` as `0x${string}` 
        })
      }

      return transactionSubmitted
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.toLowerCase().includes('user rejected')) {
        store.updateTransaction(allowance, { status: 'not_started' })
      } else {
        store.updateTransaction(allowance, { status: 'reverted', error: message })
      }
      throw error
    }
  }, [allowance, store])

  return { revoke: wrappedRevoke }
} 