import { afterEach, describe, expect, it } from 'vitest';
import {
  getMaxCharacters,
  getMediaLimits,
  getPollConfig,
  getStreamingUrl,
  supportsLocalOnly,
} from './instanceConfig';
import { DEFAULT_IMAGE_SIZE_LIMIT, DEFAULT_VIDEO_SIZE_LIMIT } from '../config';

function setConfig(config: unknown) {
  localStorage.setItem('masto_instance_config', JSON.stringify(config));
}

afterEach(() => {
  localStorage.clear();
});

describe('getMaxCharacters', () => {
  it('reads statuses.max_characters from the cached config', () => {
    setConfig({ statuses: { max_characters: 4096 } });
    expect(getMaxCharacters()).toBe(4096);
  });

  it('falls back to 500 when no config is cached', () => {
    expect(getMaxCharacters()).toBe(500);
  });

  it('falls back to 500 when the config is malformed', () => {
    localStorage.setItem('masto_instance_config', 'not json');
    expect(getMaxCharacters()).toBe(500);
  });
});

describe('getMediaLimits', () => {
  it('reads media attachment size limits', () => {
    setConfig({ media_attachments: { image_size_limit: 100, video_size_limit: 200 } });
    expect(getMediaLimits()).toEqual({ imageSizeLimit: 100, videoSizeLimit: 200 });
  });

  it('falls back to config defaults when missing', () => {
    expect(getMediaLimits()).toEqual({
      imageSizeLimit: DEFAULT_IMAGE_SIZE_LIMIT,
      videoSizeLimit: DEFAULT_VIDEO_SIZE_LIMIT,
    });
  });
});

describe('getPollConfig', () => {
  it('reads poll constraints from the cached config', () => {
    setConfig({
      polls: {
        max_options: 5,
        max_characters_per_option: 80,
        min_expiration: 60,
        max_expiration: 1000,
      },
    });
    expect(getPollConfig()).toEqual({
      maxOptions: 5,
      maxCharactersPerOption: 80,
      minExpiration: 60,
      maxExpiration: 1000,
    });
  });

  it('falls back to Mastodon defaults when missing', () => {
    expect(getPollConfig()).toEqual({
      maxOptions: 4,
      maxCharactersPerOption: 50,
      minExpiration: 300,
      maxExpiration: 2629746,
    });
  });
});

describe('supportsLocalOnly', () => {
  it('is true when the instance advertises misskey markdown support', () => {
    setConfig({ statuses: { supported_mime_types: ['text/plain', 'text/x.misskeymarkdown'] } });
    expect(supportsLocalOnly()).toBe(true);
  });

  it('is false for a vanilla Mastodon instance', () => {
    setConfig({ statuses: { max_characters: 500 } });
    expect(supportsLocalOnly()).toBe(false);
  });

  it('is false when no config is cached', () => {
    expect(supportsLocalOnly()).toBe(false);
  });
});

describe('getStreamingUrl', () => {
  it('reads urls.streaming from the cached config', () => {
    setConfig({ urls: { streaming: 'wss://stream.example/api/v1/streaming' } });
    expect(getStreamingUrl()).toBe('wss://stream.example/api/v1/streaming');
  });

  it('returns null when the instance advertises no streaming URL', () => {
    setConfig({ statuses: { max_characters: 500 } });
    expect(getStreamingUrl()).toBeNull();
  });

  it('returns null when no config is cached', () => {
    expect(getStreamingUrl()).toBeNull();
  });
});
