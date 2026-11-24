import { describe, expect, it } from 'vitest';
import { cursorNextParam, linkNextMaxId, listParams } from './cursor';

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

describe('linkNextMaxId', () => {
  const link =
    '<https://x.example/api/v1/mutes?limit=30&max_id=77>; rel="next", ' +
    '<https://x.example/api/v1/mutes?limit=30&since_id=90>; rel="prev"';

  it('reads max_id from the rel="next" link', () => {
    expect(linkNextMaxId(link)).toBe('77');
  });

  it('returns undefined without a next link or header', () => {
    expect(linkNextMaxId(null)).toBeUndefined();
    expect(linkNextMaxId('<https://x.example/a?since_id=1>; rel="prev"')).toBeUndefined();
  });
});
