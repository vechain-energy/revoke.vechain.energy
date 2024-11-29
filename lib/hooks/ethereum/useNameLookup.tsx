import { useQuery } from '@tanstack/react-query';
import { DAY } from 'lib/utils/time';
import { resolveVetName } from 'lib/utils/whois';
import { Address } from 'viem';

export const useNameLookup = (address: Address | undefined) => {
  const { data: domainName, isLoading } = useQuery({
    queryKey: ['domainName', address, { persist: true }],
    queryFn: async () => {
      if (!address) return null;
      return resolveVetName(address);
    },
    enabled: !!address,
    gcTime: 7 * DAY,
    staleTime: 5 * DAY,
  });

  return { domainName, isLoading };
};
