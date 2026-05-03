const storagePrefix = "erica-career-chat:";
const storageKey = "phase5-session-key";

export function getOrCreateSessionKey(storage: Storage = window.sessionStorage): string {
  const fullKey = `${storagePrefix}${storageKey}`;
  const existing = storage.getItem(fullKey);
  if (existing !== null && existing.trim().length > 0) {
    return existing;
  }
  const next = `${storagePrefix}${crypto.randomUUID()}`;
  storage.setItem(fullKey, next);
  return next;
}

export const phase5SessionKeyName = storageKey;
