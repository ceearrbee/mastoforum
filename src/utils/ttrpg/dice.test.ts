import { describe, expect, it } from 'vitest';
import { formatRoll, maxFormattedLength, parseDice, rollDice, type Rng } from './dice';

/** Every die shows its maximum face — deterministic for assertions. */
const maxRng: Rng = (sides) => sides;
/** Every die shows 1. */
const minRng: Rng = () => 1;
/** Walks a fixed script of faces, so keep-rules can be checked exactly. */
const scripted = (values: number[]): Rng => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('parseDice', () => {
  it('parses a single die with an implicit count', () => {
    expect(parseDice('d20')).toEqual({
      notation: 'd20',
      terms: [{ kind: 'dice', sign: 1, count: 1, sides: 20 }],
    });
  });

  it('parses a count, sides and modifier', () => {
    expect(parseDice('2d6+3')?.terms).toEqual([
      { kind: 'dice', sign: 1, count: 2, sides: 6 },
      { kind: 'mod', value: 3 },
    ]);
  });

  it('parses several dice terms and a negative modifier', () => {
    expect(parseDice('1d8+1d6-1')?.terms).toEqual([
      { kind: 'dice', sign: 1, count: 1, sides: 8 },
      { kind: 'dice', sign: 1, count: 1, sides: 6 },
      { kind: 'mod', value: -1 },
    ]);
  });

  it('parses keep-highest and keep-lowest', () => {
    expect(parseDice('4d6kh3')?.terms[0]).toEqual({
      kind: 'dice',
      sign: 1,
      count: 4,
      sides: 6,
      keep: { mode: 'h', n: 3 },
    });
    expect(parseDice('2d20kl1')?.terms[0]).toMatchObject({ keep: { mode: 'l', n: 1 } });
  });

  it('expands adv/dis into a doubled roll with a keep rule', () => {
    expect(parseDice('adv d20+7')?.terms[0]).toEqual({
      kind: 'dice',
      sign: 1,
      count: 2,
      sides: 20,
      keep: { mode: 'h', n: 1 },
    });
    expect(parseDice('dis d20')?.terms[0]).toMatchObject({ keep: { mode: 'l', n: 1 } });
  });

  it('is case- and whitespace-insensitive', () => {
    expect(parseDice('  ADV D20 + 7 ')?.terms).toEqual(parseDice('adv d20+7')?.terms);
  });

  it('rejects notation that is not dice', () => {
    for (const bad of ['', 'hello', '20', 'd', '2d', 'd20d20', '2d6+', '+', '2d6 kh3 kh3']) {
      expect(parseDice(bad)).toBeNull();
    }
  });

  it('rejects out-of-bounds dice so a pasted string cannot lock the tab', () => {
    expect(parseDice('101d6')).toBeNull();
    expect(parseDice('1d1001')).toBeNull();
    expect(parseDice('1d1')).toBeNull();
    expect(parseDice('100d6+100d6+100d6')).toBeNull();
    expect(parseDice('1d6+'.repeat(9) + '1')).toBeNull();
    expect(parseDice(`1d6${'+1'.repeat(40)}`)).toBeNull();
  });

  it('rejects a keep rule that outruns the dice pool', () => {
    expect(parseDice('2d6kh3')).toBeNull();
    expect(parseDice('2d6kh0')).toBeNull();
  });

  it('rejects adv on a term where it would be ambiguous', () => {
    expect(parseDice('adv 4d6kh3')).toBeNull();
    expect(parseDice('adv 2d20')).toBeNull();
  });
});

describe('rollDice', () => {
  it('sums dice and modifiers', () => {
    const spec = parseDice('2d6+3')!;
    expect(rollDice(spec, maxRng).total).toBe(15);
    expect(rollDice(spec, minRng).total).toBe(5);
  });

  it('subtracts a negative dice term', () => {
    const spec = parseDice('2d6-1d4')!;
    expect(rollDice(spec, maxRng).total).toBe(12 - 4);
  });

  it('keeps the highest dice', () => {
    const result = rollDice(parseDice('4d6kh3')!, scripted([1, 6, 3, 5]));
    expect(result.rolls[0].values).toEqual([1, 6, 3, 5]);
    expect(result.rolls[0].kept).toEqual([6, 5, 3]);
    expect(result.total).toBe(14);
  });

  it('keeps the lowest dice', () => {
    const result = rollDice(parseDice('dis d20')!, scripted([18, 4]));
    expect(result.rolls[0].kept).toEqual([4]);
    expect(result.total).toBe(4);
  });

  it('is deterministic for a fixed rng', () => {
    const spec = parseDice('3d8+2')!;
    const a = rollDice(spec, scripted([2, 5, 7]));
    const b = rollDice(spec, scripted([2, 5, 7]));
    expect(a).toEqual(b);
  });

  it('stays within range with the real rng', () => {
    const spec = parseDice('4d6')!;
    for (let i = 0; i < 50; i += 1) {
      const total = rollDice(spec).total;
      expect(total).toBeGreaterThanOrEqual(4);
      expect(total).toBeLessThanOrEqual(24);
    }
  });
});

describe('formatRoll', () => {
  it('renders the plain-text line other clients will see', () => {
    expect(formatRoll(rollDice(parseDice('2d6+3')!, scripted([4, 5])))).toBe(
      '🎲 2d6+3 ⇒ [4, 5] +3 = 12',
    );
  });

  it('shows the keep rule and the discarded dice', () => {
    expect(formatRoll(rollDice(parseDice('adv d20+7')!, scripted([18, 4])))).toBe(
      '🎲 adv d20+7 ⇒ [18, 4] kh1 +7 = 25',
    );
  });

  it('renders several terms', () => {
    expect(formatRoll(rollDice(parseDice('1d8+1d6-1')!, scripted([3, 2])))).toBe(
      '🎲 1d8+1d6-1 ⇒ [3] + [2] -1 = 4',
    );
  });
});

describe('maxFormattedLength', () => {
  it('is never shorter than an actual roll of the same spec', () => {
    const spec = parseDice('4d6kh3+10')!;
    const max = maxFormattedLength(spec);
    for (let i = 0; i < 50; i += 1) {
      expect(formatRoll(rollDice(spec)).length).toBeLessThanOrEqual(max);
    }
  });
});
