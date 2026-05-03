import { describe, expect, it } from "vitest";

import {
  PreferenceConsentSchema,
  PreferenceProfileSchema,
  PreferenceStateSchema,
  PersistentPreferenceProfileSchema,
} from "./preference-contract.js";

describe("PreferenceProfileSchema", () => {
  it("requires major and target_role while defaulting optional preferences", () => {
    const parsed = PreferenceProfileSchema.parse({
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
    });

    expect(parsed).toEqual({
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
      industry: [],
      region: [],
      employment_type: [],
      deadline_sensitivity: "balanced",
    });
  });

  it("accepts optional structured preferences independently", () => {
    const withIndustry = PreferenceProfileSchema.parse({
      major: "경영학부",
      target_role: "마케팅 인턴",
      industry: ["IT"],
    });
    const withRegion = PreferenceProfileSchema.parse({
      major: "경영학부",
      target_role: "마케팅 인턴",
      region: ["서울"],
    });
    const withEmploymentTypeAndDeadline = PreferenceProfileSchema.parse({
      major: "경영학부",
      target_role: "마케팅 인턴",
      employment_type: ["인턴"],
      deadline_sensitivity: "urgent_first",
    });

    expect(withIndustry.industry).toEqual(["IT"]);
    expect(withIndustry.region).toEqual([]);
    expect(withRegion.region).toEqual(["서울"]);
    expect(withRegion.employment_type).toEqual([]);
    expect(withEmploymentTypeAndDeadline.employment_type).toEqual(["인턴"]);
    expect(withEmploymentTypeAndDeadline.deadline_sensitivity).toBe("urgent_first");
  });

  it("allows session-only optional text only on non-persistent input", () => {
    const parsed = PreferenceProfileSchema.parse({
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
      session_only_optional_text: "스타트업 채용도 궁금해요",
    });

    expect(parsed.session_only_optional_text).toBe("스타트업 채용도 궁금해요");
  });
});

describe("PersistentPreferenceProfileSchema", () => {
  it("rejects raw optional free text from persistent profiles", () => {
    const result = PersistentPreferenceProfileSchema.safeParse({
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
      session_only_optional_text: "저장되면 안 되는 자유 입력",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown keys, identifiers, inferred attributes, chat history, resume fields, and SSO fields", () => {
    const forbiddenProfiles: unknown[] = [
      { major: "컴퓨터학부", target_role: "백엔드 개발자", user_id: "u-1" },
      { major: "컴퓨터학부", target_role: "백엔드 개발자", student_id: "2024000000" },
      { major: "컴퓨터학부", target_role: "백엔드 개발자", inferred_personality: "active" },
      { major: "컴퓨터학부", target_role: "백엔드 개발자", chat_history: ["안녕하세요"] },
      { major: "컴퓨터학부", target_role: "백엔드 개발자", resume_text: "이력서 원문" },
      { major: "컴퓨터학부", target_role: "백엔드 개발자", sso_subject: "hanyang-user" },
    ];

    expect(forbiddenProfiles.every((profile) => !PersistentPreferenceProfileSchema.safeParse(profile).success)).toBe(true);
  });
});

describe("PreferenceConsentSchema", () => {
  it("requires ISO consent time, bounded positive retention, and supported deletion", () => {
    expect(
      PreferenceConsentSchema.parse({
        consented_at: "2026-05-04T00:00:00.000Z",
        retention_days: 30,
        deletion_supported: true,
      }),
    ).toEqual({
      consented_at: "2026-05-04T00:00:00.000Z",
      retention_days: 30,
      deletion_supported: true,
    });

    expect(PreferenceConsentSchema.safeParse({ consented_at: "2026-05-04", retention_days: 30, deletion_supported: true }).success).toBe(false);
    expect(PreferenceConsentSchema.safeParse({ consented_at: "2026-05-04T00:00:00.000Z", retention_days: 0, deletion_supported: true }).success).toBe(false);
    expect(PreferenceConsentSchema.safeParse({ consented_at: "2026-05-04T00:00:00.000Z", retention_days: 366, deletion_supported: true }).success).toBe(false);
    expect(PreferenceConsentSchema.safeParse({ consented_at: "2026-05-04T00:00:00.000Z", retention_days: 30, deletion_supported: false }).success).toBe(false);
  });
});

describe("PreferenceStateSchema", () => {
  it("represents no-preference state with ranking disabled", () => {
    expect(
      PreferenceStateSchema.parse({
        preference_ranking_enabled: false,
        profile: null,
        storage_scope: "none",
      }),
    ).toEqual({
      preference_ranking_enabled: false,
      profile: null,
      storage_scope: "none",
    });
  });
});
