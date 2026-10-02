import type { mastodon } from 'masto';
import { displayNameOf, displayStatus } from '../status';

export interface InitiativeEntry {
  statusId: string;
  name: string;
  roll: number;
  acct: string;
}

/** Matches a d20 dice roll, e.g. `🎲 d20+3 ⇒ [14] +3 = 17` or `🎲 adv d20+5 ⇒ [18, 9] +5 = 23`. */
const D20_ROLL = /🎲\s+(?:adv\s+|dis\s+)?d20(?:\s*[+-]\s*\d+)?\b[^\n=]*=\s*(-?\d+)/i;

/** Matches speech like `Grond: "Attack!"`. */
const SPEECH_LINE = /^\s*([^\s:][^:\n]{0,31}?)\s*:\s+"[^"]{1,400}"\s*$/m;

/** Matches stat block header `▣ Grond · Half-Orc...`. */
const SHEET_HEAD = /^\s*▣\s*([^·\n]+)/m;

function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Extracts a character name from a status body if present, falling back
 * to the account's display name.
 */
function extractName(text: string, defaultName: string): string {
  const sheet = SHEET_HEAD.exec(text);
  if (sheet?.[1]?.trim()) return sheet[1].trim();

  const speech = SPEECH_LINE.exec(text);
  if (speech?.[1]?.trim()) return speech[1].trim();

  return defaultName;
}

/**
 * Scans statuses in a thread to extract d20 initiative rolls.
 * Deduplicates by participant name, keeping their latest roll, and sorts descending.
 */
export function extractInitiative(statuses: mastodon.v1.Status[]): InitiativeEntry[] {
  const byName = new Map<string, InitiativeEntry>();

  for (const raw of statuses) {
    const post = displayStatus(raw);
    const content = htmlToPlainText(post.content || '');
    const match = D20_ROLL.exec(content);
    if (!match) continue;

    const roll = Number(match[1]);
    if (!Number.isFinite(roll)) continue;

    const defaultName = displayNameOf(post.account) || post.account.username || 'Adventurer';
    const name = extractName(content, defaultName);

    // Later posts in thread walk order overwrite earlier rolls for the same character
    byName.set(name.toLowerCase(), {
      statusId: post.id,
      name,
      roll,
      acct: post.account.acct,
    });
  }

  return Array.from(byName.values()).sort((a, b) => b.roll - a.roll);
}
