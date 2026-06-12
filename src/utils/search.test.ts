import { describe, expect, it } from 'vitest';
import {
  buildSearchPath,
  defaultTypeForQuery,
  normalizeSearchType,
  tagQueryFromInput,
} from './search';

describe('normalizeSearchType', () => {
  it('passes through the three valid types', () => {
    expect(normalizeSearchType('accounts')).toBe('accounts');
    expect(normalizeSearchType('hashtags')).toBe('hashtags');
    expect(normalizeSearchType('statuses')).toBe('statuses');
  });

  it('falls back to accounts for unknown or null values', () => {
    expect(normalizeSearchType('people')).toBe('accounts');
    expect(normalizeSearchType(null)).toBe('accounts');
    expect(normalizeSearchType('')).toBe('accounts');
  });
});

describe('defaultTypeForQuery', () => {
  it('picks hashtags for a #-prefixed query', () => {
    expect(defaultTypeForQuery('#scifi')).toBe('hashtags');
  });

  it('picks accounts for an @-prefixed query', () => {
    expect(defaultTypeForQuery('@ada')).toBe('accounts');
  });

  it('defaults plain text to accounts (People)', () => {
    expect(defaultTypeForQuery('fediverse')).toBe('accounts');
  });
});

describe('buildSearchPath', () => {
  it('encodes the query', () => {
    expect(buildSearchPath('hello world')).toBe('/search?q=hello%20world');
  });

  it('includes the type when given', () => {
    expect(buildSearchPath('cats', 'statuses')).toBe('/search?q=cats&type=statuses');
  });

  it('omits the type when it is the accounts default', () => {
    expect(buildSearchPath('cats', 'accounts')).toBe('/search?q=cats');
  });
});

describe('tagQueryFromInput', () => {
  it('returns the bare word for a #-prefixed input', () => {
    expect(tagQueryFromInput('#scifi')).toBe('scifi');
  });

  it('returns null when there is no leading #', () => {
    expect(tagQueryFromInput('scifi')).toBeNull();
    expect(tagQueryFromInput('@ada')).toBeNull();
  });

  it('returns null for a lone # or empty input', () => {
    expect(tagQueryFromInput('#')).toBeNull();
    expect(tagQueryFromInput('')).toBeNull();
  });

  it('returns null once the input contains a space (no longer a single tag)', () => {
    expect(tagQueryFromInput('#sci fi')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(tagQueryFromInput('  #books  ')).toBe('books');
  });
});
