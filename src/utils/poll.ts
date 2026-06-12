/**
 * Pure constraints for the poll composer. Mastodon requires 2–`max_options`
 * non-blank, distinct options; the UI uses these to gate add/remove buttons
 * and the submit action. Editor/DOM-free so they unit-test in isolation.
 */

/** Mastodon's floor: a poll needs at least two options. */
export const MIN_POLL_OPTIONS = 2;

export function canAddOption(options: string[], maxOptions: number): boolean {
  return options.length < maxOptions;
}

export function canRemoveOption(options: string[]): boolean {
  return options.length > MIN_POLL_OPTIONS;
}

/** Trim and drop blank entries — the shape sent to the API. */
export function cleanPollOptions(options: string[]): string[] {
  return options.map((o) => o.trim()).filter((o) => o.length > 0);
}

export function isPollValid(options: string[]): boolean {
  const cleaned = cleanPollOptions(options);
  if (cleaned.length < MIN_POLL_OPTIONS) return false;
  return new Set(cleaned).size === cleaned.length;
}
