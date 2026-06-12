/**
 * Count user-perceived characters (grapheme clusters) in a string.
 *
 * Mastodon counts a status against `max_characters` by grapheme, so a flag
 * emoji or a ZWJ family sequence each weigh 1 — not their UTF-16 length.
 * Uses the runtime's `Intl.Segmenter` (no dependency); falls back to the
 * spread operator (code points) on the rare runtime that lacks it.
 */
const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

export function graphemeLength(text: string): number {
  if (!text) return 0;
  if (segmenter) {
    let count = 0;
    for (const _ of segmenter.segment(text)) {
      void _;
      count += 1;
    }
    return count;
  }
  return [...text].length;
}
