import { describe, expect, it } from 'vitest';
import type { mastodon } from 'masto';
import { buildFlat, buildOrdered } from './thread';

function st(id: string, inReplyToId: string | null, createdAt: string): mastodon.v1.Status {
  return { id, inReplyToId, createdAt } as unknown as mastodon.v1.Status;
}

describe('buildOrdered', () => {
  it('places ancestors before main, descendants after, ordered by tree', () => {
    const main = st('M', 'P', '2025-01-01T00:00:00Z');
    const ancestors = [st('P', null, '2024-12-31T00:00:00Z')];
    const descendants = [
      st('C1', 'M', '2025-01-02T00:00:00Z'),
      st('C2', 'M', '2025-01-03T00:00:00Z'),
      st('GC1', 'C1', '2025-01-02T01:00:00Z'),
    ];
    const out = buildOrdered(ancestors, main, descendants);
    expect(out.map((o) => o.post.id)).toEqual(['P', 'M', 'C1', 'GC1', 'C2']);
  });

  it('indents descendants by depth, ancestors and main at depth 0', () => {
    const main = st('M', null, '2025-01-01T00:00:00Z');
    const descendants = [
      st('C1', 'M', '2025-01-02T00:00:00Z'),
      st('GC1', 'C1', '2025-01-02T01:00:00Z'),
      st('GGC1', 'GC1', '2025-01-02T02:00:00Z'),
    ];
    const out = buildOrdered([], main, descendants);
    expect(out.map((o) => o.depth)).toEqual([0, 1, 2, 3]);
  });

  it('sorts siblings chronologically', () => {
    const main = st('M', null, '2025-01-01T00:00:00Z');
    const descendants = [
      st('B', 'M', '2025-01-03T00:00:00Z'),
      st('A', 'M', '2025-01-02T00:00:00Z'),
    ];
    const out = buildOrdered([], main, descendants);
    expect(out.map((o) => o.post.id)).toEqual(['M', 'A', 'B']);
  });

  it('attaches orphan descendants (missing parent) to main', () => {
    const main = st('M', null, '2025-01-01T00:00:00Z');
    const descendants = [st('orphan', 'missing', '2025-01-02T00:00:00Z')];
    const out = buildOrdered([], main, descendants);
    expect(out.map((o) => o.post.id)).toEqual(['M', 'orphan']);
  });
});

describe('buildFlat', () => {
  it('orders ancestors, main, and descendants chronologically', () => {
    const main = st('M', 'P', '2025-01-01T12:00:00Z');
    const ancestors = [st('P', null, '2025-01-01T10:00:00Z')];
    const descendants = [
      st('B', 'M', '2025-01-01T14:00:00Z'),
      st('A', 'M', '2025-01-01T13:00:00Z'),
    ];
    const out = buildFlat(ancestors, main, descendants);
    expect(out.map((f) => f.post.id)).toEqual(['P', 'M', 'A', 'B']);
  });

  it('omits quoteOf when reply directly follows its parent', () => {
    const main = st('M', null, '2025-01-01T10:00:00Z');
    const reply = st('R', 'M', '2025-01-01T11:00:00Z');
    const out = buildFlat([], main, [reply]);
    expect(out[1].quoteOf).toBeUndefined();
  });

  it('sets quoteOf when reply jumps back to an earlier post', () => {
    const main = st('M', null, '2025-01-01T10:00:00Z');
    const r1 = st('R1', 'M', '2025-01-01T11:00:00Z');
    // R2 replies to M but is rendered after R1, so it needs quote context.
    const r2 = st('R2', 'M', '2025-01-01T12:00:00Z');
    const out = buildFlat([], main, [r1, r2]);
    expect(out[2].post.id).toBe('R2');
    expect(out[2].quoteOf?.id).toBe('M');
  });

  it('leaves quoteOf undefined when the parent is not in the context', () => {
    const main = st('M', null, '2025-01-01T10:00:00Z');
    const orphan = st('O', 'missing', '2025-01-01T11:00:00Z');
    const out = buildFlat([], main, [orphan]);
    expect(out[1].post.id).toBe('O');
    expect(out[1].quoteOf).toBeUndefined();
  });
});
