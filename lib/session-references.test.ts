import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	appendCitations,
	appendRecommendations,
	clearSessionReferences,
	readSessionReferences,
	SESSION_REFERENCES_KEY,
} from "./session-references.js";

function mockStorage(items: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(items));
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((_: number) => null),
  };
}

let currentTime = "2026-05-04T12:00:00.000Z";
const RealDate = globalThis.Date;

function stubDate() {
  vi.stubGlobal("Date", function (this: Date, ...args: unknown[]): Date {
    if (!(this instanceof Date)) {
      return new RealDate(currentTime) as unknown as Date;
    }
    if (args.length === 0) {
      return new RealDate(currentTime) as unknown as Date;
    }
    return new RealDate(args[0] as string | number) as unknown as Date;
  });
}

beforeEach(() => {
  currentTime = "2026-05-04T12:00:00.000Z";
  stubDate();
});

afterEach(() => {
  vi.stubGlobal("Date", RealDate);
});

const citation = {
  citation_id: 42,
  chunk_id: "chunk-abc",
  record_id: "rec-xyz",
  source_id: "ibus-hanyang",
  title: "ERICA 채용 공고 2026",
  url: "https://ibus.hanyang.ac.kr/job/123",
  fetched_at: "2026-05-01T00:00:00.000Z",
  posted_at: "2026-04-15T00:00:00.000Z",
  deadline_status: "active",
  trace_id: "trace-001",
  page_number: 3,
};

const recommendation = {
  recommendation_id: "rec-001",
  chunk_id: "chunk-def",
  record_id: "rec-ghi",
  source_id: "cdp-hanyang",
  title: "커리어 개발 프로그램",
  category: "program",
  url: "https://cdp.hanyang.ac.kr/program/456",
  fetched_at: "2026-05-02T00:00:00.000Z",
  posted_at: null,
  deadline_status: "expired",
  score: 0.92,
  match_strength: "personalized_match",
  match_reasons: ["major match", "role match"],
  score_breakdown: {
    base_retrieval_score: 0.8,
    major_match_score: 0.95,
    target_role_match_score: 0.9,
    optional_preference_score: 0.85,
    source_quality_score: 0.88,
    freshness_score: 0.9,
    final_score: 0.92,
  },
  citations: [citation],
};

const FORBIDDEN_SUBSTRINGS = [
  "chunk-",
  "record-",
  "trace-",
  "recommendation_id",
  "source_id",
  "score_breakdown",
  "match_strength",
  "match_reasons",
  "citation_id",
  "trace_id",
  "page_number",
];

function assertNoRawInternalsInJson(storage: Storage) {
  const rawJson = getStoredSessionReferencesJson(storage);
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    expect(rawJson, `stored JSON must not contain "${forbidden}"`).not.toContain(forbidden);
  }
  expect(rawJson).not.toContain("ibus-hanyang");
  expect(rawJson).not.toContain("cdp-hanyang");
  expect(rawJson).not.toContain("0.92");
  expect(rawJson).not.toContain("0.8");
  expect(rawJson).not.toContain("0.95");
}

function getStoredSessionReferencesJson(storage: Storage): string {
  const rawJson = storage.getItem(SESSION_REFERENCES_KEY);
  expect(rawJson).not.toBeNull();
  return rawJson ?? "";
}

function hideGlobalWindow(): Window | undefined {
  const originalWindow = globalThis.window;
  Reflect.set(globalThis, "window", undefined);
  return originalWindow;
}

function restoreGlobalWindow(originalWindow: Window | undefined): void {
  Reflect.set(globalThis, "window", originalWindow);
}

describe("readSessionReferences", () => {
  it("returns empty array when storage is empty", () => {
    const storage = mockStorage();
    expect(readSessionReferences(storage)).toEqual([]);
  });

  it("returns empty array for malformed JSON", () => {
    const storage = mockStorage({ [SESSION_REFERENCES_KEY]: "not json" });
    expect(readSessionReferences(storage)).toEqual([]);
  });

  it("returns empty array for unsupported _v", () => {
    const storage = mockStorage({ [SESSION_REFERENCES_KEY]: JSON.stringify({ _v: 99, items: [] }) });
    expect(readSessionReferences(storage)).toEqual([]);
  });

  it("returns empty array when items is missing", () => {
    const storage = mockStorage({ [SESSION_REFERENCES_KEY]: JSON.stringify({ _v: 1 }) });
    expect(readSessionReferences(storage)).toEqual([]);
  });

  it("filters out items with invalid shapes", () => {
    const storage = mockStorage({
      [SESSION_REFERENCES_KEY]: JSON.stringify({
        _v: 1,
        items: [
          { url: "https://example.com", title: "Valid", sourceLabel: "src", deadlineStatus: "open", firstReferencedAt: "2026-05-04T12:00:00.000Z", lastReferencedAt: "2026-05-04T12:00:00.000Z", referenceCount: 1 },
          { url: "", title: "No url" },
          null,
          "string",
        ],
      }),
    });
    expect(readSessionReferences(storage)).toHaveLength(1);
  });

  it("returns [] when called without storage argument and no window", () => {
    const originalWindow = hideGlobalWindow();
    try {
      expect(() => readSessionReferences()).not.toThrow();
      expect(readSessionReferences()).toEqual([]);
    } finally {
      restoreGlobalWindow(originalWindow);
    }
  });
});

describe("appendCitations", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = mockStorage();
  });

  it("stores citation with user-facing fields only", () => {
    appendCitations([citation], storage, "채용 공고");

    const items = readSessionReferences(storage);
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.url).toBe("https://ibus.hanyang.ac.kr/job/123");
    expect(item.title).toBe("ERICA 채용 공고 2026");
    expect(item.postedAt).toBe("2026-04-15T00:00:00.000Z");
    expect(item.fetchedAt).toBe("2026-05-01T00:00:00.000Z");
    expect(item.deadlineStatus).toBe("open");
    expect(item.lastQuery).toBe("채용 공고");
  });

  it("derives user-facing sourceLabel from source_id and URL", () => {
    appendCitations([citation], storage);

    const items = readSessionReferences(storage);
    expect(items[0].sourceLabel).toBe("ERICA 취업게시판");
  });

  it("does not store raw internals as properties", () => {
    appendCitations([citation], storage);

    const raw = JSON.parse(getStoredSessionReferencesJson(storage));
    const stored = raw.items[0];
    expect(stored).not.toHaveProperty("citation_id");
    expect(stored).not.toHaveProperty("chunk_id");
    expect(stored).not.toHaveProperty("record_id");
    expect(stored).not.toHaveProperty("source_id");
    expect(stored).not.toHaveProperty("trace_id");
    expect(stored).not.toHaveProperty("page_number");
    expect(stored).not.toHaveProperty("score");
  });

  it("does not contain raw internals in serialized JSON string", () => {
    appendCitations([citation], storage);
    assertNoRawInternalsInJson(storage);
  });

  it("skips items without URL", () => {
    appendCitations([{ ...citation, url: "" }], storage);
    expect(readSessionReferences(storage)).toHaveLength(0);
  });

  it("deduplicates by canonical URL only", () => {
    appendCitations([citation], storage);
    appendCitations([citation], storage);

    const items = readSessionReferences(storage);
    expect(items).toHaveLength(1);
    expect(items[0].referenceCount).toBe(2);
  });

  it("increments referenceCount and updates lastReferencedAt on repeat", () => {
    appendCitations([citation], storage, "query 1");

    currentTime = "2026-05-04T13:00:00.000Z";
    appendCitations([citation], storage, "query 2");

    const items = readSessionReferences(storage);
    expect(items).toHaveLength(1);
    expect(items[0].referenceCount).toBe(2);
    expect(items[0].firstReferencedAt).toBe("2026-05-04T12:00:00.000Z");
    expect(items[0].lastReferencedAt).toBe("2026-05-04T13:00:00.000Z");
    expect(items[0].lastQuery).toBe("query 2");
  });

  it("backfills empty fields from new input", () => {
    const partial = {
      ...citation,
      title: "",
      posted_at: null,
    };
    appendCitations([partial], storage);
    appendCitations([citation], storage);

    const items = readSessionReferences(storage);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("ERICA 채용 공고 2026");
    expect(items[0].postedAt).toBe("2026-04-15T00:00:00.000Z");
  });

  it("maps active deadline_status to open", () => {
    appendCitations([{ ...citation, deadline_status: "active" }], storage);
    expect(readSessionReferences(storage)[0].deadlineStatus).toBe("open");
  });

  it("maps expired deadline_status to closed", () => {
    appendCitations([{ ...citation, deadline_status: "expired" }], storage);
    expect(readSessionReferences(storage)[0].deadlineStatus).toBe("closed");
  });

  it("maps closing-soon deadline_status", () => {
    appendCitations([{ ...citation, deadline_status: "closing-soon" }], storage);
    expect(readSessionReferences(storage)[0].deadlineStatus).toBe("closing_soon");
  });

  it("updates stale known deadline status from newer citation metadata", () => {
    appendCitations([{ ...citation, deadline_status: "active" }], storage);

    currentTime = "2026-05-04T13:00:00.000Z";
    appendCitations([{ ...citation, deadline_status: "expired" }], storage);

    const items = readSessionReferences(storage);
    expect(items[0].deadlineStatus).toBe("closed");
    expect(items[0].referenceCount).toBe(2);
  });

  it("does not replace known deadline status with unknown metadata", () => {
    appendCitations([{ ...citation, deadline_status: "expired" }], storage);

    currentTime = "2026-05-04T13:00:00.000Z";
    appendCitations([{ ...citation, deadline_status: "unknown" }], storage);

    expect(readSessionReferences(storage)[0].deadlineStatus).toBe("closed");
  });

  it("no-op when storage is unavailable", () => {
    const originalWindow = hideGlobalWindow();
    try {
      expect(() => appendCitations([citation])).not.toThrow();
    } finally {
      restoreGlobalWindow(originalWindow);
    }
  });
});

describe("appendRecommendations", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = mockStorage();
  });

  it("stores recommendation with user-facing fields only", () => {
    appendRecommendations([recommendation], storage, "프로그램");

    const items = readSessionReferences(storage);
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.url).toBe("https://cdp.hanyang.ac.kr/program/456");
    expect(item.title).toBe("커리어 개발 프로그램");
    expect(item.deadlineStatus).toBe("closed");
    expect(item.lastQuery).toBe("프로그램");
  });

  it("derives user-facing sourceLabel from source_id and URL", () => {
    appendRecommendations([recommendation], storage);

    const items = readSessionReferences(storage);
    expect(items[0].sourceLabel).toBe("한양대학교 ERICA 커리어개발센터");
  });

  it("does not store raw ranking internals as properties", () => {
    appendRecommendations([recommendation], storage);

    const raw = JSON.parse(getStoredSessionReferencesJson(storage));
    const stored = raw.items[0];
    expect(stored).not.toHaveProperty("recommendation_id");
    expect(stored).not.toHaveProperty("chunk_id");
    expect(stored).not.toHaveProperty("record_id");
    expect(stored).not.toHaveProperty("source_id");
    expect(stored).not.toHaveProperty("score");
    expect(stored).not.toHaveProperty("match_strength");
    expect(stored).not.toHaveProperty("match_reasons");
    expect(stored).not.toHaveProperty("score_breakdown");
    expect(stored).not.toHaveProperty("category");
    expect(stored).not.toHaveProperty("citations");
  });

  it("does not contain raw ranking internals in serialized JSON string", () => {
    appendRecommendations([recommendation], storage);
    assertNoRawInternalsInJson(storage);
  });

  it("deduplicates by URL across citation and recommendation with same URL", () => {
    appendCitations([citation], storage);
    appendRecommendations([{ ...recommendation, url: citation.url }], storage);

    const items = readSessionReferences(storage);
    expect(items).toHaveLength(1);
    expect(items[0].referenceCount).toBe(2);
  });
});

describe("clearSessionReferences", () => {
  it("removes only the session references key", () => {
    const storage = mockStorage({
      [SESSION_REFERENCES_KEY]: '{"_v":1,"items":[]}',
      "other-key": "preserve-me",
    });

    clearSessionReferences(storage);
    expect(storage.removeItem).toHaveBeenCalledWith(SESSION_REFERENCES_KEY);
    expect((storage.getItem as (...args: unknown[]) => unknown)("other-key")).toBe("preserve-me");
  });

  it("does not throw when storage is unavailable", () => {
    const throwingStorage: Storage = {
      getItem: () => { throw new Error("unavailable"); },
      setItem: () => { throw new Error("unavailable"); },
      removeItem: () => { throw new Error("unavailable"); },
      clear: () => {},
      get length() { return 0; },
      key: () => null,
    };

    expect(() => clearSessionReferences(throwingStorage)).not.toThrow();
  });

  it("no-op when called without storage and no window", () => {
    const originalWindow = hideGlobalWindow();
    try {
      expect(() => clearSessionReferences()).not.toThrow();
    } finally {
      restoreGlobalWindow(originalWindow);
    }
  });
});

describe("write failure handling", () => {
  it("does not throw on QuotaExceededError", () => {
    const storage: Storage = {
      getItem: () => null,
      setItem: () => {
        const err = new DOMException("Quota exceeded", "QuotaExceededError");
        throw err;
      },
      removeItem: () => {},
      clear: () => {},
      get length() { return 0; },
      key: () => null,
    };

    expect(() => appendCitations([citation], storage)).not.toThrow();
    expect(readSessionReferences(storage)).toEqual([]);
  });
});

describe("envelope format", () => {
  it("writes _v: 1 envelope", () => {
    const storage = mockStorage();
    appendCitations([citation], storage);

    const raw = JSON.parse(getStoredSessionReferencesJson(storage));
    expect(raw._v).toBe(1);
    expect(Array.isArray(raw.items)).toBe(true);
  });
});
