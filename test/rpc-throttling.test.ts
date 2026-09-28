import { expect } from 'chai';
import { Chain, SupportType } from 'lib/chains/Chain';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';

// Exercise the application's real transport against a local RPC, without spending provider quota.
describe('RPC throttling', () => {
  let server: Server;
  let url: string;
  let starts: number[];
  let finishes: number[];
  let active: number;
  let maxActive: number;
  let failures: number;
  let rateLimits: number;

  beforeEach(async () => {
    starts = [];
    finishes = [];
    active = maxActive = failures = rateLimits = 0;
    server = createServer(async (req, res) => {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { id, method } = JSON.parse(body);
      starts.push(Date.now());
      maxActive = Math.max(maxActive, ++active);
      await new Promise((resolve) => setTimeout(resolve, 80));
      active--;
      finishes.push(Date.now());
      res.setHeader('Content-Type', 'application/json');
      if (rateLimits > 0) {
        rateLimits--;
        res.writeHead(429, { 'Retry-After': '1' });
        res.end(JSON.stringify({ error: 'Too many requests' }));
        return;
      }
      if (failures > 0) {
        failures--;
        res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Invalid params' } }));
        return;
      }
      res.end(JSON.stringify({ jsonrpc: '2.0', id, result: method === 'eth_getLogs' ? [] : '0x4a' }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  const client = (url: string) =>
    new Chain({ chainId: 74, type: SupportType.PROVIDER, rpc: { main: url } }).createViemPublicClient();

  it('serializes reads across clients and RPC paths with a gap after completion', async () => {
    const main = client(`${url}/rpc`);
    const logs = client(`${url}/logs`);
    const results = await Promise.all([
      main.getChainId(),
      logs.request({ method: 'eth_getLogs', params: [{}] }),
      main.getBlockNumber(),
    ]);
    expect(results).to.deep.equal([74, [], 74n]);
    expect(maxActive).to.equal(1);
    for (let i = 1; i < starts.length; i++) expect(starts[i] - finishes[i - 1]).to.be.at.least(480);
  });

  it('continues the queue after a failed request without a burst', async () => {
    failures = 1;
    const rpc = client(url);
    const results = await Promise.allSettled([rpc.getChainId(), rpc.getBlockNumber()]);
    expect(results[0].status).to.equal('rejected');
    expect(results[1]).to.deep.equal({ status: 'fulfilled', value: 74n });
    expect(maxActive).to.equal(1);
    expect(starts[1] - finishes[0]).to.be.at.least(480);
  });

  it('keeps other reads queued while retrying a rate-limited request', async () => {
    rateLimits = 1;
    const rpc = client(url);
    expect(await Promise.all([rpc.getChainId(), rpc.getBlockNumber()])).to.deep.equal([74, 74n]);
    expect(starts).to.have.length(3);
    expect(maxActive).to.equal(1);
    expect(starts[1] - finishes[0]).to.be.at.least(980);
    expect(starts[2] - finishes[1]).to.be.at.least(480);
  });
});
