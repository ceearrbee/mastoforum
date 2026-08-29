import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'mastoforum_post_collapse';
const EVENT_NAME = 'mastoforum:post-collapse-changed';

/** A per-post override of whatever the surface would show by default. */
export type CollapseState = 'collapsed' | 'expanded';

export type CollapseMap = Record<string, CollapseState>;

function readAll(): CollapseMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as CollapseMap) : {};
  } catch {
    return {};
  }
}

/**
 * Overrides are a reading convenience, not data worth keeping forever; cap the
 * map so a long-lived session can't grow localStorage without bound. Object key
 * order is insertion order for these ids, so the oldest entries go first.
 */
const MAX_ENTRIES = 500;

function prune(map: CollapseMap): CollapseMap {
  const keys = Object.keys(map);
  if (keys.length <= MAX_ENTRIES) return map;
  const kept: CollapseMap = {};
  for (const key of keys.slice(keys.length - MAX_ENTRIES)) kept[key] = map[key];
  return kept;
}

function writeAll(unpruned: CollapseMap): void {
  const map = prune(unpruned);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* localStorage may be unavailable */
  }
}

/** Store an explicit override for one post, or clear it with `undefined`. */
export function setPostCollapse(postId: string, state: CollapseState | undefined): void {
  const map = readAll();
  if (state === undefined) {
    if (!(postId in map)) return;
    delete map[postId];
  } else {
    if (map[postId] === state) return;
    map[postId] = state;
  }
  writeAll(map);
}

/** Apply one override (or clear it with `undefined`) to many posts in one write. */
export function setManyPostCollapse(
  postIds: readonly string[],
  state: CollapseState | undefined,
): void {
  if (postIds.length === 0) return;
  const map = readAll();
  let changed = false;
  for (const postId of postIds) {
    if (state === undefined) {
      if (postId in map) {
        delete map[postId];
        changed = true;
      }
    } else if (map[postId] !== state) {
      map[postId] = state;
      changed = true;
    }
  }
  if (changed) writeAll(map);
}

/**
 * Flip one post between collapsed and expanded. `defaultCollapsed` is what the
 * surface would show without an override, so the first click always does the
 * opposite of what the user is looking at.
 */
export function togglePostCollapse(postId: string, defaultCollapsed: boolean): void {
  const current = readAll()[postId];
  const collapsed = current ? current === 'collapsed' : defaultCollapsed;
  setPostCollapse(postId, collapsed ? 'expanded' : 'collapsed');
}

/** Whether a post renders collapsed, given the surface's default. */
export function isPostCollapsed(
  map: CollapseMap,
  postId: string,
  defaultCollapsed: boolean,
): boolean {
  const override = map[postId];
  return override ? override === 'collapsed' : defaultCollapsed;
}

/** Drop every override (used by "expand all" style controls). */
export function clearPostCollapse(): void {
  writeAll({});
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

function getSnapshot(): CollapseMap {
  const next = readAll();
  const serialised = JSON.stringify(next);
  if (serialised !== cachedSerialised) {
    cached = next;
    cachedSerialised = serialised;
  }
  return cached;
}

/** Subscribe to the full per-post collapse map. */
export function useCollapseMap(): CollapseMap {
  return useSyncExternalStore(subscribe, getSnapshot, () => ({}));
}
