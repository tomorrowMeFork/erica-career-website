export const SESSION_REFERENCES_KEY = "erica-career-chat:session-references";

export type DeadlineStatus = "open" | "closing_soon" | "closed" | "unknown";

export interface SessionReferenceItem {
  url: string;
  title: string;
  sourceLabel: string;
  postedAt: string | null;
  fetchedAt: string | null;
  deadlineStatus: DeadlineStatus;
  firstReferencedAt: string;
  lastReferencedAt: string;
  referenceCount: number;
  lastQuery?: string;
}

interface SessionReferencesEnvelope {
  _v: 1;
  items: SessionReferenceItem[];
}

function canonicalizeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapDeadlineStatus(raw: string | undefined | null): DeadlineStatus {
  const normalized = String(raw ?? "unknown").toLowerCase();
  if (normalized === "active" || normalized === "open") return "open";
  if (normalized === "closing_soon" || normalized === "closing-soon") return "closing_soon";
  if (normalized === "expired" || normalized === "closed") return "closed";
  return "unknown";
}

function getSafeSessionStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) return window.sessionStorage;
    return null;
  } catch {
    return null;
  }
}

function resolveStorage(storage?: Storage): Storage | null {
  return storage ?? getSafeSessionStorage();
}

function getSourceDisplayLabel(sourceId: string | undefined, url: string | undefined): string {
  try {
    if (url) {
      const hostname = new URL(url).hostname;
      if ((sourceId && sourceId.includes("ibus")) || hostname === "ibus.hanyang.ac.kr") return "ERICA 취업게시판";
      if ((sourceId && sourceId.includes("cdp")) || hostname === "cdp.hanyang.ac.kr") return "한양대학교 ERICA 커리어개발센터";
    }
  } catch {
    // URL parse failure; fall through to default
  }
  return "확인된 출처";
}

function readEnvelope(storage: Storage): SessionReferenceItem[] {
  try {
    const raw = storage.getItem(SESSION_REFERENCES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || parsed._v !== 1 || !Array.isArray(parsed.items)) return [];
    return parsed.items.filter(isValidItem);
  } catch {
    return [];
  }
}

function isValidItem(item: unknown): item is SessionReferenceItem {
  if (typeof item !== "object" || item === null) return false;
  const o = item as Record<string, unknown>;
  return (
    typeof o.url === "string" &&
    o.url.trim().length > 0 &&
    typeof o.title === "string" &&
    typeof o.sourceLabel === "string" &&
    typeof o.deadlineStatus === "string" &&
    typeof o.firstReferencedAt === "string" &&
    typeof o.lastReferencedAt === "string" &&
    typeof o.referenceCount === "number"
  );
}

function writeEnvelope(storage: Storage, items: SessionReferenceItem[]): void {
  try {
    const envelope: SessionReferencesEnvelope = { _v: 1, items };
    storage.setItem(SESSION_REFERENCES_KEY, JSON.stringify(envelope));
  } catch (e) {
    if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
      return;
    }
    return;
  }
}

function fromCitationLike(c: Record<string, unknown>, now: string, query?: string): SessionReferenceItem | null {
  const url = canonicalizeUrl(c.url as string | undefined);
  if (!url) return null;
  return {
    url,
    title: String(c.title ?? ""),
    sourceLabel: (c.sourceLabel as string | undefined) || getSourceDisplayLabel(c.source_id as string | undefined, url),
    postedAt: (c.postedAt ?? c.posted_at) as string | null ?? null,
    fetchedAt: (c.fetchedAt ?? c.fetched_at) as string | null ?? null,
    deadlineStatus: mapDeadlineStatus((c.deadlineStatus as string | undefined) ?? (c.deadline_status as string | undefined)),
    firstReferencedAt: now,
    lastReferencedAt: now,
    referenceCount: 1,
    ...(query ? { lastQuery: query } : {}),
  };
}

function fromRecommendationLike(r: Record<string, unknown>, now: string, query?: string): SessionReferenceItem | null {
  const url = canonicalizeUrl(r.url as string | undefined);
  if (!url) return null;
  return {
    url,
    title: String(r.title ?? ""),
    sourceLabel: (r.sourceLabel as string | undefined) || getSourceDisplayLabel(r.source_id as string | undefined, url),
    postedAt: (r.postedAt ?? r.posted_at) as string | null ?? null,
    fetchedAt: (r.fetchedAt ?? r.fetched_at) as string | null ?? null,
    deadlineStatus: mapDeadlineStatus((r.deadlineStatus as string | undefined) ?? (r.deadline_status as string | undefined)),
    firstReferencedAt: now,
    lastReferencedAt: now,
    referenceCount: 1,
    ...(query ? { lastQuery: query } : {}),
  };
}

function upsertItem(items: SessionReferenceItem[], incoming: SessionReferenceItem): SessionReferenceItem[] {
  const idx = items.findIndex((item) => item.url === incoming.url);
  if (idx === -1) {
    return [...items, incoming];
  }
  return items.map((item, i) => {
    if (i !== idx) return item;
    return {
      ...item,
      title: item.title || incoming.title,
      sourceLabel: item.sourceLabel || incoming.sourceLabel,
      postedAt: item.postedAt ?? incoming.postedAt,
      fetchedAt: item.fetchedAt ?? incoming.fetchedAt,
      deadlineStatus: item.deadlineStatus === "unknown" ? incoming.deadlineStatus : item.deadlineStatus,
      lastReferencedAt: incoming.lastReferencedAt,
      referenceCount: item.referenceCount + incoming.referenceCount,
      lastQuery: incoming.lastQuery ?? item.lastQuery,
    };
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Returns [] on storage failure, malformed data, unsupported version, or when storage is unavailable. */
export function readSessionReferences(storage?: Storage): SessionReferenceItem[] {
  const s = resolveStorage(storage);
  if (!s) return [];
  return readEnvelope(s);
}

/** Accepts ChatCitation[]-like input; skips items without URL. No-op when storage is unavailable. */
export function appendCitations(
  citations: Record<string, unknown>[],
  storage?: Storage,
  query?: string,
): void {
  const s = resolveStorage(storage);
  if (!s) return;
  const now = new Date().toISOString();
  let items = readEnvelope(s);
  for (const c of citations) {
    const item = fromCitationLike(c, now, query);
    if (item) items = upsertItem(items, item);
  }
  writeEnvelope(s, items);
}

/** Accepts RecommendationItem[]-like input; skips items without URL. No-op when storage is unavailable. */
export function appendRecommendations(
  recommendations: Record<string, unknown>[],
  storage?: Storage,
  query?: string,
): void {
  const s = resolveStorage(storage);
  if (!s) return;
  const now = new Date().toISOString();
  let items = readEnvelope(s);
  for (const r of recommendations) {
    const item = fromRecommendationLike(r, now, query);
    if (item) items = upsertItem(items, item);
  }
  writeEnvelope(s, items);
}

/** Removes only the session references key, not other session data. No-op when storage is unavailable. */
export function clearSessionReferences(storage?: Storage): void {
  const s = resolveStorage(storage);
  if (!s) return;
  try {
    s.removeItem(SESSION_REFERENCES_KEY);
  } catch {
    // no-op
  }
}
