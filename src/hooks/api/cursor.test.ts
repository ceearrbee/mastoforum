import { describe, expect, it } from 'vitest';
import { cursorNextParam, listParams } from './cursor';

describe('cursorNextParam', () => {
  it('returns undefined for an empty page (end of list)', () => {
    expect(cursorNextParam([])).toBeUndefined();
  });

  it('returns the last item id as the next cursor', () => {
    expect(cursorNextParam([{ id: 'a' }, { id: 'b' }, { id: 'c' }])).toBe('c');
  });
});

describe('listParams', () => {
  it('omits maxId on the first page', () => {
    expect(listParams(undefined, 20)).toEqual({ limit: 20 });
  });

  it('includes maxId when paging past the first page', () => {
    expect(listParams('xyz', 40)).toEqual({ limit: 40, maxId: 'xyz' });
  });
});
