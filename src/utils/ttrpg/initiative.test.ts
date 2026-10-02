import { describe, expect, it } from 'vitest';
import type { mastodon } from 'masto';
import { extractInitiative } from './initiative';

function fakeStatus(
  id: string,
  content: string,
  account = { id: 'a1', acct: 'ada@social', displayName: 'Ada', username: 'ada' },
): mastodon.v1.Status {
  return {
    id,
    content,
    createdAt: new Date().toISOString(),
    account,
  } as unknown as mastodon.v1.Status;
}

describe('extractInitiative', () => {
  it('extracts d20 rolls and orders by highest roll first', () => {
    const p1 = fakeStatus(
      '1',
      '<p>Grond: "Ready!"<br />🎲 d20+3 ⇒ [15] +3 = 18</p>',
      { id: 'a1', acct: 'bob@rpg', displayName: 'Bob', username: 'bob' },
    );
    const p2 = fakeStatus(
      '2',
      '<p>Vex: "I strike from the shadows"<br />🎲 adv d20+5 ⇒ [18, 9] +5 = 23</p>',
      { id: 'a2', acct: 'alice@rpg', displayName: 'Alice', username: 'alice' },
    );
    const p3 = fakeStatus(
      '3',
      '<p>Just regular speech with no roll.</p>',
    );

    const result = extractInitiative([p1, p2, p3]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      statusId: '2',
      name: 'Vex',
      roll: 23,
      acct: 'alice@rpg',
    });
    expect(result[1]).toEqual({
      statusId: '1',
      name: 'Grond',
      roll: 18,
      acct: 'bob@rpg',
    });
  });

  it('falls back to account display name if no character is spoken', () => {
    const p = fakeStatus('1', '<p>🎲 d20 ⇒ [12] = 12</p>');
    const result = extractInitiative([p]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Ada');
    expect(result[0].roll).toBe(12);
  });

  it('extracts character name from stat block header', () => {
    const p = fakeStatus(
      '1',
      '<p>▣ Thorin Ironbreaker · Dwarf 4<br />🎲 d20+1 ⇒ [9] +1 = 10</p>',
    );
    const result = extractInitiative([p]);
    expect(result[0].name).toBe('Thorin Ironbreaker');
    expect(result[0].roll).toBe(10);
  });

  it('keeps the latest roll per character', () => {
    const r1 = fakeStatus('1', '<p>Grond: "First round"<br />🎲 d20 ⇒ [8] = 8</p>');
    const r2 = fakeStatus('2', '<p>Grond: "Next round"<br />🎲 d20 ⇒ [16] = 16</p>');

    const result = extractInitiative([r1, r2]);
    expect(result).toHaveLength(1);
    expect(result[0].roll).toBe(16);
    expect(result[0].statusId).toBe('2');
  });

  it('ignores non-d20 dice rolls', () => {
    const p = fakeStatus('1', '<p>Damage: 🎲 2d6+3 ⇒ [4, 5] +3 = 12</p>');
    expect(extractInitiative([p])).toHaveLength(0);
  });
});
