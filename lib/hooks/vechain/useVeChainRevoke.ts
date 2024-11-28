'use client'

import { AllowanceData, OnUpdate } from 'lib/interfaces'
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
  const { updateTransaction } = useTransactionStore()
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
      data
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
        data
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
      data
    }

    return sendTransaction(clause)
  }

  const revoke = async () => {
    try {
      updateTransaction(allowance, { status: 'pending' })

      const transactionPromise = isErc721Contract(allowance.contract)
        ? revokeErc721Allowance()
        : revokeErc20Allowance()

      const { hash, confirmation } = await transactionPromise

      updateTransaction(allowance, { status: 'submitted', transactionHash: hash })

      const receipt = await confirmation
      updateTransaction(allowance, { status: 'confirmed', transactionHash: hash })

      // Update the allowance data
      const lastUpdated = {
        timestamp: Math.floor(Date.now() / 1000),
        blockNumber: Number(receipt.meta.blockNumber),
        transactionHash: hash
      }

      onUpdate(allowance, { amount: 0n, lastUpdated })

      return { hash, confirmation: Promise.resolve(receipt) }
    } catch (error) {
      console.error('Failed to revoke:', error)
      updateTransaction(allowance, { status: 'reverted', error: error.message })
      throw error
    }
  }

  return { revoke }
} 