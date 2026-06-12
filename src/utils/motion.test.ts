import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, scrollIntoViewMotionSafe } from './motion';

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }));
}

afterEach(() => vi.unstubAllGlobals());

describe('prefersReducedMotion', () => {
  it('is true when the OS requests reduced motion', () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('is false otherwise', () => {
    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('scrollIntoViewMotionSafe', () => {
  it('jumps instantly under reduced motion, preserving other options', () => {
    stubMatchMedia(true);
    const scrollIntoView = vi.fn();
    const el = { scrollIntoView } as unknown as Element;
    scrollIntoViewMotionSafe(el, { block: 'center' });
    expect(scrollIntoView.mock.calls[0][0]).toMatchObject({ behavior: 'auto', block: 'center' });
  });

  it('smooth-scrolls by default when motion is allowed', () => {
    stubMatchMedia(false);
    const scrollIntoView = vi.fn();
    const el = { scrollIntoView } as unknown as Element;
    scrollIntoViewMotionSafe(el);
    expect(scrollIntoView.mock.calls[0][0]).toMatchObject({ behavior: 'smooth' });
  });
});
