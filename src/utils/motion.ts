/** True when the user has asked the OS to minimise non-essential motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** `scrollIntoView` that downgrades to an instant jump under reduced-motion. */
export function scrollIntoViewMotionSafe(el: Element, options: ScrollIntoViewOptions = {}): void {
  el.scrollIntoView({
    ...options,
    behavior: prefersReducedMotion() ? 'auto' : (options.behavior ?? 'smooth'),
  });
}
