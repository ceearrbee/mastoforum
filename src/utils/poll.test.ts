import { describe, expect, it } from 'vitest';
import {
  canAddOption,
  canRemoveOption,
  cleanPollOptions,
  isPollValid,
} from './poll';

describe('poll option constraints', () => {
  it('allows adding options below the instance maximum', () => {
    expect(canAddOption(['a', 'b'], 4)).toBe(true);
  });

  it('blocks adding options at the instance maximum', () => {
    expect(canAddOption(['a', 'b', 'c', 'd'], 4)).toBe(false);
  });

  it('allows removing options above the floor of two', () => {
    expect(canRemoveOption(['a', 'b', 'c'])).toBe(true);
  });

  it('blocks removing options at the floor of two', () => {
    expect(canRemoveOption(['a', 'b'])).toBe(false);
  });
});

describe('cleanPollOptions', () => {
  it('trims and drops blank options', () => {
    expect(cleanPollOptions([' yes ', '', '  ', 'no'])).toEqual(['yes', 'no']);
  });
});

describe('isPollValid', () => {
  it('is valid with two or more non-blank options', () => {
    expect(isPollValid(['yes', 'no'])).toBe(true);
  });

  it('is invalid with fewer than two non-blank options', () => {
    expect(isPollValid(['yes', ''])).toBe(false);
  });

  it('is invalid with duplicate options', () => {
    expect(isPollValid(['yes', 'yes'])).toBe(false);
  });
});
