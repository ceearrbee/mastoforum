/**
 * Token-detection helpers for the composer autocomplete pickers.
 *
 * Given the text of the current editor line and the cursor column, work out
 * whether the cursor sits inside a `@mention` or `#hashtag` token that the
 * picker should complete. Kept free of any editor/DOM dependency so it is
 * unit-testable in isolation.
 */

export type HintType = 'mention' | 'hashtag';

export interface CursorToken {
  type: HintType;
  /** The text typed after the sigil, e.g. `ada` for `@ada`. */
  query: string;
  /** Column of the sigil (`@`/`#`) — the start of the replacement range. */
  start: number;
  /** Column of the cursor — the end of the replacement range. */
  end: number;
}

// Anchored to the end of the slice-before-cursor. The (^|\s) guard means we
// only fire at the start of a line or after whitespace, so we skip emails
// (foo@bar) and markdown link targets ([text](@x).
const MENTION = /(^|\s)@([\w.-]*)$/;
const HASHTAG = /(^|\s)#(\w*)$/;

export function tokenAtCursor(line: string, cursor: number): CursorToken | null {
  const before = line.slice(0, cursor);

  const mention = MENTION.exec(before);
  if (mention) {
    const query = mention[2];
    return { type: 'mention', query, start: cursor - query.length - 1, end: cursor };
  }

  const hashtag = HASHTAG.exec(before);
  if (hashtag) {
    const query = hashtag[2];
    return { type: 'hashtag', query, start: cursor - query.length - 1, end: cursor };
  }

  return null;
}
