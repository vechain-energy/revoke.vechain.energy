import { useCallback, useEffect, useState, useRef } from 'react';
import { AllowanceData, OnUpdate } from 'lib/interfaces';
import { useTransactionStore } from 'lib/stores/transaction-store';
import { getAllowanceKey } from 'lib/utils/allowances';
import { useVeChainWallet } from './useVeChainWallet';
import { isErc721Contract } from 'lib/utils/tokens';
import { ADDRESS_ZERO } from 'lib/constants';
import { encodeFunctionData } from 'viem';
import { useTranslations } from 'next-intl';

const formatTransactionHash = (hash: string): `0x${string}` => {
  return (hash.startsWith('0x') ? hash : `0x${hash}`) as `0x${string}`;
};

const BATCH_SIZE = 20; // VeChain allows up to 20 clauses per transaction

export const useVeChainRevokeBatch = (allowances: AllowanceData[], onUpdate: OnUpdate) => {
  const [isRevoking, setIsRevoking] = useState(false);
  const store = useTransactionStore();
  const { sendTransaction } = useVeChainWallet();
  const initializedRef = useRef(false);
  const t = useTranslations();

  // Initialize transaction store for all allowances
  useEffect(() => {
    if (!initializedRef.current) {
      allowances.forEach((allowance) => {
        if (!store.results[getAllowanceKey(allowance)]) {
          store.updateTransaction(allowance, { status: 'not_started' }, false);
        }
      });
      initializedRef.current = true;
    }
  }, [allowances, store]);

  const isAllConfirmed = allowances.every(
    (allowance) => store.results[getAllowanceKey(allowance)]?.status === 'confirmed'
  );

  const getErc20RevokeClause = (allowance: AllowanceData) => {
    const data = encodeFunctionData({
      abi: [{
        name: 'approve',
        type: 'function',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }],
        stateMutability: 'nonpayable'
      }],
      functionName: 'approve',
      args: [allowance.spender, 0n]
    });

    return {
      to: allowance.contract.address,
      value: '0x0',
      data,
      comment: t('common.revoke.comments.token', { 
        symbol: allowance.metadata.symbol,
        spender: allowance.spender
      })
    };
  };

  const getErc721RevokeClause = (allowance: AllowanceData) => {
    if (allowance.tokenId !== undefined) {
      const data = encodeFunctionData({
        abi: [{
          name: 'approve',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'tokenId', type: 'uint256' }
          ],
          outputs: [],
          stateMutability: 'nonpayable'
        }],
        functionName: 'approve',
        args: [ADDRESS_ZERO, allowance.tokenId]
      });

      return {
        to: allowance.contract.address,
        value: '0x0',
        data,
        comment: t('common.revoke.comments.nft_single', { 
          symbol: allowance.metadata.symbol,
          tokenId: allowance.tokenId.toString(),
          spender: allowance.spender
        })
      };
    }

    const data = encodeFunctionData({
      abi: [{
        name: 'setApprovalForAll',
        type: 'function',
        inputs: [
          { name: 'operator', type: 'address' },
          { name: 'approved', type: 'bool' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }],
      functionName: 'setApprovalForAll',
      args: [allowance.spender, false]
    });

    return {
      to: allowance.contract.address,
      value: '0x0',
      data,
      comment: t('common.revoke.comments.nft_all', { 
        symbol: allowance.metadata.symbol,
        spender: allowance.spender
      })
    };
  };

  const getRevokeClause = (allowance: AllowanceData) => {
    return isErc721Contract(allowance.contract)
      ? getErc721RevokeClause(allowance)
      : getErc20RevokeClause(allowance);
  };

  const revokeBatch = async (batchAllowances: AllowanceData[]) => {
    // Mark all allowances in batch as pending
    batchAllowances.forEach(allowance => {
      store.updateTransaction(allowance, { status: 'pending' });
    });

    try {
      // Create clauses for all allowances in batch
      const clauses = batchAllowances.map(getRevokeClause);
      
      // Send multi-clause transaction
      const transactionSubmitted = await sendTransaction(clauses);

      if (transactionSubmitted?.hash) {
        const transactionHash = formatTransactionHash(transactionSubmitted.hash);
        
        // Update all allowances with transaction hash
        batchAllowances.forEach(allowance => {
          store.updateTransaction(allowance, { 
            status: 'pending', 
            transactionHash
          });
        });

        try {
          // Wait for confirmation
          await transactionSubmitted.confirmation;
          
          // Update all allowances as confirmed
          batchAllowances.forEach(allowance => {
            store.updateTransaction(allowance, { 
              status: 'confirmed', 
              transactionHash
            });
            // Update allowance data
            onUpdate(allowance, { amount: 0n });
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Transaction failed';
          // Mark all allowances as reverted
          batchAllowances.forEach(allowance => {
            store.updateTransaction(allowance, { 
              status: 'reverted', 
              error: message,
              transactionHash
            });
          });
          throw error;
        }
      }

      return transactionSubmitted;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.toLowerCase().includes('user rejected')) {
        batchAllowances.forEach(allowance => {
          store.updateTransaction(allowance, { status: 'not_started' });
        });
      } else {
        batchAllowances.forEach(allowance => {
          store.updateTransaction(allowance, { 
            status: 'reverted', 
            error: message 
          });
        });
      }
      throw error;
    }
  };

  const revoke = useCallback(async () => {
    setIsRevoking(true);

    try {
      // Filter out allowances without spender
      const validAllowances = allowances.filter(a => a.spender);
      
      // Process allowances in batches
      for (let i = 0; i < validAllowances.length; i += BATCH_SIZE) {
        const batch = validAllowances.slice(i, i + BATCH_SIZE);
        try {
          await revokeBatch(batch);
        } catch (error) {
          console.error('Failed to revoke batch:', error);
          // Continue with next batch even if one fails
        }
      }
    } finally {
      setIsRevoking(false);
    }
  }, [allowances, store, sendTransaction]);

  const pause = useCallback(() => {
    setIsRevoking(false);
  }, []);

  // Create a results object that only includes the relevant allowances
  const relevantResults = Object.fromEntries(
    allowances.map((allowance) => [getAllowanceKey(allowance), store.results[getAllowanceKey(allowance)]])
  );

  return {
    results: relevantResults,
    revoke,
    pause,
    isRevoking,
    isAllConfirmed,
  };
}; 