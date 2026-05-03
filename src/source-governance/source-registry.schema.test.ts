import { describe, expect, it } from "vitest";
import { SourceRecordSchema, SourceRegistrySchema, type SourceRecord } from "./source-registry.schema.js";

const validCdpRootRecord: SourceRecord = {
  source_id: "cdp-root",
  canonical_url: "https://cdp.hanyang.ac.kr/",
  source_name: "한양대학교 커리어개발센터",
  source_type: "root",
  content_type: "html",
  category: "career-development-center-root",
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
  owner_label: "Hanyang Career Development Center",
  last_checked_at: "2026-05-03T00:00:00.000Z",
  scheduled_crawling_enabled: false,
  notes: "Seed URL only; no official Hanyang authorization claimed.",
  next_action: "Complete access review before discovery.",
};

describe("SourceRecordSchema", () => {
  it("rejects records missing D-07/D-08 governance fields robots_status, tos_status, or approval_basis", () => {
    for (const fieldName of ["robots_status", "tos_status", "approval_basis"] as const) {
      const candidate = { ...validCdpRootRecord };
      delete candidate[fieldName];

      expect(SourceRecordSchema.safeParse(candidate).success).toBe(false);
    }
  });

  it("rejects SAFE-05 scheduled crawling attempts when scheduled_crawling_enabled: true", () => {
    const candidate = {
      ...validCdpRootRecord,
      scheduled_crawling_enabled: true,
    };

    expect(SourceRecordSchema.safeParse(candidate).success).toBe(false);
  });

  it("accepts a valid CDP root record with D-07/D-08 evidence and SAFE-05 crawling disabled", () => {
    const result = SourceRecordSchema.safeParse(validCdpRootRecord);

    expect(result.success).toBe(true);
  });

  it("rejects records missing SAFE-05 access review fields review_status, allowed_collection_method, or checklist_reference", () => {
    for (const fieldName of ["review_status", "allowed_collection_method", "checklist_reference"] as const) {
      const candidate = { ...validCdpRootRecord };
      delete candidate[fieldName];

      expect(SourceRecordSchema.safeParse(candidate).success).toBe(false);
    }
  });
});

describe("SourceRegistrySchema", () => {
  it("rejects duplicate source identifiers with Duplicate source_id", () => {
    const result = SourceRegistrySchema.safeParse({
      sources: [validCdpRootRecord, { ...validCdpRootRecord }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("Duplicate source_id"))).toBe(true);
    }
  });
});
