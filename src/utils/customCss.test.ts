import { afterEach, describe, expect, it, vi } from 'vitest';
import { sanitizeCustomCss } from './customCss';

describe('sanitizeCustomCss', () => {
  it('returns empty for blank input', () => {
    expect(sanitizeCustomCss('')).toEqual({ css: '' });
    expect(sanitizeCustomCss('   ')).toEqual({ css: '' });
  });

  it('scopes rules under .app-root', () => {
    const { css } = sanitizeCustomCss('.topic { color: red; }');
    expect(css).toContain('.app-root .topic');
    expect(css).toContain('red');
  });

  it('maps html/body/:root to .app-root', () => {
    const { css } = sanitizeCustomCss('body { color: blue; }');
    expect(css).toContain('.app-root');
    expect(css).not.toMatch(/(^|[^-])\bbody\b/);
  });

  it('blocks @import and warns', () => {
    const { css, warning } = sanitizeCustomCss('@import url("https://evil.example/x.css");');
    expect(css).not.toContain('@import');
    expect(css).not.toContain('evil.example');
    expect(warning).toMatch(/import/i);
  });

  it('strips remote url() but keeps data: urls', () => {
    const remote = sanitizeCustomCss('.a { background: url(https://e.example/p.png); }');
    expect(remote.css).not.toContain('https://e.example');
    expect(remote.warning).toMatch(/remote/i);

    const data = sanitizeCustomCss('.b { background: url(data:image/gif;base64,AAAA); }');
    expect(data.css).toContain('data:image/gif');
  });

  it('scopes rules inside @layer blocks', () => {
    const { css } = sanitizeCustomCss('@layer base { body { color: red; } .a { color: blue; } }');
    expect(css).toContain('@layer base');
    expect(css).toContain('.app-root .a');
    expect(css).not.toMatch(/\bbody\b/);
    expect(css).not.toMatch(/\{\s*\.a\b/);
  });

  it('scopes rules inside @container blocks', () => {
    const { css } = sanitizeCustomCss('@container (min-width: 10px) { .b { color: red; } }');
    expect(css).toContain('@container (min-width: 10px)');
    expect(css).toContain('.app-root .b');
    expect(css).not.toMatch(/\{\s*\.b\b/);
  });

  it('recurses through nested grouping rules and strips remote urls there', () => {
    const { css, warning } = sanitizeCustomCss(
      '@layer l { @media (min-width: 1px) { .j { color: red; background: url(https://e.example/p.png); } } }',
    );
    expect(css).toContain('.app-root .j');
    expect(css).not.toContain('e.example');
    expect(warning).toMatch(/remote/i);
  });

  it('does not split selectors on commas inside parentheses', () => {
    const { css } = sanitizeCustomCss('.c:is(a, b), .d { color: red; }');
    expect(css).toContain('.app-root .c:is(a, b), .app-root .d');
  });

  it('does not split selectors on commas inside attribute strings', () => {
    const { css } = sanitizeCustomCss('a[title="x, y"], .d { color: red; }');
    expect(css).toContain('.app-root a[title="x, y"], .app-root .d');
  });

  describe('without a CSSOM (regex fallback)', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('strips a quoted remote URL inside image-set()', () => {
      vi.stubGlobal('document', undefined);
      const { css, warning } = sanitizeCustomCss(
        '.a { background-image: image-set("https://e.example/p.png" 1x, "//e.example/q.png" 2x); }',
      );
      expect(css).not.toContain('e.example');
      expect(warning).toMatch(/remote/i);
    });

    it('strips remote URLs inside -webkit-image-set() with single quotes', () => {
      vi.stubGlobal('document', undefined);
      const { css } = sanitizeCustomCss(".a { background-image: -webkit-image-set('http://e.example/p.png' 1x); }");
      expect(css).not.toContain('e.example');
    });

    it('keeps data: URLs inside image-set()', () => {
      vi.stubGlobal('document', undefined);
      const { css } = sanitizeCustomCss('.a { background-image: image-set("data:image/gif;base64,AAAA" 1x); }');
      expect(css).toContain('data:image/gif');
    });
  });
});
