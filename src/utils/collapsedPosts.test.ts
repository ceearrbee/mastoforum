import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPostCollapse,
  isPostCollapsed,
  setManyPostCollapse,
  setPostCollapse,
  togglePostCollapse,
  type CollapseMap,
} from './collapsedPosts';

const KEY = 'mastoforum_post_collapse';

function stored(): CollapseMap {
  return JSON.parse(localStorage.getItem(KEY) ?? '{}');
}

describe('collapsedPosts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to the surface default when there is no override', () => {
    expect(isPostCollapsed({}, 'p1', false)).toBe(false);
    expect(isPostCollapsed({}, 'p1', true)).toBe(true);
  });

  it('lets an override win over the default in both directions', () => {
    expect(isPostCollapsed({ p1: 'collapsed' }, 'p1', false)).toBe(true);
    expect(isPostCollapsed({ p1: 'expanded' }, 'p1', true)).toBe(false);
  });

  it('toggle collapses a post that is expanded by default', () => {
    togglePostCollapse('p1', false);
    expect(stored().p1).toBe('collapsed');
    togglePostCollapse('p1', false);
    expect(stored().p1).toBe('expanded');
  });

  it('toggle expands a post that is collapsed by default', () => {
    togglePostCollapse('p2', true);
    expect(stored().p2).toBe('expanded');
  });

  it('setPostCollapse with undefined clears the override', () => {
    setPostCollapse('p3', 'collapsed');
    expect(stored().p3).toBe('collapsed');
    setPostCollapse('p3', undefined);
    expect('p3' in stored()).toBe(false);
  });

  it('clearPostCollapse drops every override', () => {
    setPostCollapse('a', 'collapsed');
    setPostCollapse('b', 'expanded');
    clearPostCollapse();
    expect(stored()).toEqual({});
  });

  it('setManyPostCollapse writes one override across many posts', () => {
    setManyPostCollapse(['a', 'b', 'c'], 'collapsed');
    expect(stored()).toEqual({ a: 'collapsed', b: 'collapsed', c: 'collapsed' });
    setManyPostCollapse(['a', 'b'], 'expanded');
    expect(stored()).toEqual({ a: 'expanded', b: 'expanded', c: 'collapsed' });
  });

  it('setManyPostCollapse with undefined clears the overrides it names', () => {
    setManyPostCollapse(['a', 'b'], 'collapsed');
    setManyPostCollapse(['a'], undefined);
    expect(stored()).toEqual({ b: 'collapsed' });
  });

  it('keeps the stored map bounded', () => {
    for (let i = 0; i < 520; i += 1) setPostCollapse(`id-${i}`, 'collapsed');
    const map = stored();
    expect(Object.keys(map).length).toBe(500);
    expect('id-519' in map).toBe(true);
    expect('id-0' in map).toBe(false);
  });

  it('survives unparseable stored data', () => {
    localStorage.setItem(KEY, 'not json');
    expect(() => setPostCollapse('p4', 'collapsed')).not.toThrow();
    expect(stored().p4).toBe('collapsed');
  });
});
