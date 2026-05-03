import {
  PreferenceConsentSchema,
  PreferenceProfileSchema,
  PreferenceStateSchema,
  PersistentPreferenceProfileSchema,
  type PreferenceConsent,
  type PreferenceProfile,
  type PreferenceState,
  type PersistentPreferenceProfile,
} from "./preference-contract.js";

export interface PreferenceStore {
  read(sessionKey: string): Promise<PreferenceState>;
  writeSession(sessionKey: string, profile: unknown): Promise<void>;
  writePersistent(sessionKey: string, profile: unknown, consent: unknown): Promise<void>;
  clear(sessionKey: string): Promise<void>;
}

const consentErrorMessage = "preference persistence requires explicit consent, retention, and deletion behavior";

type StoredPreferenceRecord = {
  profile: PersistentPreferenceProfile;
  storage_scope: "session" | "persistent";
  expires_at?: Date;
};

export function requirePreferencePersistenceConsent(consent: unknown): PreferenceConsent {
  const result = PreferenceConsentSchema.safeParse(consent);
  if (!result.success) {
    throw new Error(consentErrorMessage);
  }
  return result.data;
}

export class InMemoryPreferenceStore implements PreferenceStore {
  private readonly records = new Map<string, StoredPreferenceRecord>();

  async read(sessionKey: string): Promise<PreferenceState> {
    const record = this.records.get(sessionKey);
    if (record === undefined) {
      return PreferenceStateSchema.parse({
        preference_ranking_enabled: false,
        profile: null,
        storage_scope: "none",
      });
    }

    if (record.storage_scope === "persistent" && record.expires_at !== undefined) {
      const now = new Date();
      if (now >= record.expires_at) {
        this.records.delete(sessionKey);
        return PreferenceStateSchema.parse({
          preference_ranking_enabled: false,
          profile: null,
          storage_scope: "none",
        });
      }
    }

    return PreferenceStateSchema.parse({
      preference_ranking_enabled: true,
      profile: record.profile,
      storage_scope: record.storage_scope,
    });
  }

  async writeSession(sessionKey: string, profile: unknown): Promise<void> {
    const parsedProfile = PreferenceProfileSchema.parse(profile);
    this.records.set(sessionKey, {
      profile: toPersistentPreferenceProfile(parsedProfile),
      storage_scope: "session",
    });
  }

  async writePersistent(sessionKey: string, profile: unknown, consent: unknown): Promise<void> {
    const parsedConsent = requirePreferencePersistenceConsent(consent);
    const parsedProfile = PreferenceProfileSchema.parse(profile);
    const consentedAt = new Date(parsedConsent.consented_at);
    const expiresAt = new Date(consentedAt.getTime() + parsedConsent.retention_days * 86_400_000);
    this.records.set(sessionKey, {
      profile: toPersistentPreferenceProfile(parsedProfile),
      storage_scope: "persistent",
      expires_at: expiresAt,
    });
  }

  async clear(sessionKey: string): Promise<void> {
    this.records.delete(sessionKey);
  }
}

export function toPersistentPreferenceProfile(profile: PreferenceProfile): PersistentPreferenceProfile {
  const { session_only_optional_text: _sessionOnlyOptionalText, ...persistentProfile } = profile;
  return PersistentPreferenceProfileSchema.parse(persistentProfile);
}
