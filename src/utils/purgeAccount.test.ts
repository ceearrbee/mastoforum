import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { purgeAccountStatuses } from './purgeAccount';

const status = (id: string, accountId: string, reblogOf?: string) =>
  ({
    id,
    account: { id: accountId },
    reblog: reblogOf ? { id: `${id}-orig`, account: { id: reblogOf } } : null,
  }) as unknown as mastodon.v1.Status;

const ids = (list: mastodon.v1.Status[]) => list.map((s) => s.id);

function setup() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

describe('purgeAccountStatuses', () => {
  it('removes direct posts and boosts of the account from a feed, keeping its cursor', () => {
    const qc = setup();
    qc.setQueryData(['feed', 'home'], {
      pages: [
        { topics: [status('1', 'bad'), status('2', 'ok'), status('3', 'x', 'bad')], lastId: '3' },
        { topics: [status('4', 'bad')], lastId: '4' },
      ],
      pageParams: [undefined, '3'],
    });

    purgeAccountStatuses(qc, 'bad');

    const data = qc.getQueryData<{
      pages: { topics: mastodon.v1.Status[]; lastId: string }[];
      pageParams: unknown[];
    }>(['feed', 'home'])!;
    expect(ids(data.pages[0].topics)).toEqual(['2']);
    expect(data.pages[0].lastId).toBe('3');
    expect(data.pages[1]).toEqual({ topics: [], lastId: '4' });
    expect(data.pageParams).toEqual([undefined, '3']);
  });

  it.each([
    ['board', ['board', 'ttrpg', '', '', '']],
    ['list', ['listTimeline', 'L1']],
  ])('filters array pages of a %s query and drops pages left empty', (_label, key) => {
    const qc = setup();
    qc.setQueryData(key, {
      pages: [[status('1', 'ok'), status('2', 'bad')], [status('3', 'bad')], [status('4', 'ok')]],
      pageParams: [undefined, '2', '3'],
    });

    purgeAccountStatuses(qc, 'bad');

    const data = qc.getQueryData<{ pages: mastodon.v1.Status[][]; pageParams: unknown[] }>(key)!;
    expect(data.pages.map(ids)).toEqual([['1'], ['4']]);
    expect(data.pageParams).toEqual([undefined, '3']);
  });

  it('keeps the initial page param when the emptied first page is dropped', () => {
    const qc = setup();
    qc.setQueryData(['listTimeline', 'L1'], {
      pages: [[status('1', 'bad')], [status('2', 'ok')], [status('3', 'ok')]],
      pageParams: [undefined, '1', '2'],
    });

    purgeAccountStatuses(qc, 'bad');

    const data = qc.getQueryData<{ pages: mastodon.v1.Status[][]; pageParams: unknown[] }>([
      'listTimeline',
      'L1',
    ])!;
    expect(data.pages.map(ids)).toEqual([['2'], ['3']]);
    expect(data.pageParams).toEqual([undefined, '2']);
  });

  it('invalidates offset-paged search queries instead of editing their pages', () => {
    const qc = setup();
    const results = {
      pages: [[status('1', 'bad'), status('2', 'ok')], [status('3', 'ok')]],
      pageParams: [0, 20],
    };
    qc.setQueryData(['search', 'hello', 'statuses'], results);

    purgeAccountStatuses(qc, 'bad');

    expect(qc.getQueryData(['search', 'hello', 'statuses'])).toBe(results);
    expect(qc.getQueryState(['search', 'hello', 'statuses'])?.isInvalidated).toBe(true);
  });

  it('removes replies from thread ancestors and descendants but keeps the main post', () => {
    const qc = setup();
    qc.setQueryData(['thread', 'm'], {
      mainPost: status('m', 'bad'),
      ancestors: [status('a1', 'bad'), status('a2', 'ok')],
      descendants: [status('d1', 'ok'), status('d2', 'bad'), status('d3', 'x', 'bad')],
    });

    purgeAccountStatuses(qc, 'bad');

    const data = qc.getQueryData<{
      mainPost: mastodon.v1.Status;
      ancestors: mastodon.v1.Status[];
      descendants: mastodon.v1.Status[];
    }>(['thread', 'm'])!;
    expect(data.mainPost.id).toBe('m');
    expect(ids(data.ancestors)).toEqual(['a2']);
    expect(ids(data.descendants)).toEqual(['d1']);
  });

  it('filters the trending statuses list', () => {
    const qc = setup();
    qc.setQueryData(['trends', 'statuses'], [status('1', 'bad'), status('2', 'ok')]);

    purgeAccountStatuses(qc, 'bad');

    expect(ids(qc.getQueryData<mastodon.v1.Status[]>(['trends', 'statuses'])!)).toEqual(['2']);
  });

  it('keeps the same cache object when nothing matches', () => {
    const qc = setup();
    const feed = { pages: [{ topics: [status('1', 'ok')], lastId: '1' }], pageParams: [undefined] };
    qc.setQueryData(['feed', 'local'], feed);

    purgeAccountStatuses(qc, 'bad');

    expect(qc.getQueryData(['feed', 'local'])).toBe(feed);
  });

  it('does not touch queries that are not status lists', () => {
    const qc = setup();
    const bookmarks = { pages: [[status('1', 'bad')]], pageParams: [undefined] };
    const profile = { pages: [[status('2', 'bad')]], pageParams: [undefined] };
    qc.setQueryData(['bookmarks'], bookmarks);
    qc.setQueryData(['accountStatuses', 'bad'], profile);

    purgeAccountStatuses(qc, 'bad');

    expect(qc.getQueryData(['bookmarks'])).toBe(bookmarks);
    expect(qc.getQueryData(['accountStatuses', 'bad'])).toBe(profile);
  });

  it('invalidates a list whose every loaded page was the account, so it refetches', () => {
    const qc = setup();
    qc.setQueryData(['listTimeline', 'L1'], {
      pages: [[status('1', 'bad')], [status('2', 'bad')]],
      pageParams: [undefined, '1'],
    });

    purgeAccountStatuses(qc, 'bad');

    expect(qc.getQueryState(['listTimeline', 'L1'])?.isInvalidated).toBe(true);
  });

  it('invalidates the muted accounts list', () => {
    const qc = setup();
    qc.setQueryData(['mutes'], { pages: [[]], pageParams: [undefined] });

    purgeAccountStatuses(qc, 'bad');

    expect(qc.getQueryState(['mutes'])?.isInvalidated).toBe(true);
  });
});
