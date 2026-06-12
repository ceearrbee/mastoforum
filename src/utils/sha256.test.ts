import { describe, expect, it } from 'vitest';
import { sha256Bytes } from './sha256';

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function digestOf(text: string): string {
  return hex(sha256Bytes(new TextEncoder().encode(text)));
}

describe('sha256Bytes', () => {
  it('matches the canonical NIST vector for "abc"', () => {
    expect(digestOf('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('matches the vector for the empty string', () => {
    expect(digestOf('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('matches the 56-byte boundary vector (two-block padding)', () => {
    // The classic 448-bit message that forces a second padding block.
    expect(digestOf('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('produces 32 bytes', () => {
    expect(sha256Bytes(new Uint8Array([1, 2, 3])).length).toBe(32);
  });
});
