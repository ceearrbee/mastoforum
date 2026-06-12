import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * GitHub Pages has no SPA rewrite, so unknown deep links (and the OAuth
 * `/auth` callback) would 404. Publishing an identical 404.html makes Pages
 * serve the app for any path; the router + basename then resolve the route.
 */
function spaFallback() {
  return {
    name: 'spa-404-fallback',
    closeBundle() {
      const index = resolve(process.cwd(), 'dist/index.html');
      if (existsSync(index)) copyFileSync(index, resolve(process.cwd(), 'dist/404.html'));
    },
  };
}

export default defineConfig({
  // Project pages serve under /<repo>/. Set VITE_BASE at build time (the deploy
  // workflow derives it from the repo name); defaults to '/' for dev and root.
  base: process.env.VITE_BASE || '/',
  plugins: [react(), spaFallback()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Playwright specs in e2e/ run under their own toolchain, not Vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
