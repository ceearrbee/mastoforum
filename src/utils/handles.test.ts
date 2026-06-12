import { describe, expect, it } from 'vitest';
import { domainOf, isWebfingerHandle, stripLeadingAt } from './handles';

describe('isWebfingerHandle', () => {
  it('accepts user@host with a leading @', () => {
    expect(isWebfingerHandle('@bob@elsewhere.social')).toBe(true);
  });

  it('accepts user@host without a leading @', () => {
    expect(isWebfingerHandle('bob@elsewhere.social')).toBe(true);
  });

  it('accepts subdomains and hyphenated hosts', () => {
    expect(isWebfingerHandle('@a.b_c@my-instance.example.org')).toBe(true);
  });

  it('rejects a local handle with no host', () => {
    expect(isWebfingerHandle('@bob')).toBe(false);
    expect(isWebfingerHandle('bob')).toBe(false);
  });

  it('rejects a host with no TLD', () => {
    expect(isWebfingerHandle('bob@localhost')).toBe(false);
  });

  it('rejects empty and tag-like input', () => {
    expect(isWebfingerHandle('')).toBe(false);
    expect(isWebfingerHandle('#fediverse')).toBe(false);
  });
});

describe('stripLeadingAt', () => {
  it('removes only the first @', () => {
    expect(stripLeadingAt('@bob@host.tld')).toBe('bob@host.tld');
  });

  it('leaves a handle without a leading @ untouched', () => {
    expect(stripLeadingAt('bob@host.tld')).toBe('bob@host.tld');
  });

  it('trims surrounding whitespace', () => {
    expect(stripLeadingAt('  @bob  ')).toBe('bob');
  });
});

describe('domainOf', () => {
  it('returns the host of a remote handle', () => {
    expect(domainOf('bob@elsewhere.social')).toBe('elsewhere.social');
  });

  it('ignores a leading @', () => {
    expect(domainOf('@bob@elsewhere.social')).toBe('elsewhere.social');
  });

  it('returns null for a local handle with no host', () => {
    expect(domainOf('bob')).toBeNull();
    expect(domainOf('@bob')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(domainOf('')).toBeNull();
  });
});
