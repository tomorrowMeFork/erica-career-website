import { describe, expect, it } from "vitest";

import { InMemoryPreferenceStore, requirePreferencePersistenceConsent } from "./preference-store.js";

const profile = {
  major: "컴퓨터학부",
  target_role: "백엔드 개발자",
};

const consent = {
  consented_at: "2026-05-04T00:00:00.000Z",
  retention_days: 90,
  deletion_supported: true,
};

describe("requirePreferencePersistenceConsent", () => {
  it("requires explicit consent for persistent writes", () => {
    expect(() => requirePreferencePersistenceConsent(undefined)).toThrow(
      "preference persistence requires explicit consent, retention, and deletion behavior",
    );
    expect(() =>
      requirePreferencePersistenceConsent({
        consented_at: "not-iso",
        retention_days: 90,
        deletion_supported: true,
      }),
    ).toThrow("preference persistence requires explicit consent, retention, and deletion behavior");
  });

  it("returns parsed consent when retention and deletion behavior are valid", () => {
    expect(requirePreferencePersistenceConsent(consent)).toEqual(consent);
  });
});

describe("InMemoryPreferenceStore", () => {
  it("writes and reads session preferences without enabling persistence", async () => {
    const store = new InMemoryPreferenceStore();

    await store.writeSession("session-a", profile);

    await expect(store.read("session-a")).resolves.toEqual({
      preference_ranking_enabled: true,
      profile: {
        major: "컴퓨터학부",
        target_role: "백엔드 개발자",
        industry: [],
        region: [],
        employment_type: [],
        deadline_sensitivity: "balanced",
      },
      storage_scope: "session",
    });
  });

  it("does not mutate durable state when persistent consent is invalid", async () => {
    const store = new InMemoryPreferenceStore();

    await expect(store.writePersistent("session-a", profile, undefined)).rejects.toThrow(
      "preference persistence requires explicit consent, retention, and deletion behavior",
    );

    await expect(store.read("session-a")).resolves.toEqual({
      preference_ranking_enabled: false,
      profile: null,
      storage_scope: "none",
    });
  });

  it("writes persistent preferences only after consent validation", async () => {
    const store = new InMemoryPreferenceStore();

    await store.writePersistent("session-a", profile, consent);

    const state = await store.read("session-a");

    expect(state.preference_ranking_enabled).toBe(true);
    expect(state.storage_scope).toBe("persistent");
    expect(state.profile).toEqual({
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
      industry: [],
      region: [],
      employment_type: [],
      deadline_sensitivity: "balanced",
    });
  });

  it("clears only the requested session", async () => {
    const store = new InMemoryPreferenceStore();

    await store.writeSession("session-a", profile);
    await store.writeSession("session-b", { major: "경영학부", target_role: "마케팅 인턴" });
    await store.clear("session-a");

    await expect(store.read("session-a")).resolves.toEqual({
      preference_ranking_enabled: false,
      profile: null,
      storage_scope: "none",
    });
    expect((await store.read("session-b")).profile?.major).toBe("경영학부");
  });

  it("returns persistent profile before retention expires", async () => {
    const store = new InMemoryPreferenceStore();

    const futureConsent = {
      consented_at: "2099-12-01T00:00:00.000Z",
      retention_days: 90,
      deletion_supported: true,
    };

    await store.writePersistent("session-retention", profile, futureConsent);

    const state = await store.read("session-retention");
    expect(state.preference_ranking_enabled).toBe(true);
    expect(state.storage_scope).toBe("persistent");
    expect(state.profile?.major).toBe("컴퓨터학부");
  });

  it("clears persistent profile and returns empty state after retention expires", async () => {
    const store = new InMemoryPreferenceStore();

    const expiredConsent = {
      consented_at: "2020-01-01T00:00:00.000Z",
      retention_days: 1,
      deletion_supported: true,
    };

    await store.writePersistent("session-expired", profile, expiredConsent);

    await expect(store.read("session-expired")).resolves.toEqual({
      preference_ranking_enabled: false,
      profile: null,
      storage_scope: "none",
    });

    await expect(store.read("session-expired")).resolves.toEqual({
      preference_ranking_enabled: false,
      profile: null,
      storage_scope: "none",
    });
  });

  it("does not apply retention expiry to session-scoped records", async () => {
    const store = new InMemoryPreferenceStore();

    await store.writeSession("session-only", profile);

    const state = await store.read("session-only");
    expect(state.preference_ranking_enabled).toBe(true);
    expect(state.storage_scope).toBe("session");
    expect(state.profile?.major).toBe("컴퓨터학부");
  });
});
