/**
 * Single source of truth for app-level configuration.
 *
 * Branding / external links can be overridden at build time via Vite env vars
 * (`.env`, `.env.local`); everything else is a constant baked into the bundle.
 */

export const APP_CONFIG = {
  appName: import.meta.env.VITE_APP_NAME || 'mastoforum',
  repoUrl: import.meta.env.VITE_REPO_URL || 'https://github.com/ceearrbee/mastoforum',
} as const;

/** OAuth scopes requested from the Mastodon instance. */
export const SCOPES = 'read write';

/** How many topic rows to fetch per Board page. */
export const BOARD_PAGE_SIZE = 40;

/** How many entries to keep in the recent-threads list. */
export const RECENT_THREADS_LIMIT = 15;

/** Character cap when generating a thread title from its content. */
export const THREAD_TITLE_CHARS = 50;

/** Character cap when generating a topic preview from a status. */
export const TOPIC_PREVIEW_CHARS = 60;

/** Fallback image upload limit when the instance config isn't cached. */
export const DEFAULT_IMAGE_SIZE_LIMIT = 8_388_608;

/** Fallback video upload limit when the instance config isn't cached. */
export const DEFAULT_VIDEO_SIZE_LIMIT = 41_943_040;

/** Breakpoint at which the side rail becomes an in-flow column (px). */
export const RAIL_BREAKPOINT = 1024;

/**
 * Broad, evergreen hashtags offered as starter "boards" on the first-run
 * screen. Instance-agnostic (no reliance on a trends API), so they work
 * everywhere — including servers that don't expose trending.
 */
export const STARTER_TAGS = [
  'introductions',
  'fediverse',
  'art',
  'photography',
  'books',
  'music',
  'technology',
  'science',
  'news',
  'writing',
  'gaming',
  'film',
] as const;
