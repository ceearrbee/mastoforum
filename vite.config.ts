import { defineConfig, configDefaults } from 'vitest/config';
import { loadEnv } from 'vite';
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

export default defineConfig(({ mode }) => {
  // index.html's %VITE_APP_NAME% must always resolve, or builds without a
  // .env (CI, self-hosters) ship an empty <title>. Default it here; an env
  // file or CI variable still takes precedence.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  process.env.VITE_APP_NAME = env.VITE_APP_NAME || 'mastoforum';

  return {
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
  };
});
