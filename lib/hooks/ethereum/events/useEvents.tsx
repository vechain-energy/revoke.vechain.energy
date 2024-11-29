import { ERC721_ABI } from 'lib/abis';
import { addressToTopic } from 'lib/utils';
import { useMemo } from 'react';
import { Address, getAbiItem, toEventSelector } from 'viem';
import { useLogsFullBlockRange } from '../useLogsFullBlockRange';
import { usePermit2Events } from './usePermit2Events';

export const useEvents = (address: Address, chainId: number) => {
  const getErc721EventSelector = (eventName: 'Transfer' | 'Approval' | 'ApprovalForAll') => {
    return toEventSelector(getAbiItem({ abi: ERC721_ABI, name: eventName }));
  };

  const addressTopic = address ? addressToTopic(address) : undefined;
  const transferToTopics = addressTopic && [getErc721EventSelector('Transfer'), null, addressTopic];
  const transferFromTopics = addressTopic && [getErc721EventSelector('Transfer'), addressTopic];
  const approvalTopics = addressTopic && [getErc721EventSelector('Approval'), addressTopic];
  const approvalForAllTopics = addressTopic && [getErc721EventSelector('ApprovalForAll'), addressTopic];

  const {
    data: transferTo,
    isLoading: isTransferToLoading,
    error: transferToError,
  } = useLogsFullBlockRange('Transfer (to)', chainId, { topics: transferToTopics });

  const {
    data: transferFrom,
    isLoading: isTransferFromLoading,
    error: transferFromError,
  } = useLogsFullBlockRange('Transfer (from)', chainId, { topics: transferFromTopics });

  const {
    data: approval,
    isLoading: isApprovalLoading,
    error: approvalError,
  } = useLogsFullBlockRange('Approval', chainId, { topics: approvalTopics });

  const {
    data: approvalForAll,
    isLoading: isApprovalForAllLoading,
    error: approvalForAllError,
  } = useLogsFullBlockRange('ApprovalForAll', chainId, { topics: approvalForAllTopics });

  const {
    events: permit2Approval,
    isLoading: isPermit2ApprovalLoading,
    error: permit2ApprovalError,
  } = usePermit2Events(address, chainId);

  const isEventsLoading = isTransferFromLoading || isTransferToLoading || isApprovalLoading || isApprovalForAllLoading;
  const isLoading = isEventsLoading || isPermit2ApprovalLoading;
  const eventsError = transferFromError || transferToError || approvalError || approvalForAllError;
  const error = eventsError || permit2ApprovalError;

  const events = useMemo(() => {
    if (!transferFrom || !transferTo || !approval || !approvalForAll || !permit2Approval) return undefined;
    if (error || isLoading) return undefined;
    return { transferFrom, transferTo, approval, approvalForAll, permit2Approval };
  }, [transferFrom, transferTo, approval, approvalForAll, permit2Approval, error, isLoading]);

  return { events, isLoading, error };
};
