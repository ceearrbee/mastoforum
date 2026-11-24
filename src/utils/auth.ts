import { APP_CONFIG, SCOPES } from '../config';
import { sha256Bytes } from './sha256';

// Includes the app's base path so the callback resolves under a GitHub Pages
// project subpath (e.g. https://you.github.io/repo/auth), not just the origin.
// BASE_URL always ends with '/', so this never double-slashes.
const REDIRECT_URI = `${window.location.origin}${import.meta.env.BASE_URL}auth`;

const STORAGE = {
  instance: 'masto_instance',
  clientId: 'masto_client_id',
  clientSecretKey: 'masto_client_secret',
  accessToken: 'masto_access_token',
  instanceConfig: 'masto_instance_config',
  oauthState: 'masto_oauth_state',
  codeVerifier: 'masto_code_verifier',
  pendingInstance: 'masto_pending_instance',
  pendingClientId: 'masto_pending_client_id',
  pendingClientSecretKey: 'masto_pending_client_secret',
  // Multi-account store: a map of origin → StoredAccount, plus a pointer to
  // the active one. The single-account keys above are legacy: read once by
  // `migrateLegacyAccount`, then deleted. Only `masto_instance_config` (not a
  // secret) is still mirrored, for the `instanceConfig` readers.
  accounts: 'mastoforum_accounts',
  activeInstance: 'mastoforum_active_instance',
} as const;

export interface MastodonCredentials {
  url: string;
  token: string;
}

export interface StoredAccount {
  url: string;
  token: string;
  clientId: string;
  /**
   * The app's client secret. Mastodon issues a confidential client from
   * `/api/v1/apps` and requires this for token exchange and revoke; PKCE alone
   * is not enough. Optional for back-compat with accounts stored before this.
   */
  clientSecret?: string;
  /** Raw JSON of `GET /api/v2/instance`'s `configuration`, if captured. */
  instanceConfig?: string;
}

function readAccounts(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(STORAGE.accounts);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredAccount>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAccounts(map: Record<string, StoredAccount>): void {
  localStorage.setItem(STORAGE.accounts, JSON.stringify(map));
}

/** Point the active-account pointer at an account and mirror its instance config. */
function activate(account: StoredAccount): void {
  if (account.instanceConfig) {
    localStorage.setItem(STORAGE.instanceConfig, account.instanceConfig);
  } else {
    localStorage.removeItem(STORAGE.instanceConfig);
  }
  localStorage.setItem(STORAGE.activeInstance, account.url);
}

/** Persist an account in the map and make it the active one. */
function saveAccount(account: StoredAccount): void {
  const map = readAccounts();
  map[account.url] = account;
  writeAccounts(map);
  activate(account);
}

/** All saved accounts, in insertion order. */
export function listAccounts(): StoredAccount[] {
  return Object.values(readAccounts());
}

/**
 * Make a saved account active. Returns the resulting credentials, or null if
 * the instance isn't in the store.
 */
export function switchActiveAccount(url: string): MastodonCredentials | null {
  const account = readAccounts()[url];
  if (!account) return null;
  activate(account);
  return { url: account.url, token: account.token };
}

/**
 * On first load after the multi-account upgrade, fold the legacy single-account
 * keys into the accounts map (keyed by origin) without disturbing any accounts
 * already stored, then delete them so the token and client secret are stored
 * once. Idempotent.
 */
export function migrateLegacyAccount(): void {
  const url = localStorage.getItem(STORAGE.instance);
  const token = localStorage.getItem(STORAGE.accessToken);
  if (!url || !token) return;

  const map = readAccounts();
  if (!map[url]) {
    const clientId = localStorage.getItem(STORAGE.clientId) ?? '';
    const instanceConfig = localStorage.getItem(STORAGE.instanceConfig) ?? undefined;
    const clientSecret = localStorage.getItem(STORAGE.clientSecretKey) ?? undefined;
    map[url] = { url, token, clientId, clientSecret, instanceConfig };
    writeAccounts(map);
  }
  if (!localStorage.getItem(STORAGE.activeInstance)) {
    localStorage.setItem(STORAGE.activeInstance, url);
  }
  localStorage.removeItem(STORAGE.instance);
  localStorage.removeItem(STORAGE.clientId);
  localStorage.removeItem(STORAGE.clientSecretKey);
  localStorage.removeItem(STORAGE.accessToken);
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Reduces user input to an instance origin; https only, http allowed for loopback. */
export function normaliseInstanceUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Instance URL is required');
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error('Enter a valid instance address, such as mastodon.social');
  }
  const isLoopbackHttp = parsed.protocol === 'http:' && LOOPBACK_HOSTS.has(parsed.hostname);
  if (parsed.protocol !== 'https:' && !isLoopbackHttp) {
    throw new Error('Instance URL must use https');
  }
  return parsed.origin;
}

function randomBase64Url(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64Url(buf);
}

export function base64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Build the PKCE challenge for the authorize request. Mastodon requires the
 * `S256` method, so we always hash the verifier — via `crypto.subtle` in a
 * secure context, or the JS SHA-256 fallback over plain HTTP where subtle
 * crypto is unavailable. `crypto.getRandomValues` works in either context.
 */
export async function buildPkceChallenge(
  verifier: string,
): Promise<{ challenge: string; method: 'S256' }> {
  return { challenge: base64Url(await sha256(verifier)), method: 'S256' };
}

async function sha256(input: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(input);
  // Native WebCrypto in a secure context (HTTPS/localhost); JS fallback over
  // plain HTTP where `crypto.subtle` is undefined. Both yield the same digest.
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  }
  return sha256Bytes(bytes);
}

export async function initiateMastodonLogin(instanceUrl: string): Promise<void> {
  const url = normaliseInstanceUrl(instanceUrl);

  const registerResponse = await fetch(`${url}/api/v1/apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: APP_CONFIG.appName,
      redirect_uris: REDIRECT_URI,
      scopes: SCOPES,
      website: window.location.origin,
    }),
  });
  if (!registerResponse.ok) {
    throw new Error(`Could not register app on ${url} (${registerResponse.status})`);
  }
  const appData: { client_id: string; client_secret?: string } = await registerResponse.json();

  const state = randomBase64Url(16);
  const codeVerifier = randomBase64Url(64);
  const { challenge: codeChallenge, method: challengeMethod } =
    await buildPkceChallenge(codeVerifier);

  sessionStorage.setItem(STORAGE.oauthState, state);
  sessionStorage.setItem(STORAGE.codeVerifier, codeVerifier);
  sessionStorage.setItem(STORAGE.pendingInstance, url);
  sessionStorage.setItem(STORAGE.pendingClientId, appData.client_id);
  if (appData.client_secret) {
    sessionStorage.setItem(STORAGE.pendingClientSecretKey, appData.client_secret);
  } else {
    sessionStorage.removeItem(STORAGE.pendingClientSecretKey);
  }

  const authUrl = new URL(`${url}/oauth/authorize`);
  authUrl.searchParams.set('client_id', appData.client_id);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', challengeMethod);

  window.location.href = authUrl.toString();
}

export async function handleMastodonCallback(code: string, returnedState: string | null): Promise<void> {
  const expectedState = sessionStorage.getItem(STORAGE.oauthState);
  const codeVerifier = sessionStorage.getItem(STORAGE.codeVerifier);
  const url = sessionStorage.getItem(STORAGE.pendingInstance);
  const clientId = sessionStorage.getItem(STORAGE.pendingClientId);
  const clientSecret = sessionStorage.getItem(STORAGE.pendingClientSecretKey) ?? undefined;

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    throw new Error('OAuth state mismatch — aborting to prevent CSRF.');
  }
  if (!url || !clientId || !codeVerifier) {
    throw new Error('Missing PKCE state — restart the login flow.');
  }

  // Mastodon registers a confidential client, so the token exchange needs the
  // client_secret in addition to the PKCE verifier; without it Doorkeeper
  // answers 401 invalid_client. PKCE-only public clients (e.g. GoToSocial) just
  // ignore the extra field.
  const tokenResponse = await fetch(`${url}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      scope: SCOPES,
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error(`Token exchange failed (${tokenResponse.status})`);
  }
  const tokenData: { access_token: string } = await tokenResponse.json();

  let instanceConfig: string | undefined;
  try {
    const instanceResponse = await fetch(`${url}/api/v2/instance`);
    if (instanceResponse.ok) {
      const instanceData = await instanceResponse.json();
      instanceConfig = JSON.stringify(instanceData.configuration);
    }
  } catch {
    // Instance config is best-effort; UI falls back to sensible defaults.
  }

  // Persist to the multi-account store and make it the active account.
  saveAccount({ url, token: tokenData.access_token, clientId, clientSecret, instanceConfig });

  sessionStorage.removeItem(STORAGE.oauthState);
  sessionStorage.removeItem(STORAGE.codeVerifier);
  sessionStorage.removeItem(STORAGE.pendingInstance);
  sessionStorage.removeItem(STORAGE.pendingClientId);
  sessionStorage.removeItem(STORAGE.pendingClientSecretKey);
}

export function getMastodonCredentials(): MastodonCredentials | null {
  migrateLegacyAccount();
  const active = localStorage.getItem(STORAGE.activeInstance);
  const account = active ? readAccounts()[active] : undefined;
  return account ? { url: account.url, token: account.token } : null;
}

/**
 * Log the active account out: revoke its token, drop it from the store and, if
 * other accounts remain, activate one of them. Returns the credentials now
 * active (the next account), or null if none are left.
 */
export async function logoutMastodon(): Promise<MastodonCredentials | null> {
  const creds = getMastodonCredentials();
  const account = creds ? readAccounts()[creds.url] : undefined;

  if (creds && account?.clientId) {
    try {
      await fetch(`${creds.url}/oauth/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: account.clientId,
          ...(account.clientSecret ? { client_secret: account.clientSecret } : {}),
          token: creds.token,
        }),
      });
    } catch {
      // Revoke is best-effort — proceed with local cleanup regardless.
    }
  }

  if (creds) {
    const map = readAccounts();
    delete map[creds.url];
    writeAccounts(map);
  }

  localStorage.removeItem(STORAGE.instanceConfig);
  localStorage.removeItem(STORAGE.activeInstance);

  // Promote the next remaining account, if any.
  const remaining = listAccounts();
  if (remaining.length > 0) {
    activate(remaining[0]);
    return { url: remaining[0].url, token: remaining[0].token };
  }

  localStorage.removeItem(STORAGE.accounts);
  return null;
}
