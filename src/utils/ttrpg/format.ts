/**
 * Builders for the plain-text tabletop conventions, plus the post-time
 * resolution of `/roll` commands.
 *
 * Everything here emits text that reads correctly in any Mastodon client —
 * there is no private markup. MastoForum recognises the same conventions on
 * render (see `./render.ts`) and styles them, but the meaning survives without.
 */
import { formatRoll, maxFormattedLength, parseDice, rollDice, type Rng } from './dice';

export const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
export type Ability = (typeof ABILITIES)[number];

export interface CharacterSheet {
  name: string;
  /** Free text: ancestry, class, level — "Half-Orc Barbarian 3". */
  descriptor: string;
  hp: string;
  ac: string;
  speed: string;
  abilities: Partial<Record<Ability, string>>;
  notes: string;
}

export const SHEET_MARK = '▣';
const SEP = ' · ';

const clean = (value: string) => value.trim().replace(/\s+/g, ' ');

/** `Grond: "We go left."` */
export function formatSpeech(speaker: string, line: string): string {
  const who = clean(speaker);
  // Drop quotes the user typed themselves so we don't double them up.
  const said = clean(line).replace(/^["“”']+|["“”']+$/g, '');
  if (!who || !said) return '';
  return `${who}: "${said}"`;
}

/** `((ooc: I have darkvision))` */
export function formatOoc(text: string): string {
  const body = clean(text);
  return body ? `((ooc: ${body}))` : '';
}

/** D&D-style ability modifier, or `null` when the score isn't a number. */
export function abilityModifier(score: string): number | null {
  const n = Number(clean(score));
  if (!Number.isFinite(n)) return null;
  return Math.floor((n - 10) / 2);
}

function abilityCell(key: Ability, score: string): string {
  const mod = abilityModifier(score);
  const value = clean(score);
  if (mod === null) return `${key} ${value}`;
  return `${key} ${value} (${mod >= 0 ? '+' : '-'}${Math.abs(mod)})`;
}

/**
 * A compact stat block. Lines are emitted only for the fields that were filled
 * in, so a one-line sheet stays one line.
 */
export function formatSheet(sheet: CharacterSheet): string {
  const name = clean(sheet.name);
  if (!name) return '';

  const lines: string[] = [];
  const descriptor = clean(sheet.descriptor);
  lines.push(`${SHEET_MARK} ${descriptor ? `${name}${SEP}${descriptor}` : name}`);

  const vitals = [
    clean(sheet.hp) && `HP ${clean(sheet.hp)}`,
    clean(sheet.ac) && `AC ${clean(sheet.ac)}`,
    clean(sheet.speed) && `Speed ${clean(sheet.speed)}`,
  ].filter(Boolean);
  if (vitals.length > 0) lines.push(vitals.join(SEP));

  const cells = ABILITIES.filter((key) => clean(sheet.abilities[key] ?? '')).map((key) =>
    abilityCell(key, sheet.abilities[key] ?? ''),
  );
  // Three per line keeps each row short enough to survive a narrow column.
  for (let i = 0; i < cells.length; i += 3) {
    lines.push(cells.slice(i, i + 3).join(SEP));
  }

  const notes = clean(sheet.notes);
  if (notes) lines.push(notes);

  return lines.join('\n');
}

/** Matches a whole line of the form `/roll 2d6+3`. */
const ROLL_COMMAND = /^([ \t]*)\/roll[ \t]+(.+?)[ \t]*$/gm;

/**
 * Replace every `/roll <notation>` line with its rolled result. Notation we
 * can't parse is left exactly as typed, so a stray `/roll` never eats text.
 */
export function resolveRollCommands(content: string, rng?: Rng): string {
  return content.replace(ROLL_COMMAND, (match, indent: string, notation: string) => {
    const spec = parseDice(notation);
    if (!spec) return match;
    return `${indent}${formatRoll(rollDice(spec, rng))}`;
  });
}

/**
 * The longest body the pending `/roll` commands could resolve to — every die
 * showing its maximum face. The character counter uses this so the budget is
 * honest without rerolling on every keystroke.
 */
export function estimateResolvedContent(content: string): string {
  return content.replace(ROLL_COMMAND, (match, indent: string, notation: string) => {
    const spec = parseDice(notation);
    if (!spec) return match;
    // A filler string of the worst-case width; only its length matters here.
    return `${indent}${'x'.repeat(maxFormattedLength(spec))}`;
  });
}

/** Whether the body still holds an unresolved, resolvable `/roll`. */
export function hasPendingRolls(content: string): boolean {
  ROLL_COMMAND.lastIndex = 0;
  for (const match of content.matchAll(ROLL_COMMAND)) {
    if (parseDice(match[2])) return true;
  }
  return false;
}
