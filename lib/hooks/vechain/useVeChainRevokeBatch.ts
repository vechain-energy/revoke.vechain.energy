import { useVeChainWallet } from './useVeChainWallet';
import { AllowanceData, OnUpdate } from 'lib/interfaces';
import { useTransactionStore } from 'lib/stores/transaction-store';
import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { isErc721Contract } from 'lib/utils/tokens';
import { ADDRESS_ZERO } from 'lib/constants';
import { encodeFunctionData, decodeErrorResult } from 'viem';
import { getAllowanceKey } from 'lib/utils/allowances';
import { useConnex } from '@vechain/dapp-kit-react';

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

const BATCH_SIZE = 3;

const processBatch = async <T>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<any>
): Promise<any[]> => {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
};

const ERROR_ABI = [{
  inputs: [{ name: 'message', type: 'string' }],
  name: 'Error',
  type: 'error'
}] as const;

export const useVeChainRevokeBatch = (allowances: AllowanceData[], onUpdate: OnUpdate) => {
  const { sendTransaction, address } = useVeChainWallet();
  const [isRevoking, setIsRevoking] = useState(false);
  const abortController = useRef<AbortController>();
  const results = useTransactionStore((state) => state.results);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const t = useTranslations();
  const { thor } = useConnex();

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

  const simulateClause = async (allowance: AllowanceData) => {
    try {
      const data = encodeRevokeData(allowance);
      const explainer = thor.explain([{
        to: allowance.contract.address,
        value: '0x0',
        data
      }]).caller(address);
      
      const results = await explainer.execute();
      const result = results[0];
      
      if (result.reverted) {
        let errorMessage = 'Unknown error';
        try {
          // Try to decode the revert data
          if (result.data.startsWith('0x08c379a0')) {
            const decodedError = decodeErrorResult({
              abi: ERROR_ABI,
              data: result.data as `0x${string}`
            });
            errorMessage = decodedError.args[0] || 'Unknown error';
          }
        } catch (decodeError) {
          console.error('Error decoding revert data:', decodeError);
          errorMessage = result.data;
        }

        console.error(`Simulation failed for ${allowance.metadata.symbol}:`, errorMessage);
        updateTransaction(allowance, {
          status: 'reverted',
          error: errorMessage
        });
        return { success: false, error: errorMessage };
      }
      return { success: true };
    } catch (error) {
      console.error(`Simulation failed for ${allowance.metadata.symbol}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Simulation failed';
      updateTransaction(allowance, {
        status: 'reverted',
        error: errorMessage
      });
      return { success: false, error: errorMessage };
    }
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
        // Simulate each clause in batches
        const simulationResults = await processBatch(
          allowances,
          BATCH_SIZE,
          async (allowance) => ({
            allowance,
            ...await simulateClause(allowance)
          })
        );

        // Filter out failed simulations
        const validAllowances = simulationResults
          .filter(result => result.success)
          .map(result => result.allowance);

        const failedAllowances = simulationResults
          .filter(result => !result.success)
          .map(result => ({
            allowance: result.allowance,
            error: result.error
          }));

        if (validAllowances.length === 0) {
          // Instead of throwing, update all allowances with their specific errors
          failedAllowances.forEach(({ allowance, error }) => {
            updateTransaction(allowance, {
              status: 'reverted',
              error: `${allowance.metadata.symbol}: ${error}`
            });
          });
          return;
        }

        // If some allowances failed but others succeeded, keep the specific error messages
        if (failedAllowances.length > 0) {
          failedAllowances.forEach(({ allowance, error }) => {
            updateTransaction(allowance, {
              status: 'reverted',
              error: `${allowance.metadata.symbol}: ${error}`
            });
          });
        }

        // Multi-clause transaction with only valid clauses
        const clauses = validAllowances.map(allowance => ({
          to: allowance.contract.address,
          value: '0x0',
          data: encodeRevokeData(allowance),
          comment: getClauseComment(allowance)
        }));

        try {
          const result = await sendTransaction(clauses);
          const receipt = await result.confirmation;

          // Update all allowances after the transaction is confirmed
          for (const allowance of validAllowances) {
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
          validAllowances.forEach((allowance) => {
            updateTransaction(allowance, {
              status: 'reverted',
              error: error instanceof Error ? error.message : 'Transaction failed'
            });
          });
          return;
        }
      } else {
        // Individual transactions in batches
        await processBatch(allowances, BATCH_SIZE, async (allowance) => {
          if (abortController.current.signal.aborted) {
            updateTransaction(allowance, {
              status: 'not_started'
            });
            return;
          }

          try {
            // Simulate first
            const isValid = await simulateClause(allowance);
            if (!isValid) return;

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
              error: error instanceof Error ? error.message : 'Transaction failed'
            });
            // Continue with next allowance even if one fails
          }
        });
      }
    } catch (error) {
      // Update all allowances with the error instead of throwing
      allowances.forEach((allowance) => {
        updateTransaction(allowance, {
          status: 'reverted',
          error: error instanceof Error ? error.message : 'Unexpected error occurred'
        });
      });
    } finally {
      setIsRevoking(false);
    }
  }, [allowances, onUpdate, sendTransaction, t, updateTransaction, thor]);

  const isAllConfirmed = allowances.every(
    (allowance) => results[getAllowanceKey(allowance)]?.status === 'confirmed',
  );

  return { revoke, pause, isRevoking, isAllConfirmed, results };
}; 