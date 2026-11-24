import { describe, expect, it } from 'vitest';
import type { mastodon } from 'masto';
import { previewHtml, previewText, statusTitle, UNTITLED_TOPIC } from './status';
import { TOPIC_PREVIEW_CHARS } from '../config';

const status = (extra: Partial<mastodon.v1.Status>) =>
  ({ content: '', spoilerText: '', ...extra }) as unknown as mastodon.v1.Status;

describe('previewHtml', () => {
  it('strips markup and decodes entities', () => {
    expect(previewHtml('<p>Tom &amp; <b>Jerry</b></p>', 50)).toBe('Tom & Jerry');
  });

  it('truncates past the limit with an ellipsis', () => {
    expect(previewHtml('<p>abcdefghij</p>', 5)).toBe('abcde…');
  });
});

describe('previewText', () => {
  it('previews the status content with the same rules as previewHtml', () => {
    const s = status({ content: '<p>abcdefghij</p>' });
    expect(previewText(s, 5)).toBe(previewHtml(s.content, 5));
  });
});

describe('statusTitle', () => {
  it('prefers spoiler text', () => {
    expect(statusTitle(status({ spoilerText: 'CW', content: '<p>body</p>' }))).toBe('CW');
  });

  it('falls back to a truncated content preview', () => {
    const long = 'x'.repeat(TOPIC_PREVIEW_CHARS + 20);
    expect(statusTitle(status({ content: `<p>${long}</p>` }))).toBe(
      `${'x'.repeat(TOPIC_PREVIEW_CHARS)}…`,
    );
  });

  it('uses the untitled fallback for an empty post', () => {
    expect(statusTitle(status({}))).toBe(UNTITLED_TOPIC);
  });
});
