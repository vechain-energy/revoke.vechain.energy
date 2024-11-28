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

export const CHAIN_SELECT_MAINNETS = [
  ChainId.VeChain,
] as const;

export const CHAIN_SELECT_TESTNETS = [] as const;

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

export const isMainnetChain = (chainId: number): boolean => CHAIN_SELECT_MAINNETS.includes(chainId);
export const isTestnetChain = (chainId: number): boolean => CHAIN_SELECT_TESTNETS.includes(chainId);

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

// Target a default of a round-ish number of tokens, worth around $10-20
export const DEFAULT_DONATION_AMOUNTS = {
  APE: '10',
  ASTR: '250',
  AVAX: '0.5',
  BEAM: '1000',
  BERA: '1', // Can't find price info
  BNB: '0.02',
  BONE: '30',
  BTC: '0.0002',
  BRISE: '200000000',
  BROCK: '200',
  BTT: '10000000',
  CANTO: '1000',
  CELO: '20',
  CET: '200',
  CETT: '1', // Testnet coin
  CHZ: '250',
  CLO: '100000',
  CORE: '10',
  CRAB: '1', // Can't find price info
  CRO: '200',
  DEGEN: '2500',
  DEV: '1', // Testnet coin
  DMT: '0.3',
  DOGE: '100',
  ELA: '10',
  EOS: '30',
  ETC: '1',
  ETH: '0.006',
  FLR: '1000',
  frxETH: '0.006',
  FTM: '20',
  FUSE: '500',
  GHST: '16',
  GLMR: '100',
  GOLDX: '1', // Can't find price info
  IMX: '10',
  INJ: '0.6',
  IOTA: '100',
  IP: '1', // Can't find price info
  KAI: '8000',
  KCS: '2',
  mADA: '50',
  METIS: '0.5',
  MNT: '25',
  MOVR: '1',
  NEON: '50',
  NULS: '40',
  OAS: '200',
  OCTA: '10',
  OKB: '0.5',
  ONE: '1000',
  PALM: '1', // Can't find price info
  PG: '1', // Can't find price info
  PLS: '300000',
  POL: '40',
  PWR: '8000',
  RBTC: '0.0002',
  reETH: '0.006',
  RING: '8000',
  ROSE: '200',
  RSS3: '100',
  SAMA: '3000',
  SDN: '100',
  SEI: '30',
  SGB: '2000',
  SMR: '5000',
  SYS: '100',
  TABI: '1', // Can't find price info
  tBNB: '1', // Testnet coin
  TCRO: '1', // Testnet coin
  tSYS: '1', // Testnet coin
  tZEN: '1', // Testnet coin
  USDC: '10',
  VIC: '30',
  VLX: '1000',
  WAN: '100',
  WEMIX: '20',
  XDAI: '10',
  ZEN: '2',
  ZETA: '20',
};

export const getDefaultDonationAmount = (nativeToken: string): string | undefined => {
  return DEFAULT_DONATION_AMOUNTS[nativeToken];
};
