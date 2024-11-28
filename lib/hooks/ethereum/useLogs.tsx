import { useQuery } from '@tanstack/react-query';
import eventsDB from 'lib/databases/events';
import type { Filter, Log } from 'lib/interfaces';
import { getLogsProvider } from 'lib/providers';
import { useEffect } from 'react';

export const useLogs = (name: string, chainId: number, filter: Filter) => {
  const result = useQuery<Log[], Error>({
    queryKey: ['logs', filter, chainId],
    queryFn: async () => eventsDB.getLogs(getLogsProvider(chainId), filter, chainId),
    refetchOnWindowFocus: false,
    // The same filter should always return the same logs
    staleTime: Infinity,
    enabled: !!chainId && ![filter?.fromBlock, filter?.toBlock, filter?.topics].includes(undefined),
  });

  useEffect(() => {
    if (result.data) console.log(`${name} events`, result.data);
  }, [result.data]);

  return { ...result };
};
