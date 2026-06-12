/**
 * Typed readers over the instance configuration cached at sign-in.
 *
 * `auth.ts::handleMastodonCallback` stores the raw `configuration` object from
 * `GET /api/v2/instance` under `masto_instance_config` (snake_case JSON, not
 * masto-normalised). These helpers parse it defensively and fall back to
 * sensible Mastodon defaults so every caller gets a usable value.
 */
import { DEFAULT_IMAGE_SIZE_LIMIT, DEFAULT_VIDEO_SIZE_LIMIT } from '../config';

const STORAGE_KEY = 'masto_instance_config';

/** Mastodon's documented default status length. */
export const DEFAULT_MAX_CHARACTERS = 500;

interface RawConfig {
  statuses?: {
    max_characters?: number;
    supported_mime_types?: string[];
  };
  media_attachments?: {
    image_size_limit?: number;
    video_size_limit?: number;
  };
  polls?: {
    max_options?: number;
    max_characters_per_option?: number;
    min_expiration?: number;
    max_expiration?: number;
  };
  urls?: {
    streaming?: string;
  };
}

export interface MediaLimits {
  imageSizeLimit: number;
  videoSizeLimit: number;
}

export interface PollConfig {
  maxOptions: number;
  maxCharactersPerOption: number;
  minExpiration: number;
  maxExpiration: number;
}

function readConfig(): RawConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as RawConfig;
  } catch {
    return {};
  }
}

export function getMaxCharacters(): number {
  return readConfig().statuses?.max_characters ?? DEFAULT_MAX_CHARACTERS;
}

export function getMediaLimits(): MediaLimits {
  const media = readConfig().media_attachments ?? {};
  return {
    imageSizeLimit: media.image_size_limit ?? DEFAULT_IMAGE_SIZE_LIMIT,
    videoSizeLimit: media.video_size_limit ?? DEFAULT_VIDEO_SIZE_LIMIT,
  };
}

export function getPollConfig(): PollConfig {
  const polls = readConfig().polls ?? {};
  return {
    maxOptions: polls.max_options ?? 4,
    maxCharactersPerOption: polls.max_characters_per_option ?? 50,
    minExpiration: polls.min_expiration ?? 300,
    maxExpiration: polls.max_expiration ?? 2629746,
  };
}

/**
 * Heuristic for instances that support local-only (`visibility: 'local'`)
 * posting — Pleroma/Akkoma/glitch-style servers advertise the misskey
 * markdown mime type. Vanilla Mastodon does not, so we keep the option hidden.
 */
export function supportsLocalOnly(): boolean {
  const types = readConfig().statuses?.supported_mime_types ?? [];
  return types.includes('text/x.misskeymarkdown');
}

/**
 * The instance's WebSocket streaming endpoint (`configuration.urls.streaming`
 * from `GET /api/v2/instance`), or `null` when the instance doesn't advertise
 * one — in which case live updates simply don't connect.
 */
export function getStreamingUrl(): string | null {
  const url = readConfig().urls?.streaming;
  return typeof url === 'string' && url.length > 0 ? url : null;
}
