import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'mastoforum_thread_read';
const EVENT_NAME = 'mastoforum:thread-read-changed';

interface ThreadReadState {
  /** Direct-reply count (`repliesCount`) when last marked seen; drives unread badges. */
  seenReplies: number;
  /**
   * Ids of every descendant on screen when last marked seen. The thread's
   * descendants are nested depth-first, so a count can't locate the new ones.
   */
  seenIds?: string[];
  updatedAt: number;
}

/** Only the newest threads keep their id lists, to bound localStorage growth. */
const MAX_THREADS_WITH_IDS = 30;

type ReadMap = Record<string, ThreadReadState>;

function readAll(): ReadMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as ReadMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: ReadMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* localStorage may be unavailable */
  }
}

export function markThreadSeen(
  threadId: string,
  repliesCount: number,
  seenIds?: readonly string[],
): void {
  const map = readAll();
  map[threadId] = {
    seenReplies: repliesCount,
    ...(seenIds ? { seenIds: [...seenIds] } : {}),
    updatedAt: Date.now(),
  };
  const withIds = Object.entries(map)
    .filter(([, state]) => state.seenIds)
    .sort(([, a], [, b]) => b.updatedAt - a.updatedAt);
  for (const [id] of withIds.slice(MAX_THREADS_WITH_IDS)) delete map[id].seenIds;
  writeAll(map);
}

/** The first descendant (in thread order) that was not on screen at the last mark. */
export function firstUnseenId(
  state: ThreadReadState | undefined,
  descendantIds: readonly string[],
): string | undefined {
  if (!state?.seenIds) return undefined;
  const seen = new Set(state.seenIds);
  return descendantIds.find((id) => !seen.has(id));
}

export function getThreadSeen(threadId: string): ThreadReadState | undefined {
  return readAll()[threadId];
}

/**
 * Schedule a {@link markThreadSeen} write after `delay` ms of dwell. Returns a
 * cancel function — call it (e.g. on unmount) to abort the pending write so we
 * only advance the read marker for threads the user actually lingered on.
 */
export function markSeenAfter(
  threadId: string,
  repliesCount: number,
  delay: number,
  seenIds?: readonly string[],
): () => void {
  const timer = setTimeout(() => markThreadSeen(threadId, repliesCount, seenIds), delay);
  return () => clearTimeout(timer);
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(EVENT_NAME, callback);
  const storage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener('storage', storage);
  };
}

let cached = readAll();
let cachedSerialised = JSON.stringify(cached);

function getSnapshot(): ReadMap {
  const next = readAll();
  const serialised = JSON.stringify(next);
  if (serialised !== cachedSerialised) {
    cached = next;
    cachedSerialised = serialised;
  }
  return cached;
}

/** Subscribe to the full read-state map. */
export function useThreadReadMap(): ReadMap {
  return useSyncExternalStore(subscribe, getSnapshot, () => ({}));
}
