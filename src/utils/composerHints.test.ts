import { describe, expect, it } from 'vitest';
import { tokenAtCursor } from './composerHints';

describe('tokenAtCursor', () => {
  it('detects a mention at the start of the buffer', () => {
    expect(tokenAtCursor('@ada', 4)).toEqual({
      type: 'mention',
      query: 'ada',
      start: 0,
      end: 4,
    });
  });

  it('detects a mention after whitespace', () => {
    expect(tokenAtCursor('hello @ad', 9)).toEqual({
      type: 'mention',
      query: 'ad',
      start: 6,
      end: 9,
    });
  });

  it('detects a bare @ with an empty query', () => {
    expect(tokenAtCursor('@', 1)).toEqual({
      type: 'mention',
      query: '',
      start: 0,
      end: 1,
    });
  });

  it('detects a hashtag', () => {
    expect(tokenAtCursor('#scifi', 6)).toEqual({
      type: 'hashtag',
      query: 'scifi',
      start: 0,
      end: 6,
    });
  });

  it('detects a hashtag after whitespace with an empty query', () => {
    expect(tokenAtCursor('a #', 3)).toEqual({
      type: 'hashtag',
      query: '',
      start: 2,
      end: 3,
    });
  });

  it('does not trigger on an email-style @ (no preceding space)', () => {
    expect(tokenAtCursor('foo@bar', 7)).toBeNull();
  });

  it('does not trigger inside a markdown link target', () => {
    expect(tokenAtCursor('[text](@ad', 10)).toBeNull();
  });

  it('returns null when the cursor is not on a token', () => {
    expect(tokenAtCursor('hello world', 11)).toBeNull();
  });

  it('returns null when there is whitespace between the sigil and the cursor', () => {
    expect(tokenAtCursor('@ada bob', 8)).toBeNull();
  });
});
