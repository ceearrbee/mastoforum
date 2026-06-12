/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createRestAPIClient, type mastodon } from 'masto';
import {
  getMastodonCredentials,
  listAccounts,
  logoutMastodon as logoutAuth,
  switchActiveAccount,
  type MastodonCredentials,
  type StoredAccount,
} from '../utils/auth';
import { onUnauthorized } from '../utils/apiErrors';

type MastoClient = mastodon.rest.Client;

interface AuthContextValue {
  credentials: MastodonCredentials | null;
  client: MastoClient | null;
  accounts: StoredAccount[];
  logout: () => Promise<void>;
  switchAccount: (url: string) => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [credentials, setCredentials] = useState<MastodonCredentials | null>(
    () => getMastodonCredentials(),
  );

  // Most query keys aren't namespaced by account, so when the active account
  // changes (switch, logout, cross-tab, forced re-auth) we must drop the whole
  // React Query cache — otherwise the previous account's threads/boards/tags
  // bleed into the new session.
  const activeUrlRef = useRef<string | null>(credentials?.url ?? null);
  useEffect(() => {
    const url = credentials?.url ?? null;
    if (activeUrlRef.current !== url) {
      activeUrlRef.current = url;
      queryClient.clear();
    }
  }, [credentials?.url, queryClient]);

  const refresh = useCallback(() => {
    setCredentials(getMastodonCredentials());
  }, []);

  const logout = useCallback(async () => {
    const next = await logoutAuth();
    setCredentials(next);
  }, []);

  const switchAccount = useCallback((url: string) => {
    const next = switchActiveAccount(url);
    if (next) setCredentials(next);
  }, []);

  // When a 401 is observed anywhere, sign the active account out (falling back
  // to the next saved account, if any) so the user re-auths.
  useEffect(() => onUnauthorized(() => {
    void logoutAuth().then((next) => setCredentials(next));
  }), []);

  // Cross-tab sync: when another tab logs in or out, mirror the change here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'masto_access_token' || e.key === 'masto_instance') {
        setCredentials(getMastodonCredentials());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const client = useMemo<MastoClient | null>(() => {
    if (!credentials) return null;
    return createRestAPIClient({ url: credentials.url, accessToken: credentials.token });
  }, [credentials]);

  // Re-read the saved-account list whenever the active credentials change
  // (login, logout, switch all flow through `credentials`).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const accounts = useMemo<StoredAccount[]>(() => listAccounts(), [credentials]);

  const value = useMemo<AuthContextValue>(
    () => ({ credentials, client, accounts, logout, switchAccount, refresh }),
    [credentials, client, accounts, logout, switchAccount, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
