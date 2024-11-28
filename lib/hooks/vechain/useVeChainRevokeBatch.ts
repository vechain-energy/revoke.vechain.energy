import { useCallback, useEffect, useState, useRef } from 'react';
import { AllowanceData, OnUpdate } from 'lib/interfaces';
import { useTransactionStore } from 'lib/stores/transaction-store';
import { getAllowanceKey } from 'lib/utils/allowances';
import { useVeChainWallet } from './useVeChainWallet';
import { isErc721Contract } from 'lib/utils/tokens';
import { ADDRESS_ZERO } from 'lib/constants';
import { encodeFunctionData } from 'viem';

const formatTransactionHash = (hash: string): `0x${string}` => {
  return (hash.startsWith('0x') ? hash : `0x${hash}`) as `0x${string}`;
};

export const useVeChainRevokeBatch = (allowances: AllowanceData[], onUpdate: OnUpdate) => {
  const [isRevoking, setIsRevoking] = useState(false);
  const store = useTransactionStore();
  const { sendTransaction } = useVeChainWallet();
  const initializedRef = useRef(false);

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

  const revokeErc20Allowance = async (allowance: AllowanceData) => {
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

    const clause = {
      to: allowance.contract.address,
      value: '0x0',
      data
    };

    return sendTransaction(clause);
  };

  const revokeErc721Allowance = async (allowance: AllowanceData) => {
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

      const clause = {
        to: allowance.contract.address,
        value: '0x0',
        data
      };

      return sendTransaction(clause);
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

    const clause = {
      to: allowance.contract.address,
      value: '0x0',
      data
    };

    return sendTransaction(clause);
  };

  const revokeAllowance = async (allowance: AllowanceData) => {
    try {
      store.updateTransaction(allowance, { status: 'pending' });
      
      const revokeFunction = isErc721Contract(allowance.contract) 
        ? () => revokeErc721Allowance(allowance)
        : () => revokeErc20Allowance(allowance);

      const transactionSubmitted = await revokeFunction();

      if (transactionSubmitted?.hash) {
        const transactionHash = formatTransactionHash(transactionSubmitted.hash);
        store.updateTransaction(allowance, { 
          status: 'pending', 
          transactionHash
        });

        try {
          // Wait for confirmation
          await transactionSubmitted.confirmation;
          store.updateTransaction(allowance, { 
            status: 'confirmed', 
            transactionHash
          });
          
          // Update allowance data
          onUpdate(allowance, { amount: 0n });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Transaction failed';
          store.updateTransaction(allowance, { 
            status: 'reverted', 
            error: message,
            transactionHash
          });
          throw error;
        }
      }

      return transactionSubmitted;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.toLowerCase().includes('user rejected')) {
        store.updateTransaction(allowance, { status: 'not_started' });
      } else {
        store.updateTransaction(allowance, { 
          status: 'reverted', 
          error: message 
        });
      }
      throw error;
    }
  };

  const revoke = useCallback(async () => {
    setIsRevoking(true);

    try {
      for (let i = 0; i < allowances.length; i++) {
        const allowance = allowances[i];
        if (!allowance.spender) continue;

        try {
          await revokeAllowance(allowance);
        } catch (error) {
          console.error('Failed to revoke allowance:', error);
          // Continue with next allowance even if one fails
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