import { describe, expect, it } from 'vitest';
import { sanitizeStatusHtml, stripHtml, truncate } from './sanitize';

describe('sanitizeStatusHtml', () => {
  it('strips <script> payloads', () => {
    const dirty = '<p>hi</p><script>alert(1)</script>';
    expect(sanitizeStatusHtml(dirty)).not.toContain('script');
    expect(sanitizeStatusHtml(dirty)).toContain('hi');
  });

  it('strips on-event handlers', () => {
    const dirty = '<a href="x" onclick="steal()">go</a>';
    const clean = sanitizeStatusHtml(dirty);
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('href="x"');
  });

  it('strips javascript: URLs', () => {
    const dirty = '<a href="javascript:alert(1)">x</a>';
    expect(sanitizeStatusHtml(dirty).toLowerCase()).not.toContain('javascript:');
  });

  it('pins target=_blank and rel=noopener on anchors', () => {
    const clean = sanitizeStatusHtml('<a href="https://example.com">x</a>');
    expect(clean).toContain('target="_blank"');
    expect(clean).toContain('rel="noopener noreferrer nofollow"');
  });

  it('disallows <img> tags so onerror exfil cannot fire', () => {
    const dirty = '<img src="x" onerror="alert(1)">';
    expect(sanitizeStatusHtml(dirty)).not.toContain('<img');
  });

  it('keeps Mastodon-style mention spans', () => {
    const dirty = '<p><span class="h-card"><a href="x" class="u-url mention">@user</a></span></p>';
    const clean = sanitizeStatusHtml(dirty);
    expect(clean).toContain('span');
    expect(clean).toContain('@user');
  });

  it('survives empty / null input', () => {
    expect(sanitizeStatusHtml('')).toBe('');
    expect(sanitizeStatusHtml(null as unknown as string)).toBe('');
  });
});

describe('stripHtml', () => {
  it('strips all tags but keeps text', () => {
    expect(stripHtml('<p>hello <b>world</b></p>')).toBe('hello world');
  });

  it('neutralises script tags without executing', () => {
    expect(stripHtml('<script>alert(1)</script>x')).toContain('x');
  });
});

describe('truncate', () => {
  it('passes through strings under the limit', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('appends ellipsis when over the limit', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcde…');
  });
});
