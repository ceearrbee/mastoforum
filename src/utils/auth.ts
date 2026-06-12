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
  // the active one. The legacy single-account keys above are kept in sync as a
  // mirror of the active account so `getMastodonCredentials` and the cached
  // `masto_instance_config` reader keep working unchanged.
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

/** Mirror an account into the legacy "active account" keys. */
function mirrorActive(account: StoredAccount): void {
  localStorage.setItem(STORAGE.instance, account.url);
  localStorage.setItem(STORAGE.clientId, account.clientId);
  if (account.clientSecret) {
    localStorage.setItem(STORAGE.clientSecretKey, account.clientSecret);
  } else {
    localStorage.removeItem(STORAGE.clientSecretKey);
  }
  localStorage.setItem(STORAGE.accessToken, account.token);
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
  mirrorActive(account);
}

/** All saved accounts, in insertion order. */
export function listAccounts(): StoredAccount[] {
  return Object.values(readAccounts());
}

/** The origin URL of the currently active account, if any. */
export function getActiveInstanceUrl(): string | null {
  return localStorage.getItem(STORAGE.activeInstance) ?? localStorage.getItem(STORAGE.instance);
}

/**
 * Make a saved account active, mirroring it into the legacy keys. Returns the
 * resulting credentials, or null if the instance isn't in the store.
 */
export function switchActiveAccount(url: string): MastodonCredentials | null {
  const account = readAccounts()[url];
  if (!account) return null;
  mirrorActive(account);
  return { url: account.url, token: account.token };
}

/**
 * On first load after the multi-account upgrade, fold the legacy single-account
 * keys into the accounts map (keyed by origin) without disturbing any accounts
 * already stored. Idempotent.
 */
export function migrateLegacyAccount(): void {
  const url = localStorage.getItem(STORAGE.instance);
  const token = localStorage.getItem(STORAGE.accessToken);
  const clientId = localStorage.getItem(STORAGE.clientId);
  if (!url || !token || !clientId) return;

  const map = readAccounts();
  if (!map[url]) {
    const instanceConfig = localStorage.getItem(STORAGE.instanceConfig) ?? undefined;
    const clientSecret = localStorage.getItem(STORAGE.clientSecretKey) ?? undefined;
    map[url] = { url, token, clientId, clientSecret, instanceConfig };
    writeAccounts(map);
  }
  if (!localStorage.getItem(STORAGE.activeInstance)) {
    localStorage.setItem(STORAGE.activeInstance, url);
  }
}

export function normaliseInstanceUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed) throw new Error('Instance URL is required');
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
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

  // Persist to the multi-account store and mirror into the active (legacy)
  // keys in one step.
  saveAccount({ url, token: tokenData.access_token, clientId, clientSecret, instanceConfig });

  sessionStorage.removeItem(STORAGE.oauthState);
  sessionStorage.removeItem(STORAGE.codeVerifier);
  sessionStorage.removeItem(STORAGE.pendingInstance);
  sessionStorage.removeItem(STORAGE.pendingClientId);
  sessionStorage.removeItem(STORAGE.pendingClientSecretKey);
}

export function getMastodonCredentials(): MastodonCredentials | null {
  migrateLegacyAccount();
  const url = localStorage.getItem(STORAGE.instance);
  const token = localStorage.getItem(STORAGE.accessToken);
  return url && token ? { url, token } : null;
}

/**
 * Log the active account out: revoke its token, drop it from the store and, if
 * other accounts remain, activate one of them. Returns the credentials now
 * active (the next account), or null if none are left.
 */
export async function logoutMastodon(): Promise<MastodonCredentials | null> {
  const creds = getMastodonCredentials();
  const clientId = localStorage.getItem(STORAGE.clientId);
  const clientSecret = localStorage.getItem(STORAGE.clientSecretKey) ?? undefined;

  if (creds && clientId) {
    try {
      await fetch(`${creds.url}/oauth/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          ...(clientSecret ? { client_secret: clientSecret } : {}),
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

  // Clear the active (legacy) keys and the active pointer.
  localStorage.removeItem(STORAGE.instance);
  localStorage.removeItem(STORAGE.clientId);
  localStorage.removeItem(STORAGE.clientSecretKey);
  localStorage.removeItem(STORAGE.accessToken);
  localStorage.removeItem(STORAGE.instanceConfig);
  localStorage.removeItem(STORAGE.activeInstance);

  // Promote the next remaining account, if any.
  const remaining = listAccounts();
  if (remaining.length > 0) {
    mirrorActive(remaining[0]);
    return { url: remaining[0].url, token: remaining[0].token };
  }

  localStorage.removeItem(STORAGE.accounts);
  return null;
}
