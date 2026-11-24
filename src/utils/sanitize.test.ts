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

  describe('custom emoji', () => {
    const emojis = [{ shortcode: 'blobcat', url: 'https://cdn.example/blobcat.png' }];

    it('replaces a shortcode in text with an <img>', () => {
      const clean = sanitizeStatusHtml('<p>hi :blobcat:</p>', emojis);
      expect(clean).toContain('<img');
      expect(clean).toContain('src="https://cdn.example/blobcat.png"');
      expect(clean).toContain('class="custom-emoji"');
    });

    it('does not inject <img> into href or title attributes', () => {
      const html = '<a href="https://x.example/:blobcat:" title="a :blobcat: b">link</a>';
      const clean = sanitizeStatusHtml(html, emojis);
      expect(clean).not.toContain('<img');
      expect(clean).toContain('href="https://x.example/:blobcat:"');
      expect(clean).toContain('title="a :blobcat: b"');
    });

    it('drops a remote <img class="custom-emoji"> that is not from the emojis array', () => {
      const html = '<p>x <img class="custom-emoji" src="https://track.example/p.gif"></p>';
      expect(sanitizeStatusHtml(html, emojis)).not.toContain('track.example');
      expect(sanitizeStatusHtml(html)).not.toContain('<img');
    });

    it('ignores emoji whose url is not http(s)', () => {
      const bad = [{ shortcode: 'bad', url: 'javascript:alert(1)' }];
      expect(sanitizeStatusHtml('<p>:bad:</p>', bad)).not.toContain('<img');
    });
  });

  describe('class allowlist', () => {
    it('keeps the classes Mastodon emits', () => {
      const html =
        '<p><span class="h-card"><a href="https://a.example/@u" class="u-url mention">@<span>u</span></a></span> ' +
        '<a href="https://a.example/tags/t" class="mention hashtag">#<span>t</span></a> ' +
        '<a href="https://a.example/l"><span class="invisible">https://</span><span class="ellipsis">a.example/l</span></a></p>' +
        '<p class="quote-inline">RE: x</p>';
      const clean = sanitizeStatusHtml(html);
      for (const cls of ['h-card', 'u-url', 'mention', 'hashtag', 'invisible', 'ellipsis', 'quote-inline']) {
        expect(clean).toContain(cls);
      }
    });

    it('strips cds--* and other unlisted classes', () => {
      const clean = sanitizeStatusHtml(
        '<p class="cds--modal is-visible">a</p><a href="https://x.example" class="mention cds--btn evil">b</a>',
      );
      expect(clean).not.toContain('cds--');
      expect(clean).not.toContain('evil');
      expect(clean).not.toContain('is-visible');
      expect(clean).toContain('class="mention"');
    });
  });
});

describe('stripHtml', () => {
  it('strips all tags but keeps text', () => {
    expect(stripHtml('<p>hello <b>world</b></p>')).toBe('hello world');
  });

  it('neutralises script tags without executing', () => {
    expect(stripHtml('<script>alert(1)</script>x')).toContain('x');
  });

  it('decodes entities instead of returning serialized HTML', () => {
    expect(stripHtml('<p>Tom &amp; Jerry &lt;3</p>')).toBe('Tom & Jerry <3');
  });

  it('turns paragraph boundaries and <br> into newlines', () => {
    expect(stripHtml('<p>one</p><p>two</p>')).toBe('one\n\ntwo');
    expect(stripHtml('<p>a<br>b<br/>c</p>')).toBe('a\nb\nc');
  });

  it('does not execute or keep markup that is escaped in text', () => {
    expect(stripHtml('<p>&lt;script&gt;x&lt;/script&gt;</p>')).toBe('<script>x</script>');
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
