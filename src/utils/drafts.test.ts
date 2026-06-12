import { afterEach, describe, expect, it } from 'vitest';
import { clearDraft, getDraft, saveDraft } from './drafts';

afterEach(() => localStorage.clear());

describe('drafts', () => {
  it('round-trips a saved draft', () => {
    saveDraft('t1', { content: 'hello', spoilerText: 'cw' });
    expect(getDraft('t1')).toMatchObject({ content: 'hello', spoilerText: 'cw' });
  });

  it('returns null when nothing is stored', () => {
    expect(getDraft('missing')).toBeNull();
  });

  it('clears the draft when both content and spoiler are blank', () => {
    saveDraft('t1', { content: 'hi', spoilerText: '' });
    saveDraft('t1', { content: '   ', spoilerText: '   ' });
    expect(getDraft('t1')).toBeNull();
  });

  it('persists a spoiler-only draft', () => {
    saveDraft('t1', { content: '', spoilerText: 'just a content warning' });
    expect(getDraft('t1')?.spoilerText).toBe('just a content warning');
  });

  it('returns null for malformed stored JSON', () => {
    localStorage.setItem('mastoforum_draft:t1', 'not json');
    expect(getDraft('t1')).toBeNull();
  });

  it('clearDraft removes a saved draft', () => {
    saveDraft('t1', { content: 'hi', spoilerText: '' });
    clearDraft('t1');
    expect(getDraft('t1')).toBeNull();
  });
});
