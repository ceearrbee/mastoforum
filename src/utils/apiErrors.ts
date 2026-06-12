const UNAUTHORIZED_EVENT = 'mastoforum:unauthorized';
const RATE_LIMITED_EVENT = 'mastoforum:rate-limited';

interface ErrorLike {
  statusCode?: number;
  status?: number;
  name?: string;
  headers?: Record<string, string> | Headers;
}

function readHeader(err: ErrorLike, name: string): string | undefined {
  const h = err.headers;
  if (!h) return undefined;
  if (h instanceof Headers) return h.get(name) ?? undefined;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(h)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

/** The HTTP status of an API error, or undefined for a client-side Error. */
export function httpStatus(err: unknown): number | undefined {
  const e = err as ErrorLike;
  return e?.statusCode ?? e?.status;
}

export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}

export function isUnauthorized(err: unknown): boolean {
  const e = err as ErrorLike;
  return e?.statusCode === 401 || e?.status === 401;
}

export function isRateLimited(err: unknown): boolean {
  const e = err as ErrorLike;
  return e?.statusCode === 429 || e?.status === 429;
}

/** A 422 — the instance rejected the request as unprocessable. */
export function isUnprocessable(err: unknown): boolean {
  const e = err as ErrorLike;
  return e?.statusCode === 422 || e?.status === 422;
}

/** Returns the recommended wait in ms before retrying a rate-limited request. */
export function rateLimitDelayMs(err: unknown): number {
  const e = err as ErrorLike;
  const retryAfter = readHeader(e, 'retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000);
  }
  const reset = readHeader(e, 'x-ratelimit-reset');
  if (reset) {
    const resetMs = new Date(reset).getTime();
    if (Number.isFinite(resetMs)) return Math.max(1000, resetMs - Date.now());
  }
  return 5_000;
}

export function notifyUnauthorized(): void {
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

export function onUnauthorized(handler: () => void): () => void {
  window.addEventListener(UNAUTHORIZED_EVENT, handler);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
}

export interface RateLimitedDetail {
  retryInMs: number;
}

export function notifyRateLimited(detail: RateLimitedDetail): void {
  window.dispatchEvent(new CustomEvent(RATE_LIMITED_EVENT, { detail }));
}

export function onRateLimited(handler: (detail: RateLimitedDetail) => void): () => void {
  const wrapped = (e: Event) => handler((e as CustomEvent<RateLimitedDetail>).detail);
  window.addEventListener(RATE_LIMITED_EVENT, wrapped);
  return () => window.removeEventListener(RATE_LIMITED_EVENT, wrapped);
}
