import { describe, expect, it } from "vitest";
import { buildRecordId, chunkNormalizedRecord, sha256 } from "./chunking.js";
import type { NormalizedRecord } from "./normalized-record.js";

const cleanedText = [
  "ERICA 채용 공고",
  "마감일: 2026-05-31 / 게시일: 2026-05-01",
  "공식 상세 URL: https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
  "지원자는 공식 페이지의 최신 정보를 확인해야 합니다.",
].join("\n\n");

const baseRecord: NormalizedRecord = {
  record_id: "record-1",
  source_id: "ibus-employment-board",
  source_name: "경상대학 취업정보 게시판",
  source_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1",
  canonical_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
  title: "ERICA 채용 공고",
  category: "취업정보",
  fetched_at: "2026-05-03T00:00:00.000Z",
  posted_at: "2026-05-01T00:00:00.000Z",
  deadline_status: "active",
  deadline_raw_text: "마감일: 2026-05-31",
  raw_text: cleanedText,
  cleaned_text: cleanedText,
  content_hash: sha256(cleanedText),
  citation_anchors: [
    {
      url: "https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123",
      label: "공식 채용 상세 페이지",
    },
  ],
  source_text_trust: "untrusted_source_text",
};

describe("sha256", () => {
  it("returns the standard SHA-256 hex digest for abc", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("buildRecordId", () => {
  it("returns a deterministic record ID from stable record fields", () => {
    const first = buildRecordId(baseRecord);
    const second = buildRecordId({ ...baseRecord });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
  });
});

describe("chunkNormalizedRecord", () => {
  it("returns stable chunk IDs across repeated runs", () => {
    const first = chunkNormalizedRecord(baseRecord, { max_characters: 80 });
    const second = chunkNormalizedRecord(baseRecord, { max_characters: 80 });

    expect(first.map((chunk) => chunk.chunk_id)).toEqual(second.map((chunk) => chunk.chunk_id));
    expect(first.map((chunk) => chunk.chunk_ordinal)).toEqual([0, 1, 2]);
  });

  it("preserves citation anchors and freshness/deadline fields exactly", () => {
    const chunks = chunkNormalizedRecord(baseRecord, { max_characters: 80 });

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.source_id).toBe(baseRecord.source_id);
      expect(chunk.source_name).toBe(baseRecord.source_name);
      expect(chunk.source_url).toBe(baseRecord.source_url);
      expect(chunk.canonical_url).toBe(baseRecord.canonical_url);
      expect(chunk.fetched_at).toBe(baseRecord.fetched_at);
      expect(chunk.posted_at).toBe(baseRecord.posted_at);
      expect(chunk.deadline_status).toBe(baseRecord.deadline_status);
      expect(chunk.deadline_raw_text).toBe(baseRecord.deadline_raw_text);
      expect(chunk.content_hash).toBe(baseRecord.content_hash);
      expect(chunk.citation_anchors).toEqual(baseRecord.citation_anchors);
      expect(chunk.source_text_trust).toBe("untrusted_source_text");
    }
  });

  it("does not drop Korean text, URLs, dates, deadline fields, or citation anchors", () => {
    const chunks = chunkNormalizedRecord(baseRecord, { max_characters: 80 });
    const combinedText = chunks.map((chunk) => chunk.text).join("\n\n");

    expect(combinedText).toContain("ERICA 채용 공고");
    expect(combinedText).toContain("마감일: 2026-05-31");
    expect(combinedText).toContain("게시일: 2026-05-01");
    expect(combinedText).toContain("https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=123");
    expect(chunks[0]?.citation_anchors).toEqual(baseRecord.citation_anchors);
  });

  it("returns no chunks for empty or whitespace-only cleaned text without fabricating content", () => {
    expect(chunkNormalizedRecord({ ...baseRecord, cleaned_text: "" })).toEqual([]);
    expect(chunkNormalizedRecord({ ...baseRecord, cleaned_text: "\n\t  " })).toEqual([]);
  });

  it("builds deterministic chunk IDs from source, content hash, primary anchor URL, and ordinal", () => {
    const [firstChunk] = chunkNormalizedRecord(baseRecord, { max_characters: 80 });
    const expectedChunkId = sha256(
      [baseRecord.source_id, baseRecord.content_hash, baseRecord.citation_anchors[0].url, "0"].join("\u001f"),
    );

    expect(firstChunk?.chunk_id).toBe(expectedChunkId);
  });
});
