/** Recently used character names, so a player doesn't retype them every reply. */
const KEY = 'mastoforum_speakers';
const LIMIT = 6;

export function getSpeakers(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function rememberSpeaker(name: string): string[] {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) return getSpeakers();
  const next = [cleaned, ...getSpeakers().filter((n) => n !== cleaned)].slice(0, LIMIT);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* localStorage may be unavailable */
  }
  return next;
}
