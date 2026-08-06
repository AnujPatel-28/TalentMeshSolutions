export const TIMEOUTS = {
  DASHBOARD: 20_000,
  CANDIDATES: 30_000,
  REPORTS: 15_000,
  SETTINGS: 10_000,
  APPROVE: 10_000,
  UPLOAD: 60_000,
} as const;

export class TimeoutError extends Error {
  constructor(message = 'Request timed out — please try again.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise in a timeout limit.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Request'): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${label} timed out after ${ms / 1000}s.`));
    }, ms);
  });

  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutId);
      return result;
    }),
    timeoutPromise,
  ]);
}
