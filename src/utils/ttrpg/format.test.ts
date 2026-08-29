import { describe, expect, it } from 'vitest';
import {
  abilityModifier,
  estimateResolvedContent,
  formatOoc,
  formatSheet,
  formatSpeech,
  hasPendingRolls,
  resolveRollCommands,
  type CharacterSheet,
} from './format';

const sheet = (overrides: Partial<CharacterSheet> = {}): CharacterSheet => ({
  name: '',
  descriptor: '',
  hp: '',
  ac: '',
  speed: '',
  abilities: {},
  notes: '',
  ...overrides,
});

describe('formatSpeech', () => {
  it('renders speaker and line', () => {
    expect(formatSpeech('Grond', 'We go left.')).toBe('Grond: "We go left."');
  });

  it('does not double quotes the user typed', () => {
    expect(formatSpeech('Grond', '"We go left."')).toBe('Grond: "We go left."');
    expect(formatSpeech('Grond', '“We go left.”')).toBe('Grond: "We go left."');
  });

  it('collapses stray whitespace', () => {
    expect(formatSpeech('  Sister   Vex ', ' Hold\t the line ')).toBe(
      'Sister Vex: "Hold the line"',
    );
  });

  it('returns empty when either half is missing', () => {
    expect(formatSpeech('', 'hi')).toBe('');
    expect(formatSpeech('Grond', '   ')).toBe('');
  });
});

describe('formatOoc', () => {
  it('wraps the note in the double-paren convention', () => {
    expect(formatOoc('I have darkvision')).toBe('((ooc: I have darkvision))');
  });

  it('returns empty for a blank note', () => {
    expect(formatOoc('  ')).toBe('');
  });
});

describe('abilityModifier', () => {
  it('follows the standard table', () => {
    expect(abilityModifier('18')).toBe(4);
    expect(abilityModifier('10')).toBe(0);
    expect(abilityModifier('8')).toBe(-1);
    expect(abilityModifier('1')).toBe(-5);
  });

  it('gives up on non-numeric scores', () => {
    expect(abilityModifier('d20')).toBeNull();
  });
});

describe('formatSheet', () => {
  it('needs a name', () => {
    expect(formatSheet(sheet({ hp: '34/34' }))).toBe('');
  });

  it('renders a one-line sheet when only a name is given', () => {
    expect(formatSheet(sheet({ name: 'Grond' }))).toBe('▣ Grond');
  });

  it('renders the full block with computed modifiers', () => {
    const text = formatSheet(
      sheet({
        name: 'Grond',
        descriptor: 'Half-Orc Barbarian 3',
        hp: '34/34',
        ac: '16',
        speed: '30',
        abilities: { STR: '18', DEX: '12', CON: '16', INT: '8', WIS: '10', CHA: '10' },
        notes: 'Rage 3/day',
      }),
    );
    expect(text).toBe(
      [
        '▣ Grond · Half-Orc Barbarian 3',
        'HP 34/34 · AC 16 · Speed 30',
        'STR 18 (+4) · DEX 12 (+1) · CON 16 (+3)',
        'INT 8 (-1) · WIS 10 (+0) · CHA 10 (+0)',
        'Rage 3/day',
      ].join('\n'),
    );
  });

  it('omits lines for fields that were left blank', () => {
    expect(formatSheet(sheet({ name: 'Grond', ac: '16', abilities: { STR: '18' } }))).toBe(
      ['▣ Grond', 'AC 16', 'STR 18 (+4)'].join('\n'),
    );
  });
});

describe('resolveRollCommands', () => {
  const max = (sides: number) => sides;

  it('replaces a whole-line command with the rolled result', () => {
    expect(resolveRollCommands('/roll 2d6+3', max)).toBe('🎲 2d6+3 ⇒ [6, 6] +3 = 15');
  });

  it('keeps surrounding lines and indentation intact', () => {
    const input = 'He swings.\n  /roll d20+7\nAnd waits.';
    expect(resolveRollCommands(input, max)).toBe(
      'He swings.\n  🎲 d20+7 ⇒ [20] +7 = 27\nAnd waits.',
    );
  });

  it('resolves every command in the body', () => {
    const out = resolveRollCommands('/roll d4\n/roll d6', max);
    expect(out).toBe('🎲 d4 ⇒ [4] = 4\n🎲 d6 ⇒ [6] = 6');
  });

  it('leaves unparseable notation exactly as typed', () => {
    expect(resolveRollCommands('/roll sideways', max)).toBe('/roll sideways');
    expect(resolveRollCommands('/roll 999d999', max)).toBe('/roll 999d999');
  });

  it('ignores a /roll that is not at the start of a line', () => {
    expect(resolveRollCommands('say /roll 2d6 to roll', max)).toBe('say /roll 2d6 to roll');
  });

  it('leaves a body with no commands untouched', () => {
    const prose = 'The corridor smells of iron.\n\nNobody speaks.';
    expect(resolveRollCommands(prose, max)).toBe(prose);
  });
});

describe('estimateResolvedContent', () => {
  it('never under-counts an actual roll', () => {
    const body = 'Attack!\n/roll 4d6kh3+10\nDone.';
    const estimate = estimateResolvedContent(body).length;
    for (let i = 0; i < 50; i += 1) {
      expect(resolveRollCommands(body).length).toBeLessThanOrEqual(estimate);
    }
  });

  it('leaves text without commands unchanged', () => {
    expect(estimateResolvedContent('just words')).toBe('just words');
  });
});

describe('hasPendingRolls', () => {
  it('reports a resolvable command', () => {
    expect(hasPendingRolls('/roll 2d6')).toBe(true);
  });

  it('ignores commands we could not roll anyway', () => {
    expect(hasPendingRolls('/roll sideways')).toBe(false);
    expect(hasPendingRolls('no dice here')).toBe(false);
  });

  it('is not affected by a previous call', () => {
    expect(hasPendingRolls('/roll d20')).toBe(true);
    expect(hasPendingRolls('/roll d20')).toBe(true);
  });
});
