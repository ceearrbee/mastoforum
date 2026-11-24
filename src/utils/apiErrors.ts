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

/** Announce a 401, carrying the access token of the request that failed. */
export function notifyUnauthorized(token: string): void {
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: token }));
}

export function onUnauthorized(handler: (token: string) => void): () => void {
  const wrapped = (e: Event) => handler((e as CustomEvent<string>).detail);
  window.addEventListener(UNAUTHORIZED_EVENT, wrapped);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, wrapped);
}

function bearerToken(input: RequestInfo | URL, init?: RequestInit): string | undefined {
  const headers = init?.headers ?? (input instanceof Request ? input.headers : undefined);
  const auth = new Headers(headers).get('Authorization');
  return /^Bearer\s+(\S+)$/i.exec(auth ?? '')?.[1];
}

/**
 * Wrap `window.fetch` so a 401 on a bearer-authenticated request is announced
 * with that request's token. masto.js errors do not carry the token, so this
 * is the only point where a late 401 can be tied to the account that sent it.
 * Returns a function that restores the original fetch.
 */
export function watchUnauthorizedResponses(): () => void {
  const original = window.fetch;
  window.fetch = async (input, init) => {
    const response = await original.call(window, input, init);
    if (response.status === 401) {
      const token = bearerToken(input, init);
      if (token) notifyUnauthorized(token);
    }
    return response;
  };
  const installed = window.fetch;
  return () => {
    if (window.fetch === installed) window.fetch = original;
  };
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
