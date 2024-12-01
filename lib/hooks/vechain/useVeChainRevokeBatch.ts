import { useVeChainWallet } from './useVeChainWallet';
import { AllowanceData, OnUpdate } from 'lib/interfaces';
import { useTransactionStore } from 'lib/stores/transaction-store';
import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { isErc721Contract } from 'lib/utils/tokens';
import { ADDRESS_ZERO } from 'lib/constants';
import { encodeFunctionData } from 'viem';
import { getAllowanceKey } from 'lib/utils/allowances';

const ERC20_ABI = [{
  name: 'approve',
  type: 'function',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ],
  outputs: [{ type: 'bool' }],
  stateMutability: 'nonpayable'
}] as const;

const ERC721_APPROVE_ABI = [{
  name: 'approve',
  type: 'function',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'tokenId', type: 'uint256' }
  ],
  outputs: [],
  stateMutability: 'nonpayable'
}] as const;

const ERC721_APPROVAL_FOR_ALL_ABI = [{
  name: 'setApprovalForAll',
  type: 'function',
  inputs: [
    { name: 'operator', type: 'address' },
    { name: 'approved', type: 'bool' }
  ],
  outputs: [],
  stateMutability: 'nonpayable'
}] as const;

export const useVeChainRevokeBatch = (allowances: AllowanceData[], onUpdate: OnUpdate) => {
  const { sendTransaction } = useVeChainWallet();
  const [isRevoking, setIsRevoking] = useState(false);
  const abortController = useRef<AbortController>();
  const results = useTransactionStore((state) => state.results);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const t = useTranslations();

  const pause = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
    }
  }, []);

  const encodeRevokeData = (allowance: AllowanceData) => {
    if (isErc721Contract(allowance.contract)) {
      if (allowance.tokenId !== undefined) {
        return encodeFunctionData({
          abi: ERC721_APPROVE_ABI,
          functionName: 'approve',
          args: [ADDRESS_ZERO, allowance.tokenId]
        });
      }
      return encodeFunctionData({
        abi: ERC721_APPROVAL_FOR_ALL_ABI,
        functionName: 'setApprovalForAll',
        args: [allowance.spender, false]
      });
    }
    return encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [allowance.spender, 0n]
    });
  };

  const getClauseComment = (allowance: AllowanceData) => {
    if (allowance.tokenId !== undefined) {
      return t('common.revoke.comments.nft_single', {
        symbol: allowance.metadata.symbol,
        tokenId: allowance.tokenId.toString(),
        spender: allowance.spender
      });
    }
    if (isErc721Contract(allowance.contract)) {
      return t('common.revoke.comments.nft_all', {
        symbol: allowance.metadata.symbol,
        spender: allowance.spender
      });
    }
    return t('common.revoke.comments.token', {
      symbol: allowance.metadata.symbol,
      spender: allowance.spender
    });
  };

  const revoke = useCallback(async (useMultiClause: boolean = true) => {
    try {
      setIsRevoking(true);
      abortController.current = new AbortController();

      // Initialize transaction status for all allowances
      allowances.forEach((allowance) => {
        updateTransaction(allowance, { status: 'pending' });
      });

      if (useMultiClause) {
        // Multi-clause transaction
        const clauses = allowances.map(allowance => ({
          to: allowance.contract.address,
          value: '0x0',
          data: encodeRevokeData(allowance),
          comment: getClauseComment(allowance)
        }));

        try {
          const result = await sendTransaction(clauses);
          const receipt = await result.confirmation;

          // Update all allowances after the transaction is confirmed
          for (const allowance of allowances) {
            updateTransaction(allowance, {
              status: 'confirmed',
              transactionHash: receipt.transactionHash
            });

            await onUpdate(allowance, { 
              amount: 0n, 
              lastUpdated: { 
                transactionHash: receipt.transactionHash,
                blockNumber: Number(receipt.blockNumber),
                timestamp: Math.floor(Date.now() / 1000) 
              } 
            });
          }
        } catch (error) {
          // Mark all allowances as reverted if multi-clause transaction fails
          allowances.forEach((allowance) => {
            updateTransaction(allowance, {
              status: 'reverted',
              error: error.message
            });
          });
          throw error;
        }
      } else {
        // Individual transactions
        for (const allowance of allowances) {
          if (abortController.current.signal.aborted) {
            updateTransaction(allowance, {
              status: 'not_started'
            });
            continue;
          }

          try {
            const clause = {
              to: allowance.contract.address,
              value: '0x0',
              data: encodeRevokeData(allowance),
              comment: getClauseComment(allowance)
            };

            const result = await sendTransaction(clause);
            const receipt = await result.confirmation;

            updateTransaction(allowance, {
              status: 'confirmed',
              transactionHash: receipt.transactionHash
            });

            await onUpdate(allowance, { 
              amount: 0n, 
              lastUpdated: { 
                transactionHash: receipt.transactionHash,
                blockNumber: Number(receipt.blockNumber),
                timestamp: Math.floor(Date.now() / 1000) 
              } 
            });
          } catch (error) {
            updateTransaction(allowance, {
              status: 'reverted',
              error: error.message
            });
            // Continue with next allowance even if one fails
          }
        }
      }
    } catch (error) {
      console.error('Batch revoke error:', error);
      throw error;
    } finally {
      setIsRevoking(false);
    }
  }, [allowances, onUpdate, sendTransaction, t, updateTransaction]);

  const isAllConfirmed = allowances.every(
    (allowance) => results[getAllowanceKey(allowance)]?.status === 'confirmed',
  );

  return { revoke, pause, isRevoking, isAllConfirmed, results };
}; 