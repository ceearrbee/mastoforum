import { useEffect } from 'react';

export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface ShortcutMap {
  [key: string]: ShortcutHandler;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * Bind single-key shortcuts. Keys are case-insensitive. Modifiers (Ctrl, Meta, Alt)
 * are required to be absent so we don't fight browser shortcuts.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const handler = shortcuts[e.key];
      if (handler) handler(e);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcuts, enabled]);
}
