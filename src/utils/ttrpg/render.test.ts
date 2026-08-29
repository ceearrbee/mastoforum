import { describe, expect, it } from 'vitest';
import { enhanceTabletopHtml } from './render';
import { sanitizeStatusHtml } from '../sanitize';

/** Statuses arrive from the server as HTML, with newlines as <br>. */
const body = (...lines: string[]) => `<p>${lines.join('<br />')}</p>`;

describe('enhanceTabletopHtml', () => {
  it('wraps a dice line', () => {
    const html = enhanceTabletopHtml(body('🎲 2d6+3 ⇒ [4, 5] +3 = 12'));
    expect(html).toContain('<span class="tt-dice">🎲 2d6+3 ⇒ [4, 5] +3 = 12</span>');
  });

  it('wraps speech and marks the speaker separately', () => {
    const html = enhanceTabletopHtml(body('Grond: "We go left."'));
    expect(html).toContain('class="tt-speech"');
    expect(html).toContain('<span class="tt-speaker">Grond</span>');
  });

  it('wraps an inline OOC aside without swallowing the rest of the line', () => {
    const html = enhanceTabletopHtml(body('He scouts ahead. ((ooc: I have darkvision))'));
    expect(html).toContain('He scouts ahead. ');
    expect(html).toContain('<span class="tt-ooc">((ooc: I have darkvision))</span>');
  });

  it('groups the whole stat block under one wrapper', () => {
    const html = enhanceTabletopHtml(
      body('▣ Grond · Half-Orc Barbarian 3', 'HP 34/34 · AC 16', 'STR 18 (+4)'),
    );
    expect(html).toContain('class="tt-sheet"');
    const sheet = /<span class="tt-sheet">([\s\S]*?)<\/span>/.exec(html)?.[1] ?? '';
    expect(sheet).toContain('▣ Grond');
    expect(sheet).toContain('HP 34/34');
    expect(sheet).toContain('STR 18 (+4)');
  });

  it('ends a stat block at a blank line', () => {
    const html = enhanceTabletopHtml(body('▣ Grond', 'AC 16', '', 'He waits by the door.'));
    const sheet = /<span class="tt-sheet">([\s\S]*?)<\/span>/.exec(html)?.[1] ?? '';
    expect(sheet).toContain('AC 16');
    expect(sheet).not.toContain('He waits by the door.');
  });

  it('leaves ordinary prose alone', () => {
    // `<br />` re-serializes as `<br>`, so compare against the normalised form.
    const out = enhanceTabletopHtml(body('The corridor smells of iron.', 'Nobody speaks.'));
    expect(out).toBe('<p>The corridor smells of iron.<br>Nobody speaks.</p>');
    expect(out).not.toContain('tt-');
  });

  it('does not mistake a sentence with a colon for speech', () => {
    for (const line of [
      'One thing I learned today: never trust a wizard with a plan of any kind',
      'See here: https://example.com',
      'Note: this is a normal aside.',
    ]) {
      expect(enhanceTabletopHtml(body(line))).not.toContain('tt-speech');
    }
  });

  it('does not treat a partial dice-looking line as a roll', () => {
    expect(enhanceTabletopHtml(body('🎲 rolling later'))).not.toContain('tt-dice');
  });

  it('never rewrites markup, only text', () => {
    const html = enhanceTabletopHtml(
      '<p>Grond: "We go left." <a href="https://example.com" title="🎲 = 1">map</a></p>',
    );
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('title="🎲 = 1"');
    // The attribute must not have been turned into a wrapper.
    expect(html).not.toContain('title="<span');
  });

  it('leaves an existing tag untouched when a pattern spans it', () => {
    // The speaker is split across an <em>, so the line is not a clean match.
    const html = enhanceTabletopHtml('<p><em>Grond</em>: "We go left."</p>');
    expect(html).toContain('<em>Grond</em>');
  });

  it('handles a body with no block wrapper', () => {
    expect(enhanceTabletopHtml('🎲 d20 ⇒ [7] = 7')).toContain('tt-dice');
  });

  it('returns empty input unchanged', () => {
    expect(enhanceTabletopHtml('')).toBe('');
  });
});

describe('sanitizeStatusHtml with enhanceTabletop', () => {
  it('is off by default', () => {
    expect(sanitizeStatusHtml(body('🎲 d20 ⇒ [7] = 7'))).not.toContain('tt-dice');
  });

  it('enhances when asked', () => {
    const html = sanitizeStatusHtml(body('🎲 d20 ⇒ [7] = 7'), [], { enhanceTabletop: true });
    expect(html).toContain('tt-dice');
  });

  it('cannot be used to smuggle markup past the sanitizer', () => {
    const hostile =
      '<p>🎲 d20 ⇒ [7] = 7<br /><img src=x onerror=alert(1)><br />' +
      '<span class="tt-sheet" onclick="alert(1)">▣ x</span>' +
      '<script>alert(1)</script></p>';
    const html = sanitizeStatusHtml(hostile, [], { enhanceTabletop: true });
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onclick');
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/<script/i);
    // The legitimate enhancement still happened.
    expect(html).toContain('<span class="tt-dice">');
  });

  it('leaves an escaped payload escaped — it is text, not markup', () => {
    const escaped = '<p>▣ Grond<br />&lt;img src=x onerror=alert(1)&gt;</p>';
    const html = sanitizeStatusHtml(escaped, [], { enhanceTabletop: true });
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toMatch(/<img/i);
  });
});
