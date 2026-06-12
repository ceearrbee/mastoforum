/**
 * A webfinger handle is `user@host` (optionally a leading `@`), where the host
 * looks like a domain. We use this to decide whether a profile lookup that
 * 404s locally is worth retrying through a `resolve: true` federated search.
 */
const WEBFINGER_RE = /^@?[\w.-]+@[\w.-]+\.[a-z]{2,}$/i;

export function isWebfingerHandle(value: string): boolean {
  return WEBFINGER_RE.test(value.trim());
}

/** The bare host of an instance URL: strips the scheme and any trailing slash. */
export function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** Strip a single leading `@` from a handle, leaving `user@host` intact. */
export function stripLeadingAt(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}

/**
 * The host portion of a `user@host` handle, or `null` for a local handle
 * (`user`) that carries no domain. Used to offer per-domain blocking.
 */
export function domainOf(value: string): string | null {
  const at = stripLeadingAt(value).indexOf('@');
  if (at === -1) return null;
  const host = stripLeadingAt(value).slice(at + 1).trim();
  return host || null;
}
