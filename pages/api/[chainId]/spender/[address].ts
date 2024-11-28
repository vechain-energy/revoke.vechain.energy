import { WEBACY_API_KEY } from 'lib/constants';
import { AggregateSpenderDataSource, AggregationType } from 'lib/whois/spender/AggregateSpenderDataSource';
import { WhoisSpenderDataSource } from 'lib/whois/spender/label/WhoisSpenderDataSource';
import { OnchainSpenderRiskDataSource } from 'lib/whois/spender/risk/OnchainSpenderRiskDataSource';
import { WebacySpenderRiskDataSource } from 'lib/whois/spender/risk/WebacySpenderRiskDataSource';
import { NextRequest } from 'next/server';
import { Address } from 'viem';

export const config = {
  runtime: 'edge',
};

const SPENDER_DATA_SOURCE = new AggregateSpenderDataSource({
  aggregationType: AggregationType.PARALLEL_COMBINED,
  sources: [
    new WhoisSpenderDataSource(),
    new OnchainSpenderRiskDataSource(),
    new WebacySpenderRiskDataSource(WEBACY_API_KEY),
  ],
});

const handler = async (req: NextRequest) => {
  if (req.method !== 'GET') return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405 });

  const query = new URL(req.url).searchParams;
  const chainId = Number.parseInt(query.get('chainId') as string, 10);
  const address = query.get('address') as Address;

  try {
    const spenderData = await SPENDER_DATA_SOURCE.getSpenderData(address, chainId);

    return new Response(JSON.stringify(spenderData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${60 * 60}`, // 1 hour browser cache (mostly for localhost)
        'Vercel-CDN-Cache-Control': `s-maxage=${60 * 60 * 24}`, // 1 day (server CDN cache)
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ message: e.message }), { status: 500 });
  }
};

export default handler;
