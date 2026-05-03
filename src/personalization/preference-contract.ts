import { z } from "zod";

export const DeadlineSensitivitySchema = z.enum(["urgent_first", "balanced", "include_unknown"]);

const PreferenceTextSchema = z.string().trim().min(1).max(80);

export const PreferenceProfileSchema = z
  .strictObject({
    major: z.string().trim().min(1).max(80),
    target_role: z.string().trim().min(1).max(120),
    industry: z.array(PreferenceTextSchema).max(5).default([]),
    region: z.array(PreferenceTextSchema).max(5).default([]),
    employment_type: z.array(PreferenceTextSchema).max(5).default([]),
    deadline_sensitivity: DeadlineSensitivitySchema.default("balanced"),
    session_only_optional_text: z.string().trim().max(500).optional(),
  });

export const PersistentPreferenceProfileSchema = PreferenceProfileSchema.omit({
  session_only_optional_text: true,
});

export const PreferenceConsentSchema = z.strictObject({
  consented_at: z.iso.datetime(),
  retention_days: z.number().int().positive().max(365),
  deletion_supported: z.literal(true),
});

export const PreferenceStorageScopeSchema = z.enum(["none", "session", "persistent"]);

export const PreferenceStateSchema = z.strictObject({
  preference_ranking_enabled: z.boolean(),
  profile: PersistentPreferenceProfileSchema.nullable(),
  storage_scope: PreferenceStorageScopeSchema,
});

export const PreferenceLifecycleEventSchema = z.strictObject({
  event: z.enum(["set", "update", "clear"]),
  occurred_at: z.iso.datetime(),
  storage_scope: PreferenceStorageScopeSchema,
});

export type DeadlineSensitivity = z.infer<typeof DeadlineSensitivitySchema>;
export type PreferenceProfile = z.infer<typeof PreferenceProfileSchema>;
export type PersistentPreferenceProfile = z.infer<typeof PersistentPreferenceProfileSchema>;
export type PreferenceConsent = z.infer<typeof PreferenceConsentSchema>;
export type PreferenceStorageScope = z.infer<typeof PreferenceStorageScopeSchema>;
export type PreferenceState = z.infer<typeof PreferenceStateSchema>;
export type PreferenceLifecycleEvent = z.infer<typeof PreferenceLifecycleEventSchema>;
