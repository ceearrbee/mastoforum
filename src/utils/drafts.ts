const PREFIX = 'mastoforum_draft:';

export interface Draft {
  content: string;
  spoilerText: string;
  updatedAt: number;
}

function key(threadId: string): string {
  return `${PREFIX}${threadId}`;
}

export function getDraft(threadId: string): Draft | null {
  try {
    const raw = localStorage.getItem(key(threadId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (typeof parsed.content !== 'string') return null;
    return {
      content: parsed.content,
      spoilerText: typeof parsed.spoilerText === 'string' ? parsed.spoilerText : '',
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveDraft(threadId: string, draft: { content: string; spoilerText: string }): void {
  try {
    if (!draft.content.trim() && !draft.spoilerText.trim()) {
      clearDraft(threadId);
      return;
    }
    const payload: Draft = { ...draft, updatedAt: Date.now() };
    localStorage.setItem(key(threadId), JSON.stringify(payload));
  } catch {
    /* localStorage may be unavailable */
  }
}

export function clearDraft(threadId: string): void {
  try {
    localStorage.removeItem(key(threadId));
  } catch {
    /* localStorage may be unavailable */
  }
}
