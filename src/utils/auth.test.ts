import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  base64Url,
  buildPkceChallenge,
  getActiveInstanceUrl,
  handleMastodonCallback,
  listAccounts,
  logoutMastodon,
  migrateLegacyAccount,
  normaliseInstanceUrl,
  switchActiveAccount,
} from './auth';

describe('normaliseInstanceUrl', () => {
  it('prepends https when scheme missing', () => {
    expect(normaliseInstanceUrl('mastodon.social')).toBe('https://mastodon.social');
  });

  it('preserves explicit http scheme', () => {
    expect(normaliseInstanceUrl('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('trims whitespace and trailing slashes', () => {
    expect(normaliseInstanceUrl('  https://example.com/// ')).toBe('https://example.com');
  });

  it('rejects empty input', () => {
    expect(() => normaliseInstanceUrl('   ')).toThrow();
  });
});

describe('base64Url', () => {
  it('produces url-safe output with no padding', () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]);
    const out = base64Url(bytes);
    expect(out).not.toContain('=');
    expect(out).not.toContain('+');
    expect(out).not.toContain('/');
  });
});

describe('buildPkceChallenge', () => {
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

  const EXPECTED = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

  it('uses S256 with the native digest in a secure context', async () => {
    const { challenge, method } = await buildPkceChallenge(verifier);
    expect(method).toBe('S256');
    expect(challenge).toBe(EXPECTED);
  });

  it('stays S256 via the JS SHA-256 fallback when crypto.subtle is unavailable', async () => {
    // Simulate an insecure context (plain HTTP): getRandomValues stays, subtle is gone.
    vi.stubGlobal('crypto', {
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    });
    try {
      const { challenge, method } = await buildPkceChallenge(verifier);
      expect(method).toBe('S256');
      expect(challenge).toBe(EXPECTED);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('handleMastodonCallback', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('rejects when state does not match', async () => {
    sessionStorage.setItem('masto_oauth_state', 'expected');
    sessionStorage.setItem('masto_code_verifier', 'v');
    sessionStorage.setItem('masto_pending_instance', 'https://example.com');
    sessionStorage.setItem('masto_pending_client_id', 'c');
    await expect(handleMastodonCallback('code', 'tampered')).rejects.toThrow(/state mismatch/i);
  });

  it('rejects when state is missing', async () => {
    await expect(handleMastodonCallback('code', 'whatever')).rejects.toThrow(/state mismatch/i);
  });

  it('exchanges code for token when state matches', async () => {
    sessionStorage.setItem('masto_oauth_state', 's');
    sessionStorage.setItem('masto_code_verifier', 'v');
    sessionStorage.setItem('masto_pending_instance', 'https://example.com');
    sessionStorage.setItem('masto_pending_client_id', 'c');

    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 });
      }
      if (url.endsWith('/api/v2/instance')) {
        return new Response(JSON.stringify({ configuration: {} }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await handleMastodonCallback('code', 's');

    expect(localStorage.getItem('masto_access_token')).toBe('tok');
    expect(localStorage.getItem('masto_instance')).toBe('https://example.com');
    // PKCE state and verifier are cleared after success.
    expect(sessionStorage.getItem('masto_oauth_state')).toBeNull();
    expect(sessionStorage.getItem('masto_code_verifier')).toBeNull();
    // token-exchange request used PKCE verifier, not client secret.
    const init = fetchMock.mock.calls[0][1];
    const body = JSON.parse(String(init?.body));
    expect(body.code_verifier).toBe('v');
    expect(body.client_secret).toBeUndefined();
  });

  it('includes the client_secret in token exchange for confidential clients', async () => {
    sessionStorage.setItem('masto_oauth_state', 's');
    sessionStorage.setItem('masto_code_verifier', 'v');
    sessionStorage.setItem('masto_pending_instance', 'https://mstdn.example');
    sessionStorage.setItem('masto_pending_client_id', 'cid');
    sessionStorage.setItem('masto_pending_client_secret', 'shh');

    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 });
      }
      if (url.endsWith('/api/v2/instance')) {
        return new Response(JSON.stringify({ configuration: {} }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await handleMastodonCallback('code', 's');

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.client_id).toBe('cid');
    expect(body.client_secret).toBe('shh');
    expect(body.code_verifier).toBe('v');
    // The secret is persisted on the account and the pending copy is cleared.
    expect(localStorage.getItem('masto_client_secret')).toBe('shh');
    expect(sessionStorage.getItem('masto_pending_client_secret')).toBeNull();
  });
});

describe('migrateLegacyAccount', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('promotes legacy single-account keys into the accounts map', () => {
    localStorage.setItem('masto_instance', 'https://example.social');
    localStorage.setItem('masto_access_token', 'tok');
    localStorage.setItem('masto_client_id', 'cid');
    localStorage.setItem('masto_instance_config', '{"statuses":{}}');

    migrateLegacyAccount();

    const accounts = listAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      url: 'https://example.social',
      token: 'tok',
      clientId: 'cid',
    });
    expect(getActiveInstanceUrl()).toBe('https://example.social');
  });

  it('is idempotent — running twice keeps a single entry', () => {
    localStorage.setItem('masto_instance', 'https://example.social');
    localStorage.setItem('masto_access_token', 'tok');
    localStorage.setItem('masto_client_id', 'cid');

    migrateLegacyAccount();
    migrateLegacyAccount();

    expect(listAccounts()).toHaveLength(1);
  });

  it('does nothing when no legacy credentials are present', () => {
    migrateLegacyAccount();
    expect(listAccounts()).toHaveLength(0);
    expect(getActiveInstanceUrl()).toBeNull();
  });

  it('preserves an existing account already in the map', () => {
    localStorage.setItem(
      'mastoforum_accounts',
      JSON.stringify({ 'https://a.social': { url: 'https://a.social', token: 'a', clientId: 'ca' } }),
    );
    localStorage.setItem('mastoforum_active_instance', 'https://a.social');
    // Legacy keys point at a *different* account.
    localStorage.setItem('masto_instance', 'https://b.social');
    localStorage.setItem('masto_access_token', 'b');
    localStorage.setItem('masto_client_id', 'cb');

    migrateLegacyAccount();

    const urls = listAccounts().map((a) => a.url).sort();
    expect(urls).toEqual(['https://a.social', 'https://b.social']);
  });
});

describe('switchActiveAccount', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mirrors the chosen account into the active (legacy) keys', () => {
    localStorage.setItem(
      'mastoforum_accounts',
      JSON.stringify({
        'https://a.social': { url: 'https://a.social', token: 'a', clientId: 'ca', instanceConfig: '{"x":1}' },
        'https://b.social': { url: 'https://b.social', token: 'b', clientId: 'cb' },
      }),
    );
    localStorage.setItem('mastoforum_active_instance', 'https://a.social');

    const creds = switchActiveAccount('https://b.social');

    expect(creds).toEqual({ url: 'https://b.social', token: 'b' });
    expect(getActiveInstanceUrl()).toBe('https://b.social');
    expect(localStorage.getItem('masto_instance')).toBe('https://b.social');
    expect(localStorage.getItem('masto_access_token')).toBe('b');
    expect(localStorage.getItem('masto_client_id')).toBe('cb');
  });

  it('returns null for an unknown instance', () => {
    expect(switchActiveAccount('https://nope.social')).toBeNull();
  });
});

describe('logoutMastodon', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
  });

  it('revokes the active token before clearing it', async () => {
    localStorage.setItem('masto_instance', 'https://a.social');
    localStorage.setItem('masto_access_token', 'tok');
    localStorage.setItem('masto_client_id', 'cid');
    localStorage.setItem('masto_client_secret', 'secret');

    await logoutMastodon();

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/oauth/revoke');
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({ client_id: 'cid', client_secret: 'secret', token: 'tok' });
  });

  it('promotes the next saved account and drops the logged-out one', async () => {
    localStorage.setItem(
      'mastoforum_accounts',
      JSON.stringify({
        'https://a.social': { url: 'https://a.social', token: 'a', clientId: 'ca' },
        'https://b.social': { url: 'https://b.social', token: 'b', clientId: 'cb' },
      }),
    );
    localStorage.setItem('mastoforum_active_instance', 'https://a.social');
    localStorage.setItem('masto_instance', 'https://a.social');
    localStorage.setItem('masto_access_token', 'a');
    localStorage.setItem('masto_client_id', 'ca');

    const next = await logoutMastodon();

    expect(next).toEqual({ url: 'https://b.social', token: 'b' });
    expect(listAccounts().map((acc) => acc.url)).toEqual(['https://b.social']);
    expect(localStorage.getItem('masto_access_token')).toBe('b');
  });

  it('clears all storage and returns null when the last account logs out', async () => {
    localStorage.setItem(
      'mastoforum_accounts',
      JSON.stringify({
        'https://only.social': { url: 'https://only.social', token: 'tok', clientId: 'cid' },
      }),
    );
    localStorage.setItem('mastoforum_active_instance', 'https://only.social');
    localStorage.setItem('masto_instance', 'https://only.social');
    localStorage.setItem('masto_access_token', 'tok');
    localStorage.setItem('masto_client_id', 'cid');

    const result = await logoutMastodon();

    expect(result).toBeNull();
    expect(localStorage.getItem('masto_instance')).toBeNull();
    expect(localStorage.getItem('mastoforum_accounts')).toBeNull();
  });
});
