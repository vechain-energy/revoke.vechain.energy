import { ChainId } from '@revoke.cash/chains';
import { AVVY_DOMAINS_ABI, UNSTOPPABLE_DOMAINS_ABI } from 'lib/abis';
import {
  ALCHEMY_API_KEY,
  AVVY_DOMAINS_ADDRESS,
  UNSTOPPABLE_DOMAINS_ETH_ADDRESS,
  UNSTOPPABLE_DOMAINS_POLYGON_ADDRESS,
} from 'lib/constants';
import { Address, PublicClient, getAddress, isAddress, namehash } from 'viem';
import { createViemPublicClientForChain } from './chains';

const GlobalClients = {
  ETHEREUM: createViemPublicClientForChain(
    ChainId.EthereumMainnet,
    `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  ),
  POLYGON: createViemPublicClientForChain(
    ChainId.PolygonMainnet,
    `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  ),
  AVALANCHE: createViemPublicClientForChain(ChainId['AvalancheC-Chain'], 'https://api.avax.network/ext/bc/C/rpc'),
};

export const lookupEnsName = async (address: Address): Promise<string | null> => {
  try {
    const name = await GlobalClients.ETHEREUM?.getEnsName({ address });
    return name ?? null;
  } catch {
    return null;
  }
};

export const resolveEnsName = async (name: string): Promise<Address | null> => {
  try {
    const address = await GlobalClients.ETHEREUM?.getEnsAddress({ name: name.toLowerCase() });
    return address ?? null;
  } catch {
    return null;
  }
};

export const lookupUnsName = async (address: Address) => {
  const lookupUnsNameOnClient = (client: PublicClient, contractAddress: Address) =>
    client.readContract({
      abi: UNSTOPPABLE_DOMAINS_ABI,
      address: contractAddress,
      functionName: 'reverseNameOf',
      args: [address],
    });

  try {
    const results = await Promise.allSettled([
      lookupUnsNameOnClient(GlobalClients.ETHEREUM, UNSTOPPABLE_DOMAINS_ETH_ADDRESS),
      lookupUnsNameOnClient(GlobalClients.POLYGON, UNSTOPPABLE_DOMAINS_POLYGON_ADDRESS),
    ]);

    for (const result of results) {
      if (result?.status === 'fulfilled' && result.value) return result.value.toLowerCase();
    }

    return null;
  } catch {
    return null;
  }
};

export const resolveUnsName = async (unsName: string): Promise<Address | null> => {
  const resolveUnsNameOnClient = (client: PublicClient, contractAddress: Address) =>
    client.readContract({
      abi: UNSTOPPABLE_DOMAINS_ABI,
      address: contractAddress,
      functionName: 'getMany',
      args: [['crypto.ETH.address'], BigInt(namehash(unsName))],
    });

  try {
    const results = await Promise.allSettled([
      resolveUnsNameOnClient(GlobalClients.ETHEREUM, UNSTOPPABLE_DOMAINS_ETH_ADDRESS).then((result) => result?.[0]),
      resolveUnsNameOnClient(GlobalClients.POLYGON, UNSTOPPABLE_DOMAINS_POLYGON_ADDRESS).then((result) => result?.[0]),
    ]);

    for (const result of results) {
      if (result?.status === 'fulfilled' && result.value) return getAddress(result.value.toLowerCase());
    }

    return null;
  } catch {
    return null;
  }
};

export const lookupAvvyName = async (address: Address) => {
  try {
    const name = await GlobalClients.AVALANCHE.readContract({
      abi: AVVY_DOMAINS_ABI,
      address: AVVY_DOMAINS_ADDRESS,
      functionName: 'reverseResolveEVMToName',
      args: [address],
    });

    return name || null;
  } catch (err) {
    return null;
  }
};

export const resolveAvvyName = async (avvyName: string): Promise<Address | null> => {
  try {
    const address = await GlobalClients.AVALANCHE.readContract({
      abi: AVVY_DOMAINS_ABI,
      address: AVVY_DOMAINS_ADDRESS,
      functionName: 'resolveStandard',
      args: [avvyName, 3n],
    });

    return getAddress(address?.toLowerCase()) || null;
  } catch (err) {
    return null;
  }
};

// Note that we don't wait for the UNS name to resolve before returning the ENS name
export const lookupDomainName = async (address: Address) => {
  try {
    const unsNamePromise = lookupUnsName(address);
    const avvyNamePromise = lookupAvvyName(address);
    const ensName = await lookupEnsName(address);
    return ensName ?? (await unsNamePromise) ?? (await avvyNamePromise);
  } catch {
    return null;
  }
};

export const resolveVetName = async (name: string): Promise<Address | null> => {
  try {
    const response = await fetch(`https://vet.domains/api/lookup/name/${name}`);
    if (response.ok) {
      const data = await response.json();
      if (isAddress(data.address)) {
        return getAddress(data.address.toLowerCase());
      }
    }
    return null;
  } catch (error) {
    console.error('Error resolving VET domain:', error);
    return null;
  }
};

export const parseInputAddress = async (inputAddressOrName: string): Promise<Address | undefined> => {
  const sanitisedInput = inputAddressOrName.trim().toLowerCase();

  // If it contains a dot, try to resolve it as a VET domain
  if (sanitisedInput.includes('.')) {
    const address = await resolveVetName(sanitisedInput);
    if (address) return address;
  }

  // If it's not a domain or domain resolution failed, check if it's a direct address
  if (isAddress(sanitisedInput)) return getAddress(sanitisedInput);

  return undefined;
};

export const getAddressAndDomainName = async (addressOrName: string) => {
  const address = await parseInputAddress(addressOrName.toLowerCase());
  const isName = addressOrName.toLowerCase() !== address?.toLowerCase();
  const domainName = isName ? addressOrName : await lookupDomainName(address);

  return { address, domainName };
};
