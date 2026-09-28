import PQueue from 'p-queue';
import { http, type HttpTransport } from 'viem';

const RPC_REQUEST_GAP_MS = 500;

// Shared by log scans, token reads and Wagmi clients in this browser tab/server process.
const queues = new Map<string, { queue: PQueue; nextRequestAt: number }>();

export const throttledHttp = (url: string): HttpTransport => {
  const origin = new URL(url).origin;
  if (!queues.has(origin)) {
    queues.set(origin, { queue: new PQueue({ concurrency: 1 }), nextRequestAt: 0 });
  }
  const state = queues.get(origin)!;

  return (options) => {
    // Keep retries inside the queue slot so backoff also pauses other reads.
    const transport = http(url, { batch: false, retryDelay: 1000 })(options);
    return {
      ...transport,
      request: (args, requestOptions) =>
        state.queue.add(
          async () => {
            const delay = state.nextRequestAt - Date.now();
            if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
            try {
              return await transport.request(args, requestOptions);
            } finally {
              state.nextRequestAt = Date.now() + RPC_REQUEST_GAP_MS;
            }
          },
          { throwOnTimeout: true },
        ),
    };
  };
};
