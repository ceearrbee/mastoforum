import type { mastodon } from 'masto';
import { stripHtml, truncate } from './sanitize';
import { TOPIC_PREVIEW_CHARS } from '../config';

/** Fallback title for a topic with no spoiler text and empty/strippable content. */
export const UNTITLED_TOPIC = 'Untitled topic';

/** Preview lengths, centralized so list/quote previews stay consistent. */
export const MESSAGE_PREVIEW_CHARS = 120;
export const NOTIFICATION_PREVIEW_CHARS = 120;
export const QUOTE_PREVIEW_CHARS = 80;
export const ACCOUNT_BIO_PREVIEW_CHARS = 120;

/** A boost wraps the original status; the original is what we display everywhere. */
export function displayStatus(post: mastodon.v1.Status): mastodon.v1.Status {
  return post.reblog ?? post;
}

/** The booster's account when `post` is a reblog, else null (for attribution). */
export function boosterOf(post: mastodon.v1.Status): mastodon.v1.Account | null {
  return post.reblog ? post.account : null;
}

/** An account's display name, falling back to its username. */
export function displayNameOf(
  account: Pick<mastodon.v1.Account, 'displayName' | 'username'>,
): string {
  return account.displayName || account.username;
}

/** A topic's title: spoiler text, else a content preview, else a fixed fallback. */
export function statusTitle(status: mastodon.v1.Status): string {
  return (
    status.spoilerText ||
    truncate(stripHtml(status.content), TOPIC_PREVIEW_CHARS) ||
    UNTITLED_TOPIC
  );
}

/** Plain-text, truncated preview of a status's HTML content. */
export function previewText(status: mastodon.v1.Status, chars: number): string {
  return truncate(stripHtml(status.content), chars);
}
