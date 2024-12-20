import { ERC20_ABI, ERC721_ABI } from 'lib/abis';
import { DUMMY_ADDRESS, DUMMY_ADDRESS_2 } from 'lib/constants';
import type {
  Balance,
  BaseTokenData,
  Contract,
  Erc20TokenContract,
  Erc721TokenContract,
  Log,
  TokenContract,
  TokenMetadata,
} from 'lib/interfaces';
import { getTokenPrice } from 'lib/price/utils';
import {
  Address,
  PublicClient,
  getAbiItem,
  getAddress,
  getEventSelector,
} from 'viem';
import { deduplicateArray } from '.';
import { withFallback } from './promises';
import { formatFixedPointBigInt } from './formatting';

interface VeChainToken {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  desc?: string;
  icon?: string;
  totalSupply?: string;
}

interface VeChainNFT {
  name: string;
  symbol: string;
  address: string;
  desc?: string;
  icon?: string;
}

let veChainTokens: VeChainToken[] = [];
let veChainNFTs: VeChainNFT[] = [];
let tokensInitialized = false;
let nftsInitialized = false;

export const initVeChainTokens = async () => {
  if (tokensInitialized) return;
  
  try {
    const response = await fetch('https://vechain.github.io/token-registry/main.json');
    veChainTokens = await response.json();
    tokensInitialized = true;
  } catch (error) {
    console.error('Failed to load VeChain token registry:', error);
  }
};

export const initVeChainNFTs = async () => {
  if (nftsInitialized) return;
  
  try {
    const response = await fetch('https://vechain.github.io/nft-registry/main.json');
    veChainNFTs = await response.json();
    nftsInitialized = true;
  } catch (error) {
    console.error('Failed to load VeChain NFT registry:', error);
  }
};

export const getVeChainAssetIcon = async (contract: TokenContract): Promise<string | undefined> => {
  if (isErc721Contract(contract)) {
    await initVeChainNFTs();
    const nft = veChainNFTs.find(t => t.address.toLowerCase() === contract.address.toLowerCase());
    if (!nft?.icon) return undefined;
    return `https://vechain.github.io/nft-registry/${nft.icon}`;
  } else {
    await initVeChainTokens();
    const token = veChainTokens.find(t => t.address.toLowerCase() === contract.address.toLowerCase());
    if (!token?.icon) return undefined;
    return `https://vechain.github.io/token-registry/assets/${token.icon}`;
  }
};

export const isSpamToken = (symbol: string) => {
  const spamRegexes = [
    // Includes http(s)://
    /https?:\/\//i,
    // Includes a TLD (this is not exhaustive, but we can add more TLDs to the list as needed - better than nothing)
    /\.com|\.io|\.xyz|\.org|\.me|\.site|\.net|\.fi|\.vision|\.team|\.app|\.exchange|\.cash|\.finance|\.cc|\.cloud|\.fun|\.wtf|\.game|\.games|\.city|\.claims|\.family|\.events|\.to|\.us|\.vip|\.ly|\.lol|\.biz|\.life|\.pm/i,
    // Includes "www."
    /www\./i,
    // Includes common spam words
    /visit .+ claim|free claim|claim on|airdrop at|airdrop voucher/i,
  ];

  return spamRegexes.some((regex) => regex.test(symbol));
};

export const getTokenData = async (
  contract: TokenContract,
  owner: Address,
  transfersFrom: Log[],
  transfersTo: Log[],
  chainId: number,
): Promise<BaseTokenData> => {
  if (isErc721Contract(contract)) {
    return getErc721TokenData(contract, owner, transfersFrom, transfersTo, chainId);
  }

  return getErc20TokenData(contract, owner, chainId);
};

export const getErc20TokenData = async (
  contract: Erc20TokenContract,
  owner: Address,
  chainId: number,
): Promise<BaseTokenData> => {
  const [metadata, balance] = await Promise.all([
    getTokenMetadata(contract, chainId),
    contract.publicClient.readContract({ ...contract, functionName: 'balanceOf', args: [owner] }),
  ]);

  return { contract, metadata, chainId, owner, balance };
};

export const getErc721TokenData = async (
  contract: Erc721TokenContract,
  owner: Address,
  transfersFrom: Log[],
  transfersTo: Log[],
  chainId: number,
): Promise<BaseTokenData> => {
  const shouldFetchBalance = transfersFrom.length === 0 && transfersTo.length === 0;
  const calculatedBalance = BigInt(transfersTo.length - transfersFrom.length);

  const [metadata, balance] = await Promise.all([
    getTokenMetadata(contract, chainId),
    shouldFetchBalance
      ? withFallback<Balance>(
          contract.publicClient.readContract({ ...contract, functionName: 'balanceOf', args: [owner] }),
          'ERC1155',
        )
      : calculatedBalance,
  ]);

  return { contract, metadata, chainId, owner, balance };
};

export const getTokenMetadata = async (contract: TokenContract, chainId: number): Promise<TokenMetadata> => {
  if (isErc721Contract(contract)) {
    const [symbol, price] = await Promise.all([
      withFallback(contract.publicClient.readContract({ ...contract, functionName: 'name' }), contract.address),
      getTokenPrice(chainId, contract),
      throwIfNotErc721(contract),
      throwIfSpamNft(contract),
    ]);

    if (isSpamToken(symbol)) throw new Error('Token is marked as spam');

    const tokenPrice = price;

    return { symbol, price: tokenPrice, decimals: 0 };
  }

  const [totalSupply, symbol, decimals, price] = await Promise.all([
    contract.publicClient.readContract({ ...contract, functionName: 'totalSupply' }),
    withFallback(contract.publicClient.readContract({ ...contract, functionName: 'symbol' }), contract.address),
    contract.publicClient.readContract({ ...contract, functionName: 'decimals' }),
    getTokenPrice(chainId, contract),
    throwIfNotErc20(contract),
  ]);

  if (isSpamToken(symbol)) throw new Error('Token is marked as spam');

  return { totalSupply, symbol, decimals, price };
};

export const throwIfNotErc20 = async (contract: Erc20TokenContract) => {
  // If the function allowance does not exist it will throw (and is not ERC20)
  const allowance = await contract.publicClient.readContract({
    ...contract,
    functionName: 'allowance',
    args: [DUMMY_ADDRESS, DUMMY_ADDRESS_2],
  });

  // The only acceptable value for checking the allowance from 0x00...01 to 0x00...02 is 0
  // This could happen when the contract is not ERC20 but does have a fallback function
  if (allowance !== 0n) {
    throw new Error('Response to allowance was not 0, indicating that this is not an ERC20 contract');
  }
};

export const throwIfNotErc721 = async (contract: Erc721TokenContract) => {
  // If the function isApprovedForAll does not exist it will throw (and is not ERC721)
  const isApprovedForAll = await contract.publicClient.readContract({
    ...contract,
    functionName: 'isApprovedForAll',
    args: [DUMMY_ADDRESS, DUMMY_ADDRESS_2],
  });

  // The only acceptable value for checking whether 0x00...01 has an allowance set to 0x00...02 is false
  // This could happen when the contract is not ERC721 but does have a fallback function
  if (isApprovedForAll !== false) {
    throw new Error('Response to isApprovedForAll was not false, indicating that this is not an ERC721 contract');
  }
};

// TODO: Improve spam checks
// TODO: Investigate other proxy patterns to see if they result in false positives
export const throwIfSpamNft = async (contract: Contract) => {
  const bytecode = await contract.publicClient.getCode({ address: contract.address });

  // This is technically possible, but I've seen many "spam" NFTs with a very tiny bytecode, which we want to filter out
  if (bytecode.length < 250) {
    // Minimal proxies should not be marked as spam
    if (bytecode.length < 100 && bytecode.endsWith('57fd5bf3')) return;

    throw new Error('Contract bytecode indicates a "spam" token');
  }
};

export const hasZeroBalance = (balance: Balance, decimals?: number) => {
  return balance !== 'ERC1155' && formatFixedPointBigInt(balance, decimals) === '0';
};

export const createTokenContracts = (events: Log[], publicClient: PublicClient): TokenContract[] => {
  return deduplicateArray(events, (a, b) => a.address === b.address)
    .map((event) => createTokenContract(event, publicClient))
    .filter((contract) => contract !== undefined);
};

const createTokenContract = (event: Log, publicClient: PublicClient): TokenContract | undefined => {
  const { address } = event;
  const abi = getTokenAbi(event);
  if (!abi) return undefined;

  return { address, abi, publicClient } as TokenContract;
};

const getTokenAbi = (event: Log): typeof ERC20_ABI | typeof ERC721_ABI | undefined => {
  const Topics = {
    TRANSFER: getEventSelector(getAbiItem({ abi: ERC20_ABI, name: 'Transfer' })),
    APPROVAL: getEventSelector(getAbiItem({ abi: ERC20_ABI, name: 'Approval' })),
    APPROVAL_FOR_ALL: getEventSelector(getAbiItem({ abi: ERC721_ABI, name: 'ApprovalForAll' })),
  };

  if (![Topics.TRANSFER, Topics.APPROVAL, Topics.APPROVAL_FOR_ALL].includes(event.topics[0])) return undefined;
  if (event.topics[0] === Topics.APPROVAL_FOR_ALL) return ERC721_ABI;
  if (event.topics.length === 4) return ERC721_ABI;
  if (event.topics.length === 3) return ERC20_ABI;

  return undefined;
};

export const isErc721Contract = (contract: TokenContract): contract is Erc721TokenContract => {
  return getAbiItem<any, string>({ ...contract, name: 'ApprovalForAll' }) !== undefined;
};

export const isErc20Contract = (contract: TokenContract): contract is Erc20TokenContract => {
  return !isErc721Contract(contract);
};

export const hasSupportForPermit = async (contract: TokenContract): Promise<boolean> => {
  if (!isErc20Contract(contract)) return false;
  
  try {
    // Check if contract has DOMAIN_SEPARATOR function
    const domainSeparator = await contract.publicClient.readContract({
      ...contract,
      functionName: 'DOMAIN_SEPARATOR',
    });
    return !!domainSeparator;
  } catch {
    return false;
  }
};

export const getPermitDomain = async (contract: TokenContract) => {
  if (!isErc20Contract(contract)) return null;
  
  try {
    const domainSeparator = await contract.publicClient.readContract({
      ...contract,
      functionName: 'DOMAIN_SEPARATOR',
    });
    return domainSeparator;
  } catch {
    return null;
  }
};
