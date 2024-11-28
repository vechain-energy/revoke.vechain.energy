import { ChainId } from '@revoke.cash/chains';
import { ALCHEMY_API_KEY, INFURA_API_KEY } from 'lib/constants';
import { RateLimit } from 'lib/interfaces';
import { AggregatePriceStrategy, AggregationType } from 'lib/price/AggregatePriceStrategy';
import { HardcodedPriceStrategy } from 'lib/price/HardcodedPriceStrategy';
import { PriceStrategy } from 'lib/price/PriceStrategy';
import { UniswapV2PriceStrategy } from 'lib/price/UniswapV2PriceStrategy';
import { UniswapV3ReadonlyPriceStrategy } from 'lib/price/UniswapV3ReadonlyPriceStrategy';
import { AddEthereumChainParameter, PublicClient, Chain as ViemChain, toHex } from 'viem';
import { Chain, SupportType } from '../chains/Chain';

// Make sure to update these lists when updating the above lists
// Order is loosely based on TVL (as per DeFiLlama)

export const CHAIN_SELECT_MAINNETS = [ChainId.VeChain] as const;

export const CHAIN_SELECT_TESTNETS: number[] = [] as const;

export const ORDERED_CHAINS = [...CHAIN_SELECT_MAINNETS, ...CHAIN_SELECT_TESTNETS];

const MULTICALL = {
  multicall3: {
    address: '0xcA11bde05977b3631167028862bE2a173976CA11' as const,
  },
};

export const CHAINS: Record<number, Chain> = {
  [ChainId.VeChain]: new Chain({
    type: SupportType.PROVIDER,
    chainId: ChainId.VeChain,
    name: 'VeChain',
    nativeToken: 'VET',
    logoUrl: '/assets/images/vendor/chains/vechain.svg',
    rpc: {
      main: `https://rpc-mainnet.vechain.energy`,
    },
    //    deployedContracts: { ...MULTICALL },
    isTestnet: false,
    correspondingMainnetChainId: ChainId.VeChain,
  }),
};

export const SUPPORTED_CHAINS = Object.values(CHAINS)
  .filter((chain) => chain.isSupported())
  .map((chain) => chain.chainId);

export const ETHERSCAN_SUPPORTED_CHAINS = Object.values(CHAINS)
  .filter((chain) => chain.type === SupportType.ETHERSCAN_COMPATIBLE)
  .map((chain) => chain.chainId);

export const getChainConfig = (chainId: number): Chain | undefined => {
  return CHAINS[chainId];
};

// TODO: All these functions below are kept for backwards compatibility and should be removed in the future in favor of getChainConfig

export const isSupportedChain = (chainId: number): boolean => {
  return Boolean(getChainConfig(chainId)?.isSupported());
};

export const isBackendSupportedChain = (chainId: number): boolean => {
  const chain = getChainConfig(chainId);
  return Boolean(chain) && chain.isSupported() && chain.type !== SupportType.PROVIDER;
};

export const isProviderSupportedChain = (chainId: number): boolean => {
  return getChainConfig(chainId)?.type === SupportType.PROVIDER;
};

export const isCovalentSupportedChain = (chainId: number): boolean => {
  return getChainConfig(chainId)?.type === SupportType.COVALENT;
};

export const isEtherscanSupportedChain = (chainId: number): boolean => {
  return getChainConfig(chainId)?.type === SupportType.ETHERSCAN_COMPATIBLE;
};

export const isNodeSupportedChain = (chainId: number): boolean => {
  return getChainConfig(chainId)?.type === SupportType.BACKEND_NODE;
};

export const isMainnetChain = (chainId: number): boolean => CHAIN_SELECT_MAINNETS.includes(chainId as typeof CHAIN_SELECT_MAINNETS[number]);
export const isTestnetChain = (chainId: number): boolean => CHAIN_SELECT_TESTNETS.includes(chainId as typeof CHAIN_SELECT_TESTNETS[number]);

export const getChainName = (chainId: number): string | undefined => {
  return getChainConfig(chainId)?.getName();
};

export const getChainSlug = (chainId: number): string | undefined => {
  return getChainConfig(chainId)?.getSlug();
};

const REVERSE_CHAIN_SLUGS: Record<string, number> = Object.fromEntries(
  SUPPORTED_CHAINS.map((chainId) => [getChainSlug(chainId), chainId]),
);

export const getChainIdFromSlug = (slug: string): number | undefined => {
  return REVERSE_CHAIN_SLUGS[slug];
};

export const getChainExplorerUrl = (chainId: number): string | undefined => {
  return getChainConfig(chainId)?.getExplorerUrl();
};

// This is used on the "Add a network" page
export const getChainFreeRpcUrl = (chainId: number): string | undefined => {
  return getChainConfig(chainId)?.getFreeRpcUrl();
};

export const getChainRpcUrl = (chainId: number): string | undefined => {
  return getChainConfig(chainId)?.getRpcUrl();
};

export const getChainRpcUrls = (chainId: number): string[] | undefined => {
  return getChainConfig(chainId)?.getRpcUrls();
};

export const getChainLogsRpcUrl = (chainId: number): string | undefined => {
  return getChainConfig(chainId)?.getLogsRpcUrl();
};

export const getChainLogo = (chainId: number): string | undefined => {
  return getChainConfig(chainId)?.getLogoUrl();
};

export const getChainInfoUrl = (chainId: number): string | undefined => {
  return getChainConfig(chainId)?.getInfoUrl();
};

export const getChainNativeToken = (chainId: number): string => {
  return getChainConfig(chainId)?.getNativeToken();
};

export const getChainApiUrl = (chainId: number): string | undefined => {
  return getChainConfig(chainId)?.getEtherscanCompatibleApiUrl();
};

export const getChainApiKey = (chainId: number): string | undefined => {
  return getChainConfig(chainId)?.getEtherscanCompatibleApiKey();
};

export const getChainApiRateLimit = (chainId: number): RateLimit => {
  return getChainConfig(chainId)?.getEtherscanCompatibleApiRateLimit();
};

export const getChainApiIdentifer = (chainId: number): string => {
  return getChainConfig(chainId)?.getEtherscanCompatibleApiIdentifier();
};

export const getCorrespondingMainnetChainId = (chainId: number): number | undefined => {
  return getChainConfig(chainId)?.getCorrespondingMainnetChainId();
};

export const getChainDeployedContracts = (chainId: number): any | undefined => {
  return getChainConfig(chainId)?.getDeployedContracts();
};

export const getViemChainConfig = (chainId: number): ViemChain | undefined => {
  return getChainConfig(chainId)?.getViemChainConfig();
};

export const createViemPublicClientForChain = (chainId: number, url?: string): PublicClient | undefined => {
  return getChainConfig(chainId)?.createViemPublicClient(url);
};

export const getChainAddEthereumChainParameter = (chainId: number): AddEthereumChainParameter | undefined => {
  return getChainConfig(chainId)?.getAddEthereumChainParameter();
};

export const getChainPriceStrategy = (chainId: number): PriceStrategy | undefined => {
  return getChainConfig(chainId)?.getPriceStrategy();
};

export const getChainBackendPriceStrategy = (chainId: number): PriceStrategy | undefined => {
  return getChainConfig(chainId)?.getBackendPriceStrategy();
};
