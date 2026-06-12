import { describe, expect, it } from 'vitest';
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
});
