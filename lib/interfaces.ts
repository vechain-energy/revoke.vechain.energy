import { ERC20_ABI, ERC721_ABI } from 'lib/abis';
import { Abi, Address, Hash, Hex, PublicClient, TransactionReceipt, WalletClient } from 'viem';
import type { useAllowances } from './hooks/ethereum/useAllowances';

export type Balance = bigint | 'ERC1155';

export interface BaseTokenData {
  contract: Erc20TokenContract | Erc721TokenContract;
  metadata: TokenMetadata;
  chainId: number;
  owner: Address;
  balance: Balance;
}

export interface BaseAllowanceData {
  spender: Address;
  lastUpdated: TimeLog;
  amount?: bigint; // Only for ERC20 tokens
  tokenId?: bigint; // Only for ERC721 tokens (single token)
  permit2Address?: Address; // Only for Permit2 allowances
  expiration?: number; // Only for Permit2 allowances
}

export interface AllowanceData extends BaseTokenData {
  spender?: Address;
  lastUpdated?: TimeLog;
  amount?: bigint; // Only for ERC20 tokens
  tokenId?: bigint; // Only for ERC721 tokens (single token)
  permit2Address?: Address; // Only for Permit2 allowances
  expiration?: number; // Only for Permit2 allowances
}

export interface PermitTokenData extends BaseTokenData {
  lastCancelled?: TimeLog;
}

export interface TokenFromList {
  symbol: string;
  decimals?: number;
  logoURI?: string;
  isSpam?: boolean;
}

export interface TokenMapping {
  [chainId: string]: ChainTokenMapping;
}

export interface ChainTokenMapping {
  [index: string]: TokenFromList;
}

export type TokenStandard = 'ERC20' | 'ERC721';

export interface LogsProvider {
  chainId: number;
  getLogs(filter: Filter): Promise<Array<Log>>;
}

export type StateSetter<T> = React.Dispatch<React.SetStateAction<T | undefined>>;

export interface Log {
  address: Address;
  topics: [topic0: Hex, ...rest: Hex[]];
  data: Hex;
  transactionHash: Hash;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
  timestamp?: number;
}

export interface ApprovalEvent {
  rawLog: Log;
  token: Address;
  chainId: number;
  owner: Address;
  spender: Address;
  time: TimeLog;
  amount?: bigint; // Only for ERC20 tokens
  tokenId?: bigint; // Only for ERC721 tokens (single token)
  approved?: boolean; // Only for ERC721 tokens (approval for all)
  expiration?: number; // Only for Permit2 allowances
}

export type TimeLog = Pick<Log, 'transactionHash' | 'blockNumber' | 'timestamp'>;

export interface RateLimit {
  interval: number;
  intervalCap: number;
  timeout?: number;
}

export interface AddressEvents {
  transferFrom: Log[];
  transferTo: Log[];
  approval: Log[];
  approvalForAll: Log[];
  permit2Approval: Log[]; // Note that this combines Approval, Permit and Lockdown events
}

export interface Filter {
  address?: Address;
  topics: string[];
  fromBlock: number;
  toBlock: number;
}

export enum TransactionType {
  REVOKE = 'revoke',
  UPDATE = 'update',
  PERMIT = 'permit',
  PERMIT2 = 'permit2',
  PERMIT2_BATCH = 'permit2_batch',
  PERMIT2_ALLOWANCE = 'permit2_allowance',
  PERMIT2_LOCKDOWN = 'permit2_lockdown',
  PERMIT2_NONCE = 'permit2_nonce',
  PERMIT2_TRANSFER = 'permit2_transfer',
  PERMIT2_TRANSFER_BATCH = 'permit2_transfer_batch',
  PERMIT2_TRANSFER_FROM = 'permit2_transfer_from',
  PERMIT2_TRANSFER_FROM_BATCH = 'permit2_transfer_from_batch',
  PERMIT2_WITHDRAW = 'permit2_withdraw',
  PERMIT2_WITHDRAW_BATCH = 'permit2_withdraw_batch',
  PERMIT2_WITHDRAW_FROM = 'permit2_withdraw_from',
  PERMIT2_WITHDRAW_FROM_BATCH = 'permit2_withdraw_from_batch',
  PERMIT2_CANCEL = 'permit2_cancel',
  PERMIT2_CANCEL_BATCH = 'permit2_cancel_batch',
  PERMIT2_CANCEL_NONCE = 'permit2_cancel_nonce',
  PERMIT2_CANCEL_NONCE_BATCH = 'permit2_cancel_nonce_batch',
  PERMIT2_CANCEL_TRANSFER = 'permit2_cancel_transfer',
  PERMIT2_CANCEL_TRANSFER_BATCH = 'permit2_cancel_transfer_batch',
  PERMIT2_CANCEL_TRANSFER_FROM = 'permit2_cancel_transfer_from',
  PERMIT2_CANCEL_TRANSFER_FROM_BATCH = 'permit2_cancel_transfer_from_batch',
  PERMIT2_CANCEL_WITHDRAW = 'permit2_cancel_withdraw',
  PERMIT2_CANCEL_WITHDRAW_BATCH = 'permit2_cancel_withdraw_batch',
  PERMIT2_CANCEL_WITHDRAW_FROM = 'permit2_cancel_withdraw_from',
  PERMIT2_CANCEL_WITHDRAW_FROM_BATCH = 'permit2_cancel_withdraw_from_batch',
}

export interface MarketplaceConfig {
  name: string;
  logo: string;
  chains: number[];
  cancelSignatures: (walletClient: WalletClient) => Promise<Hash>;
  getFilter: (address: Address) => Pick<Filter, 'address' | 'topics'>;
  approvalFilterAddress: Address;
}

export interface Marketplace {
  name: string;
  logo: string;
  chainId: number;
  lastCancelled?: TimeLog;
  cancelSignatures: (walletClient: WalletClient) => Promise<Hash>;
  allowances: AllowanceData[];
}

export interface ISidebarEntry {
  path: string;
  title: string;
  description?: string;
  coverImage?: string;
  children?: ISidebarEntry[];
  date?: string;
  readingTime?: number;
}

export interface ContentMeta {
  title: string;
  sidebarTitle?: string;
  description: string;
  language: string;
  author?: Person;
  translator?: Person;
  coverImage?: string;
  date?: string;
  readingTime?: number;
  overlay?: boolean;
}

export interface Person {
  name: string;
  url?: string;
}

export interface RawContentFile {
  content: string;
  language: string;
}

export interface ContentFile {
  content: string;
  meta: ContentMeta;
}

export interface BreadcrumbEntry {
  name: string;
  href?: string;
}

export interface SpenderData extends SpenderRiskData {
  name: string;
}

export interface SpenderRiskData {
  name?: string;
  riskFactors?: Array<RiskFactor>;
}

export interface RiskFactor {
  type: string;
  source: string;
  data?: string;
}

export type RiskLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface Contract {
  address: Address;
  abi: Abi;
  publicClient: PublicClient;
}

export type TokenContract = Erc20TokenContract | Erc721TokenContract;

export interface Erc20TokenContract extends Contract {
  abi: typeof ERC20_ABI;
}

export interface Erc721TokenContract extends Contract {
  abi: typeof ERC721_ABI;
}

export interface TokenMetadata {
  // name: string;
  symbol: string;
  icon?: string;
  decimals?: number;
  totalSupply?: bigint;
  price?: number;
}

export type OnUpdate = ReturnType<typeof useAllowances>['onUpdate'];
export type OnCancel<T> = (data: T, lastCancelled: TimeLog) => Promise<void>;

export interface EtherscanPlatform {
  domain: string;
  subdomain?: string;
}

export type TransactionStatus = 'not_started' | 'pending' | 'confirmed' | 'reverted';

export interface TransactionSubmitted {
  hash: Hash;
  confirmation: Promise<TransactionReceipt | undefined>;
}
