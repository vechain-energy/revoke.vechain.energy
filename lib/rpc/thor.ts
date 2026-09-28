import { ChainId } from '@revoke.cash/chains';
import { HttpRequestError, custom, toHex, type Hex } from 'viem';

export const VECHAIN_NODE_URL = process.env.NEXT_PUBLIC_VECHAIN_NODE_URL || 'https://mainnet.vechain.org';
const EVENT_PAGE_SIZE = 1000;

interface ThorBlock {
  id: Hex;
  parentID: Hex;
  number: number;
  timestamp: number;
  gasLimit: number;
  gasUsed: number;
  size: number;
  transactions: Hex[];
}

interface ThorEvent {
  address: Hex;
  topics: Hex[];
  data: Hex;
  meta: {
    blockID: Hex;
    blockNumber: number;
    blockTimestamp: number;
    txID: Hex;
    txIndex?: number;
    logIndex?: number;
  };
}

interface EventFilter {
  address?: string | string[];
  fromBlock?: string;
  toBlock?: string;
  blockHash?: string;
  topics?: (string | string[] | null)[];
}

const rpcError = (message: string, code = -32602, data?: string) => Object.assign(new Error(message), { code, data });

const revision = (block: string = 'latest'): string => {
  if (block === 'latest') return 'best';
  if (block === 'earliest') return '0';
  if (block === 'finalized') return 'finalized';
  if (typeof block === 'string' && /^0x[0-9a-f]+$/i.test(block)) {
    return block.length === 66 ? block : BigInt(block).toString();
  }
  throw rpcError('Unsupported block revision. Use latest, finalized, or a block number/hash.');
};

// Keep Viem's ABI encoding/decoding while sending reads straight to Thor's REST API.
export const thorTransport = (nodeUrl: string) => {
  const baseUrl = nodeUrl.replace(/\/$/, '');
  const request = async <T>(path: string, body?: object): Promise<T> => {
    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new HttpRequestError({
          url,
          status: response.status,
          headers: response.headers,
          details: await response.text(),
        });
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  const getLogs = async (filter: EventFilter) => {
    if (filter.blockHash) throw rpcError('Use fromBlock and toBlock to query Thor events.');
    const blockNumber = async (block?: string) => {
      const value = revision(block);
      if (/^\d+$/.test(value)) return Number(value);
      return (await request<ThorBlock>(`/blocks/${value}`)).number;
    };
    const from = await blockNumber(filter.fromBlock);
    const to = await blockNumber(filter.toBlock);
    if (from > to) return [];

    let criteriaSet: Record<string, string>[] = filter.address
      ? [filter.address].flat().map((address) => ({ address }))
      : [{}];
    if ((filter.topics?.length ?? 0) > 5) throw rpcError('Thor events support at most five topics.');
    filter.topics?.forEach((topic, index) => {
      if (topic == null) return;
      criteriaSet = criteriaSet.flatMap((criteria) =>
        [topic].flat().map((value) => ({ ...criteria, [`topic${index}`]: value })),
      );
    });
    if (!criteriaSet.length) return [];

    const logs = [];
    for (let offset = 0; ; offset += EVENT_PAGE_SIZE) {
      const page = await request<ThorEvent[]>('/logs/event', {
        range: { unit: 'block', from, to },
        criteriaSet,
        order: 'asc',
        options: { offset, limit: EVENT_PAGE_SIZE, includeIndexes: true },
      });
      for (const event of page) {
        if (!Number.isInteger(event.meta.txIndex) || !Number.isInteger(event.meta.logIndex)) {
          throw rpcError('The node omitted event indexes. You need a Thor node supporting includeIndexes.');
        }
        logs.push({
          address: event.address,
          topics: event.topics,
          data: event.data,
          blockHash: event.meta.blockID,
          blockNumber: toHex(event.meta.blockNumber),
          transactionHash: event.meta.txID,
          transactionIndex: toHex(event.meta.txIndex),
          logIndex: toHex(event.meta.logIndex),
          timestamp: event.meta.blockTimestamp,
          removed: false,
        });
      }
      if (page.length < EVENT_PAGE_SIZE) return logs;
    }
  };

  return custom({
    async request({ method, params = [] }) {
      switch (method) {
        case 'eth_chainId': {
          const genesis = await request<ThorBlock>('/blocks/0');
          if (genesis.id !== '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a') {
            throw rpcError('Wrong network. You need a VeChain mainnet Thor node.');
          }
          return toHex(ChainId.VeChain);
        }
        case 'eth_blockNumber':
          return toHex((await request<ThorBlock>('/blocks/best')).number);
        case 'eth_getBlockByNumber':
        case 'eth_getBlockByHash': {
          if (params[1]) throw rpcError('Expanded transactions are not supported by this read transport.');
          const block = await request<ThorBlock | null>(`/blocks/${revision(params[0])}`);
          if (!block) return null;
          return {
            hash: block.id,
            parentHash: block.parentID,
            number: toHex(block.number),
            timestamp: toHex(block.timestamp),
            gasLimit: toHex(block.gasLimit),
            gasUsed: toHex(block.gasUsed),
            size: toHex(block.size),
            transactions: block.transactions,
          };
        }
        case 'eth_getCode':
          return (await request<{ code: Hex }>(`/accounts/${params[0]}/code?revision=${revision(params[1])}`)).code;
        case 'eth_getBalance':
          return (await request<{ balance: Hex }>(`/accounts/${params[0]}?revision=${revision(params[1])}`)).balance;
        case 'eth_call': {
          if (params.length > 2) throw rpcError('State overrides are not supported by Thor contract reads.');
          const call = params[0];
          const outputs = await request<{ data: Hex; reverted: boolean; vmError: string }[]>(
            `/accounts/*?revision=${revision(params[1])}`,
            {
              clauses: [{ to: call.to ?? null, value: call.value ?? '0x0', data: call.data ?? '0x' }],
              ...(call.from ? { caller: call.from } : {}),
              ...(call.gas ? { gas: Number(BigInt(call.gas)) } : {}),
            },
          );
          const output = outputs[0];
          if (!output) throw rpcError('The Thor node returned no contract result.');
          if (output.reverted) throw rpcError(output.vmError || 'execution reverted', 3, output.data);
          return output.data;
        }
        case 'eth_getLogs':
          return getLogs(params[0]);
        default:
          throw rpcError(`Unsupported read method ${method}. Use the VeChain wallet for transactions.`, 4200);
      }
    },
  });
};
