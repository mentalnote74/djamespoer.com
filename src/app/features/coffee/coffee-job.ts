// [Larry] SCRUM-215: short requests around a durable comparison, not a long PSI socket.
import type { CoffeeResponse, CoffeeErrorType } from './coffee-contract';
export async function runCoffeeJob(
  body: unknown,
  signal: AbortSignal,
  onState: (state: string) => void,
): Promise<CoffeeResponse | CoffeeErrorType> {
  let id: string | undefined;
  let cancelSent = false;
  const canceled = () => {
    if (id && !cancelSent) {
      cancelSent = true;
      void fetch('/api/coffee/jobs/' + id, { method: 'DELETE', keepalive: true }).catch(() => {});
    }
  };
  signal.addEventListener('abort', canceled, { once: true });
  try {
    const created = await fetch('/api/coffee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    const initial = (await created.json()) as { id?: string; error?: CoffeeErrorType };
    if (!created.ok || !initial.id) return initial.error ?? 'runner_unavailable';
    id = initial.id;
    for (;;) {
      signal.throwIfAborted();
      const response = await fetch('/api/coffee/jobs/' + id, { signal, cache: 'no-store' });
      const data = (await response.json()) as {
        state: string;
        result?: CoffeeResponse;
        error?: CoffeeErrorType;
      };
      if (!response.ok) return data.error ?? 'runner_unavailable';
      if (data.state === 'complete') return data.result ?? 'runner_unavailable';
      if (data.state === 'failed' || data.state === 'canceled')
        return data.error ?? 'runner_unavailable';
      onState(data.state);
      await new Promise<void>((resolve, reject) => {
        const stop = () => {
          clearTimeout(timer);
          reject(signal.reason);
        };
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', stop);
          resolve();
        }, 2500);
        signal.addEventListener('abort', stop, { once: true });
      });
    }
  } finally {
    signal.removeEventListener('abort', canceled);
    if (signal.aborted) canceled();
  }
}
