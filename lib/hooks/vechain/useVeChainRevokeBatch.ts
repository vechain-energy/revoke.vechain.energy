import { useVeChainWallet } from './useVeChainWallet';
import { AllowanceData, OnUpdate } from 'lib/interfaces';
import { useTransactionStore } from 'lib/stores/transaction-store';
import { getAllowanceKey } from 'lib/utils/allowances';
import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

// ERC20 approve function signature
const APPROVE_SIGNATURE = '0x095ea7b3';

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

  const encodeApproveData = (spender: string, amount: string = '0') => {
    // Encode parameters: address (spender) and uint256 (amount)
    const encodedSpender = spender.toLowerCase().replace('0x', '').padStart(64, '0');
    const encodedAmount = amount.padStart(64, '0');
    return `${APPROVE_SIGNATURE}${encodedSpender}${encodedAmount}`;
  };

  const getClauseComment = (allowance: AllowanceData) => {
    if (allowance.tokenId !== undefined) {
      return t('common.revoke.comments.nft_single', {
        symbol: allowance.metadata.symbol,
        tokenId: allowance.tokenId.toString(),
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
          data: encodeApproveData(allowance.spender),
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
              data: encodeApproveData(allowance.spender),
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