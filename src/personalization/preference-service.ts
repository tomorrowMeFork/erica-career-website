import { z } from "zod";

import {
  DeadlineSensitivitySchema,
  PreferenceProfileSchema,
  type PreferenceProfile,
  type PreferenceState,
} from "./preference-contract.js";
import { type PreferenceStore } from "./preference-store.js";

const PreferenceUpdateTextSchema = z.string().trim().min(1).max(80);

const PreferenceProfileUpdateSchema = z.strictObject({
  major: z.string().trim().min(1).max(80).optional(),
  target_role: z.string().trim().min(1).max(120).optional(),
  industry: z.array(PreferenceUpdateTextSchema).max(5).optional(),
  region: z.array(PreferenceUpdateTextSchema).max(5).optional(),
  employment_type: z.array(PreferenceUpdateTextSchema).max(5).optional(),
  deadline_sensitivity: DeadlineSensitivitySchema.optional(),
  session_only_optional_text: z.string().trim().max(500).optional(),
});

export type PreferenceSetOptions = {
  persist?: boolean;
  consent?: unknown;
};

export type PreferenceUpdate = z.infer<typeof PreferenceProfileUpdateSchema>;

export class PreferenceService {
  constructor(private readonly store: PreferenceStore) {}

  async setPreferences(sessionKey: string, input: unknown, options: PreferenceSetOptions = {}): Promise<PreferenceState> {
    const profile = PreferenceProfileSchema.parse(input);
    await this.write(sessionKey, profile, options);
    return this.store.read(sessionKey);
  }

  async updatePreferences(sessionKey: string, input: unknown, options: PreferenceSetOptions = {}): Promise<PreferenceState> {
    const update = PreferenceProfileUpdateSchema.parse(input);
    const currentState = await this.store.read(sessionKey);
    const nextProfileInput = {
      ...(currentState.profile ?? {}),
      ...update,
    };
    const nextProfile = PreferenceProfileSchema.parse(nextProfileInput);

    await this.write(sessionKey, nextProfile, options);
    return this.store.read(sessionKey);
  }

  async clearPreferences(sessionKey: string): Promise<PreferenceState> {
    await this.store.clear(sessionKey);
    return this.store.read(sessionKey);
  }

  async readState(sessionKey: string): Promise<PreferenceState> {
    return this.store.read(sessionKey);
  }

  private async write(sessionKey: string, profile: PreferenceProfile, options: PreferenceSetOptions): Promise<void> {
    if (options.persist === true) {
      await this.store.writePersistent(sessionKey, profile, options.consent);
      return;
    }

    await this.store.writeSession(sessionKey, profile);
  }
}
