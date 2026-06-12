import { useSyncExternalStore } from 'react';
import type { mastodon } from 'masto';
import { RECENT_THREADS_LIMIT, THREAD_TITLE_CHARS } from '../config';
import { stripHtml, truncate } from './sanitize';

export interface RecentThreadAccount {
  acct: string;
  displayName: string;
  username: string;
  avatar?: string;
}

export interface RecentThread {
  id: string;
  title: string;
  viewedAt: number;
  createdAt?: string;
  repliesCount?: number;
  primaryTag?: string;
  account?: RecentThreadAccount;
}

const STORAGE_KEY = 'recent_threads';
const EVENT_NAME = 'mastoforum:recent-threads-changed';

function migrate(raw: unknown): RecentThread[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is { id: string; title?: string } => !!r && typeof r === 'object' && typeof (r as { id?: unknown }).id === 'string')
    .map((r) => {
      const obj = r as Partial<RecentThread> & { timestamp?: number };
      return {
        id: obj.id!,
        title: obj.title ?? 'Untitled',
        viewedAt: typeof obj.viewedAt === 'number' ? obj.viewedAt : obj.timestamp ?? Date.now(),
        createdAt: obj.createdAt,
        repliesCount: obj.repliesCount,
        primaryTag: obj.primaryTag,
        account: obj.account,
      } satisfies RecentThread;
    });
}

export function getRecentThreads(): RecentThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function recordRecentThread(post: mastodon.v1.Status): void {
  try {
    const title =
      post.spoilerText || truncate(stripHtml(post.content), THREAD_TITLE_CHARS) || 'Untitled';
    const entry: RecentThread = {
      id: post.id,
      title,
      viewedAt: Date.now(),
      createdAt: post.createdAt,
      repliesCount: post.repliesCount,
      primaryTag: post.tags[0]?.name,
      account: {
        acct: post.account.acct,
        displayName: post.account.displayName || post.account.username,
        username: post.account.username,
        avatar: post.account.avatar || undefined,
      },
    };
    const list = getRecentThreads().filter((t) => t.id !== entry.id);
    list.unshift(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, RECENT_THREADS_LIMIT)));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* localStorage may be unavailable (private mode, disabled). */
  }
}

export function clearRecentThreads(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* localStorage may be unavailable (private mode, disabled). */
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(EVENT_NAME, callback);
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener('storage', storageHandler);
  };
}

let cachedSnapshot: RecentThread[] = getRecentThreads();
let cachedSerialised = JSON.stringify(cachedSnapshot);

function getSnapshot(): RecentThread[] {
  const next = getRecentThreads();
  const serialised = JSON.stringify(next);
  if (serialised !== cachedSerialised) {
    cachedSerialised = serialised;
    cachedSnapshot = next;
  }
  return cachedSnapshot;
}

export function useRecentThreads(): RecentThread[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => []);
}
