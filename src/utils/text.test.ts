import { describe, expect, it } from 'vitest';
import { graphemeLength } from './text';

describe('graphemeLength', () => {
  it('counts plain ASCII characters', () => {
    expect(graphemeLength('hello')).toBe(5);
  });

  it('counts an empty string as zero', () => {
    expect(graphemeLength('')).toBe(0);
  });

  it('counts a ZWJ family emoji as a single grapheme', () => {
    expect(graphemeLength('👨‍👩‍👧')).toBe(1);
  });

  it('counts a regional-indicator flag as a single grapheme', () => {
    expect(graphemeLength('🇬🇧')).toBe(1);
  });

  it('counts a custom-emoji shortcode as its literal length', () => {
    expect(graphemeLength(':flag-gb:')).toBe(9);
  });

  it('counts a CRLF as a single grapheme cluster', () => {
    expect(graphemeLength('a\r\nb')).toBe(3);
  });
});
