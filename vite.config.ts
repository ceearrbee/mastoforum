import { defineConfig, configDefaults } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const git = (...args: string[]): string =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/**
 * Short commit for the footer's build stamp. Falls back to the CI-provided SHA
 * (GitHub Actions checkouts are shallow but do carry `GITHUB_SHA`) and finally
 * to a placeholder, so a tarball build with no git available still succeeds.
 */
function buildCommit(): string {
  try {
    return `${git('rev-parse', '--short', 'HEAD')}${git('status', '--porcelain') ? '-dirty' : ''}`;
  } catch {
    return process.env.GITHUB_SHA?.slice(0, 7) ?? 'unknown';
  }
}

function appVersion(): string {
  try {
    const pkg: unknown = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    const version = (pkg as { version?: unknown }).version;
    return typeof version === 'string' ? version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

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
    // Baked in at build time and surfaced in the footer, so a deployed page can
    // be tied back to the exact commit it was built from.
    define: {
      __APP_VERSION__: JSON.stringify(appVersion()),
      __BUILD_COMMIT__: JSON.stringify(buildCommit()),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
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
