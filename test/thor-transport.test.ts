import { ChainId } from '@revoke.cash/chains';
import { expect } from 'chai';
import { Chain, SupportType } from 'lib/chains/Chain';
import { getLogsProvider } from 'lib/providers';
import { createViemPublicClientForChain, getChainRpcUrl } from 'lib/utils/chains';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { encodeAbiParameters } from 'viem';

const address = '0x0000000000000000000000000000456E65726779';
const owner = '0x0000000000000000000000000000000000000001';
const topic = `0x${'11'.repeat(32)}`;
const blockID = `0x${'22'.repeat(32)}`;
const txID = `0x${'33'.repeat(32)}`;
const balanceOf = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// A local Thor REST server tests the real application boundary, without provider quota.
describe('Direct Thor reads', () => {
  let server: Server;
  let url: string;
  let requests: { path: string; method: string; body: any }[];
  let active: number;
  let maxActive: number;
  let revert: boolean;
  let failLogs: boolean;
  let missingIndexes: boolean;
  let failSecondPage: boolean;
  let wrongNetwork: boolean;
  const event = (index: number) => ({
    address,
    topics: [topic],
    data: '0x',
    meta: { blockID, blockNumber: 12, blockTimestamp: 123456, txID, txIndex: 7, logIndex: index, clauseIndex: 0 },
  });
  beforeEach(async () => {
    requests = [];
    active = maxActive = 0;
    revert = failLogs = missingIndexes = failSecondPage = wrongNetwork = false;
    server = createServer(async (req, res) => {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const body = raw ? JSON.parse(raw) : undefined;
      requests.push({ path: req.url, method: req.method, body });
      maxActive = Math.max(maxActive, ++active);
      await new Promise((resolve) => setTimeout(resolve, 40));
      active--;
      res.setHeader('Content-Type', 'application/json');
      const send = (data: unknown) => res.end(JSON.stringify(data));
      if (req.url === '/blocks/best' || req.url === '/blocks/12') {
        return send({
          number: 12,
          id: blockID,
          parentID: txID,
          timestamp: 123456,
          transactions: [],
          gasLimit: 40000000,
          gasUsed: 100,
          size: 1000,
        });
      }
      if (req.url === '/blocks/0')
        return send({
          id: wrongNetwork ? blockID : '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a',
        });
      if (req.url.startsWith('/accounts/*'))
        return send([
          {
            data: revert ? '0xdeadbeef' : encodeAbiParameters([{ type: 'uint256' }], [42n]),
            reverted: revert,
            vmError: revert ? 'execution reverted' : '',
            gasUsed: 1234,
          },
        ]);
      if (req.url.includes('/code')) return send({ code: '0x1234' });
      if (req.url.startsWith('/accounts/')) return send({ balance: '0x2a', energy: '0x0', hasCode: true });
      if (req.url === '/logs/event') {
        if (failLogs || (failSecondPage && body.options.offset > 0)) {
          res.statusCode = 400;
          return send({ error: 'Invalid filter' });
        }
        if (missingIndexes) return send([{ ...event(0), meta: { ...event(0).meta, txIndex: undefined } }]);
        return send(body.options.offset === 0 ? Array.from({ length: 1000 }, (_, i) => event(i)) : [event(1000)]);
      }
      res.statusCode = 404;
      send({ error: 'This is a Thor REST node, not a JSON-RPC proxy' });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const client = (nodeUrl: string) =>
    new Chain({
      chainId: ChainId.VeChain,
      type: SupportType.PROVIDER,
      rpc: { main: nodeUrl, type: 'thor' },
    }).createViemPublicClient();

  it('uses the public Thor node by default', () => {
    expect(getChainRpcUrl(ChainId.VeChain)).to.equal('https://mainnet.vechain.org');
  });

  it('sends encoded reads directly and allows concurrent requests', async () => {
    const rpc = createViemPublicClientForChain(ChainId.VeChain, url);
    expect(
      await Promise.all([
        rpc.readContract({ address, abi: balanceOf, functionName: 'balanceOf', args: [owner] }),
        rpc.getCode({ address }),
      ]),
    ).to.deep.equal([42n, '0x1234']);
    expect(maxActive).to.equal(2);
    expect(requests.find((r) => r.path.startsWith('/accounts/*'))).to.deep.equal({
      path: '/accounts/*?revision=best',
      method: 'POST',
      body: {
        clauses: [
          {
            to: address,
            value: '0x0',
            data: '0x70a082310000000000000000000000000000000000000000000000000000000000000001',
          },
        ],
      },
    });
  });

  it('maps block, chain, balance and historical call reads', async () => {
    const rpc = client(url);
    expect(await rpc.getChainId()).to.equal(100009);
    expect(await rpc.getBlockNumber()).to.equal(12n);
    const block = await rpc.getBlock({ blockNumber: 12n });
    expect(block.hash).to.equal(blockID);
    expect(block.timestamp).to.equal(123456n);
    expect(await rpc.getBalance({ address: owner })).to.equal(42n);
    expect(
      await rpc.readContract({ address, abi: balanceOf, functionName: 'balanceOf', args: [owner], blockNumber: 12n }),
    ).to.equal(42n);
    expect(requests.some((r) => r.path === '/accounts/*?revision=12')).to.equal(true);
  });

  it('fetches every event page with indexes and preserves filter wildcards', async () => {
    const logs = await getLogsProvider(ChainId.VeChain, url).getLogs({
      address,
      fromBlock: 0,
      toBlock: 12,
      topics: [topic, null, topic],
    });
    expect(logs).to.have.length(1001);
    const pages = requests.filter((r) => r.path === '/logs/event');
    expect(pages.map((r) => r.body.options)).to.deep.equal([
      { offset: 0, limit: 1000, includeIndexes: true },
      { offset: 1000, limit: 1000, includeIndexes: true },
    ]);
    expect(pages[0].body).to.include({ order: 'asc' });
    expect(pages[0].body.range).to.deep.equal({ unit: 'block', from: 0, to: 12 });
    expect(pages[0].body.criteriaSet).to.deep.equal([{ address, topic0: topic, topic2: topic }]);
    expect(logs[1000]).to.include({
      blockHash: blockID,
      transactionHash: txID,
      blockNumber: 12,
      transactionIndex: 7,
      logIndex: 1000,
      timestamp: 123456,
    });
  });

  it('propagates contract reverts with their data', async () => {
    revert = true;
    const [result] = await Promise.allSettled([
      client(url).request(
        { method: 'eth_call', params: [{ to: address, data: '0x1234' }, 'latest'] },
        { retryCount: 0 },
      ),
    ]);
    expect(result.status).to.equal('rejected');
    if (result.status === 'rejected') expect(result.reason.details).to.include('execution reverted');
  });

  it('rejects a node on the wrong network', async () => {
    wrongNetwork = true;
    const [result] = await Promise.allSettled([client(url).getChainId()]);
    expect(result.status).to.equal('rejected');
    if (result.status === 'rejected') expect(result.reason.details).to.include('Wrong network');
  });

  it('expands alternative topics without shifting wildcard positions', async () => {
    await client(url).request({
      method: 'eth_getLogs',
      params: [{ fromBlock: '0x0', toBlock: '0xc', topics: [null, [topic, blockID]] }],
    });
    expect(requests[0].body.criteriaSet).to.deep.equal([{ topic1: topic }, { topic1: blockID }]);
  });

  for (const failure of ['HTTP error', 'missing indexes', 'second page failure']) {
    it(`rejects ${failure} instead of returning incomplete approval history`, async () => {
      failLogs = failure === 'HTTP error';
      missingIndexes = failure === 'missing indexes';
      failSecondPage = failure === 'second page failure';
      const [result] = await Promise.allSettled([
        client(url).request(
          { method: 'eth_getLogs', params: [{ fromBlock: '0x0', toBlock: '0xc' }] },
          { retryCount: 0 },
        ),
      ]);
      expect(result.status).to.equal('rejected');
      if (result.status === 'rejected') {
        expect(result.reason.details).to.include(missingIndexes ? 'omitted event indexes' : 'Invalid filter');
      }
    });
  }
});
