import { describe, expect, it } from "vitest";

import { PreferenceService } from "./preference-service.js";
import { InMemoryPreferenceStore } from "./preference-store.js";

const consent = {
  consented_at: "2026-05-04T00:00:00.000Z",
  retention_days: 120,
  deletion_supported: true,
};

describe("PreferenceService", () => {
  it("sets preferences from explicit user input", async () => {
    const service = new PreferenceService(new InMemoryPreferenceStore());

    const state = await service.setPreferences("session-a", {
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
      session_only_optional_text: "핀테크 회사도 궁금해요",
    });

    expect(state.preference_ranking_enabled).toBe(true);
    expect(state.profile).toEqual({
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
      industry: [],
      region: [],
      employment_type: [],
      deadline_sensitivity: "balanced",
    });
  });

  it("updates stored structured preferences without inferring missing fields", async () => {
    const service = new PreferenceService(new InMemoryPreferenceStore());

    await service.setPreferences("session-a", {
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
      region: ["안산"],
    });
    const state = await service.updatePreferences("session-a", {
      target_role: "데이터 엔지니어",
      employment_type: ["정규직"],
    });

    expect(state.profile).toEqual({
      major: "컴퓨터학부",
      target_role: "데이터 엔지니어",
      industry: [],
      region: ["안산"],
      employment_type: ["정규직"],
      deadline_sensitivity: "balanced",
    });
  });

  it("disables preference ranking after clear", async () => {
    const service = new PreferenceService(new InMemoryPreferenceStore());

    await service.setPreferences("session-a", {
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
    });
    const state = await service.clearPreferences("session-a");

    expect(state).toEqual({
      preference_ranking_enabled: false,
      profile: null,
      storage_scope: "none",
    });
    await expect(service.readState("session-a")).resolves.toEqual(state);
  });

  it("does not return raw optional free text from persistent profile reads", async () => {
    const service = new PreferenceService(new InMemoryPreferenceStore());

    const state = await service.setPreferences(
      "session-a",
      {
        major: "컴퓨터학부",
        target_role: "백엔드 개발자",
        session_only_optional_text: "저장하지 않을 자유 입력",
      },
      { persist: true, consent },
    );

    expect(state.storage_scope).toBe("persistent");
    expect(state.profile).toEqual({
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
      industry: [],
      region: [],
      employment_type: [],
      deadline_sensitivity: "balanced",
    });
    expect(JSON.stringify(state)).not.toContain("저장하지 않을 자유 입력");
  });

  it("requires consent before persistent service writes", async () => {
    const service = new PreferenceService(new InMemoryPreferenceStore());

    await expect(
      service.setPreferences(
        "session-a",
        {
          major: "컴퓨터학부",
          target_role: "백엔드 개발자",
        },
        { persist: true },
      ),
    ).rejects.toThrow("preference persistence requires explicit consent, retention, and deletion behavior");

    await expect(service.readState("session-a")).resolves.toEqual({
      preference_ranking_enabled: false,
      profile: null,
      storage_scope: "none",
    });
  });

  it("clearing one session does not clear another", async () => {
    const service = new PreferenceService(new InMemoryPreferenceStore());

    await service.setPreferences("session-a", { major: "컴퓨터학부", target_role: "백엔드 개발자" });
    await service.setPreferences("session-b", { major: "경영학부", target_role: "마케팅 인턴" });
    await service.clearPreferences("session-a");

    expect((await service.readState("session-a")).preference_ranking_enabled).toBe(false);
    expect((await service.readState("session-b")).profile?.target_role).toBe("마케팅 인턴");
  });
});
