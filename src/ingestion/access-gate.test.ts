import { describe, expect, it } from "vitest";
import {
  assertCanIngestSource,
  evaluateIngestionAccess,
  type IngestionCollectionMethod,
} from "./access-gate.js";
import type { SourceRecord, SourceRegistry } from "../source-governance/source-registry.schema.js";

const baseSource: SourceRecord = {
  source_id: "cdp-root",
  canonical_url: "https://cdp.hanyang.ac.kr/",
  source_name: "한양대 커리어 개발센터",
  source_type: "root",
  content_type: "html",
  category: "CDP root discovery",
  approval_scope: "seed_urls_only",
  approval_basis: "user_assertion",
  approval_status: "pending_review",
  auth_required: false,
  auth_mode: "none",
  review_status: "pending",
  allowed_collection_method: "none_until_review",
  checklist_reference: "source-access-review.md#cdp-root",
  robots_status: "disallow_all_raw_evidence",
  tos_status: "not_reviewed",
  rate_limit_posture: "moderate_1_2s_low_concurrency",
  refresh_cadence: "weekly_when_approved",
  owner_label: "한양대학교 커리어개발팀",
  last_checked_at: "2026-05-03T00:00:00.000Z",
  scheduled_crawling_enabled: false,
  notes: "Seed URL only; no official Hanyang authorization claimed.",
  next_action: "Complete access review before discovery.",
};

function reviewedSource(overrides: Partial<SourceRecord>): SourceRecord {
  return {
    ...baseSource,
    approval_status: "approved_for_manual_discovery",
    review_status: "reviewed",
    robots_status: "allow_empty_disallow",
    tos_status: "found_allows",
    ...overrides,
  };
}

describe("evaluateIngestionAccess", () => {
  it("blocks a pending source with none_until_review and reports not reviewed", () => {
    const decision = evaluateIngestionAccess(baseSource, "public_html");

    expect(decision.status).toBe("blocked");
    expect(decision.reasons.some((reason) => reason.includes("not reviewed"))).toBe(true);
    expect(decision.reasons.some((reason) => reason.includes("none_until_review"))).toBe(true);
  });

  it("rejects scheduled crawling even when review and collection method look approved", () => {
    const sourceWithSchedulingEnabled = {
      ...reviewedSource({ allowed_collection_method: "approved_bounded_browser_discovery" }),
      scheduled_crawling_enabled: true,
    };

    const decision = evaluateIngestionAccess(sourceWithSchedulingEnabled, "public_html");

    expect(decision.status).toBe("blocked");
    expect(decision.reasons).toContain("scheduled_crawling_enabled must remain false for ingestion access");
  });

  it.each([
    ["cdp-career-category-discovery", "category_discovery"],
    ["cdp-recruit-category-discovery", "category_discovery"],
    ["book-success-story-viewer", "document_viewer"],
  ] as const)("keeps %s structure-observation-only until reviewed with an approved method", (sourceId, sourceType) => {
    const decision = evaluateIngestionAccess(
      {
        ...baseSource,
        source_id: sourceId,
        source_type: sourceType,
        content_type: sourceType === "document_viewer" ? "viewer" : "html",
      },
      "public_html",
    );

    expect(decision.status).toBe("blocked");
    expect(decision.collection_method).toBe("structure_observation_only");
    expect(decision.reasons.some((reason) => reason.includes("structure-observation-only"))).toBe(true);
  });

  it.each([
    [
      "ibus-employment-board",
      "public_html",
      reviewedSource({
        source_id: "ibus-employment-board",
        canonical_url: "https://ibus.hanyang.ac.kr/front/recruit/r-1",
        source_name: "경상대학 취업정보 게시판",
        source_type: "board",
        content_type: "html",
        allowed_collection_method: "approved_bounded_browser_discovery",
      }),
    ],
    [
      "cdp-student-guide-pdf",
      "manual_pdf_download",
      reviewedSource({
        source_id: "cdp-student-guide-pdf",
        canonical_url: "https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf",
        source_name: "CDP 학생 매뉴얼 PDF",
        source_type: "pdf",
        content_type: "pdf",
        allowed_collection_method: "approved_manual_download",
      }),
    ],
  ] as const)("allows synthetic reviewed approved source %s for %s", (_sourceId, requestedMethod, source) => {
    const decision = evaluateIngestionAccess(source, requestedMethod as IngestionCollectionMethod);

    expect(decision.status).toBe("allowed");
    expect(decision.reasons).toEqual([]);
  });
});

describe("assertCanIngestSource", () => {
  it("throws for pending registry records before parser collection", () => {
    const registry: SourceRegistry = { sources: [baseSource] };

    expect(() => assertCanIngestSource(registry, "cdp-root", "public_html")).toThrow(/Ingestion blocked/);
  });
});
