/**
 * Dice notation parsing and rolling.
 *
 * Pure and free of React so the composer can roll at insert time and the tests
 * can pin the RNG. Nothing here throws: bad notation comes back as `null` so
 * callers can simply disable the roll button.
 */

/** Returns a uniform integer in `[1, sides]`. */
export type Rng = (sides: number) => number;

export interface KeepRule {
  /** 'h' keeps the highest `n`, 'l' the lowest. */
  mode: 'h' | 'l';
  n: number;
}

export interface DiceTerm {
  kind: 'dice';
  sign: 1 | -1;
  count: number;
  sides: number;
  keep?: KeepRule;
}

export interface ModTerm {
  kind: 'mod';
  /** Signed. */
  value: number;
}

export type Term = DiceTerm | ModTerm;

export interface DiceSpec {
  /** The notation as typed, normalised to lower case and single-spaced. */
  notation: string;
  terms: Term[];
}

export interface TermRoll {
  term: Term;
  /** Every die face rolled, in roll order. Empty for a modifier. */
  values: number[];
  /** The subset that counted after any keep rule. */
  kept: number[];
  /** Signed contribution to the total. */
  subtotal: number;
}

export interface DiceResult {
  spec: DiceSpec;
  rolls: TermRoll[];
  total: number;
}

// Abuse guards. A status body is small; nobody needs more than this, and the
// caps keep a pasted `9999d9999` from locking up the tab.
const MAX_NOTATION = 64;
const MAX_TERMS = 8;
const MAX_COUNT = 100;
const MAX_SIDES = 1000;
const MAX_TOTAL_DICE = 200;

const TERM_RE = /^(\d*)d(\d+)(?:k([hl])(\d+))?$/;

/** Uniform integer in `[1, sides]` from the platform CSPRNG, rejection-sampled. */
export const cryptoRng: Rng = (sides) => {
  const limit = Math.floor(0x100000000 / sides) * sides;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return (buf[0] % sides) + 1;
};

/**
 * Parse dice notation: `2d6+3`, `1d8+1d6-1`, `4d6kh3`, `adv d20+7`.
 * `adv`/`dis` are shorthand for rolling the first term twice and keeping the
 * highest/lowest one. Returns `null` for anything unparseable or out of bounds.
 */
export function parseDice(input: string): DiceSpec | null {
  const raw = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!raw || raw.length > MAX_NOTATION) return null;

  let body = raw;
  let advantage: 'h' | 'l' | null = null;
  const advMatch = /^(adv|dis)\b\s*/.exec(body);
  if (advMatch) {
    advantage = advMatch[1] === 'adv' ? 'h' : 'l';
    body = body.slice(advMatch[0].length);
  }
  if (!body) return null;

  // Split on +/- while keeping the operator that introduced each piece.
  const pieces = body.replace(/\s+/g, '').split(/(?=[+-])/);
  if (pieces.length > MAX_TERMS) return null;

  const terms: Term[] = [];
  let totalDice = 0;

  for (const piece of pieces) {
    let sign: 1 | -1 = 1;
    let text = piece;
    if (text.startsWith('+')) text = text.slice(1);
    else if (text.startsWith('-')) {
      sign = -1;
      text = text.slice(1);
    }
    if (!text) return null;

    if (/^\d+$/.test(text)) {
      terms.push({ kind: 'mod', value: sign * Number(text) });
      continue;
    }

    const m = TERM_RE.exec(text);
    if (!m) return null;
    const count = m[1] === '' ? 1 : Number(m[1]);
    const sides = Number(m[2]);
    if (count < 1 || count > MAX_COUNT) return null;
    if (sides < 2 || sides > MAX_SIDES) return null;

    const term: DiceTerm = { kind: 'dice', sign, count, sides };
    if (m[3]) {
      const n = Number(m[4]);
      if (n < 1 || n > count) return null;
      term.keep = { mode: m[3] as 'h' | 'l', n };
    }
    totalDice += count;
    terms.push(term);
  }

  if (terms.length === 0 || totalDice === 0 || totalDice > MAX_TOTAL_DICE) return null;

  if (advantage) {
    const first = terms.find((t): t is DiceTerm => t.kind === 'dice');
    // `adv 4d6kh3` is ambiguous, so only plain single-die terms take the alias.
    if (!first || first.keep || first.count !== 1) return null;
    first.count = 2;
    first.keep = { mode: advantage, n: 1 };
  }

  return { notation: raw, terms };
}

export function rollDice(spec: DiceSpec, rng: Rng = cryptoRng): DiceResult {
  const rolls: TermRoll[] = [];
  let total = 0;

  for (const term of spec.terms) {
    if (term.kind === 'mod') {
      rolls.push({ term, values: [], kept: [], subtotal: term.value });
      total += term.value;
      continue;
    }
    const values: number[] = [];
    for (let i = 0; i < term.count; i += 1) values.push(rng(term.sides));
    const kept = applyKeep(values, term.keep);
    const subtotal = term.sign * kept.reduce((a, b) => a + b, 0);
    rolls.push({ term, values, kept, subtotal });
    total += subtotal;
  }

  return { spec, rolls, total };
}

function applyKeep(values: number[], keep?: KeepRule): number[] {
  if (!keep) return values;
  const sorted = [...values].sort((a, b) => (keep.mode === 'h' ? b - a : a - b));
  return sorted.slice(0, keep.n);
}

/**
 * Render a result as the plain-text line that goes into the post body:
 * `🎲 2d6+3 ⇒ [4, 5] +3 = 12`. Every client shows this verbatim.
 */
export function formatRoll(result: DiceResult): string {
  const parts: string[] = [];

  result.rolls.forEach((roll, index) => {
    if (roll.term.kind === 'mod') {
      parts.push(roll.term.value < 0 ? `-${Math.abs(roll.term.value)}` : `+${roll.term.value}`);
      return;
    }
    const dice = `[${roll.values.join(', ')}]`;
    const keep = roll.term.keep ? ` k${roll.term.keep.mode}${roll.term.keep.n}` : '';
    const sign = roll.term.sign === -1 ? '-' : '+';
    parts.push(index === 0 ? `${roll.term.sign === -1 ? '-' : ''}${dice}${keep}` : `${sign} ${dice}${keep}`);
  });

  return `🎲 ${result.spec.notation} ⇒ ${parts.join(' ')} = ${result.total}`;
}

/**
 * Longest line `formatRoll` could produce for this spec — every die showing its
 * maximum face. Used by the composer's character counter so a pending `/roll`
 * can be budgeted without rerolling on every keystroke.
 */
export function maxFormattedLength(spec: DiceSpec): number {
  return formatRoll(rollDice(spec, (sides) => sides)).length;
}
