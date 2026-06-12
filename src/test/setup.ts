import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver, which some Carbon components (e.g.
// Modal) instantiate on mount. A no-op stub is enough for rendering/a11y tests.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserver as unknown as typeof globalThis.ResizeObserver;
}
