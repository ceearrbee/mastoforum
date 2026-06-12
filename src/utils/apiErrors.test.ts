import { describe, expect, it } from 'vitest';
import {
  errorMessage,
  isRateLimited,
  isUnauthorized,
  isUnprocessable,
  rateLimitDelayMs,
} from './apiErrors';

describe('error classifiers', () => {
  it('detect status codes from either statusCode or status', () => {
    expect(isUnauthorized({ statusCode: 401 })).toBe(true);
    expect(isUnauthorized({ status: 401 })).toBe(true);
    expect(isRateLimited({ status: 429 })).toBe(true);
    expect(isUnprocessable({ statusCode: 422 })).toBe(true);
  });

  it('return false for unrelated codes and non-error values', () => {
    expect(isUnauthorized({ status: 500 })).toBe(false);
    expect(isRateLimited(null)).toBe(false);
    expect(isUnprocessable(undefined)).toBe(false);
  });
});

describe('errorMessage', () => {
  it('returns messages from Error and string values', () => {
    expect(errorMessage(new Error('Boom'))).toBe('Boom');
    expect(errorMessage('plain failure')).toBe('plain failure');
  });

  it('falls back for non-message values', () => {
    expect(errorMessage(null, 'Fallback')).toBe('Fallback');
    expect(errorMessage({ message: '' }, 'Fallback')).toBe('Fallback');
  });
});

describe('rateLimitDelayMs', () => {
  it('reads retry-after in seconds, with a 1s floor', () => {
    expect(rateLimitDelayMs({ status: 429, headers: { 'retry-after': '30' } })).toBe(30_000);
    expect(rateLimitDelayMs({ status: 429, headers: { 'retry-after': '0' } })).toBe(1000);
  });

  it('prefers retry-after over x-ratelimit-reset', () => {
    const reset = new Date(Date.now() + 60_000).toISOString();
    expect(
      rateLimitDelayMs({ status: 429, headers: { 'retry-after': '5', 'x-ratelimit-reset': reset } }),
    ).toBe(5000);
  });

  it('falls back to x-ratelimit-reset when retry-after is absent', () => {
    const reset = new Date(Date.now() + 15_000).toISOString();
    const ms = rateLimitDelayMs({ status: 429, headers: { 'x-ratelimit-reset': reset } });
    expect(ms).toBeGreaterThan(10_000);
    expect(ms).toBeLessThanOrEqual(15_000);
  });

  it('reads from a Headers instance, not just a plain object', () => {
    const headers = new Headers({ 'retry-after': '12' });
    expect(rateLimitDelayMs({ status: 429, headers })).toBe(12_000);
  });

  it('defaults to 5s when no usable header is present', () => {
    expect(rateLimitDelayMs({ status: 429 })).toBe(5000);
    expect(rateLimitDelayMs({ status: 429, headers: { 'retry-after': 'nonsense' } })).toBe(5000);
  });
});
