"use client";

import { useCallback, useEffect, useState } from "react";

import { clearPreferences, readPreferences, savePreferences, updatePreferences } from "../../lib/api-client.js";
import { getOrCreateSessionKey } from "../../lib/session-key.js";
import { PreferencePanel } from "../../components/preferences/preference-panel.js";
import type { PreferenceProfile, PreferenceState } from "../../src/personalization/preference-contract.js";

const emptyPreferenceState: PreferenceState = { preference_ranking_enabled: false, profile: null, storage_scope: "none" };

export default function SettingsPage() {
  const [sessionKey, setSessionKey] = useState("settings-session-pending");
  const [preferenceState, setPreferenceState] = useState<PreferenceState>(emptyPreferenceState);

  useEffect(() => {
    const key = getOrCreateSessionKey();
    setSessionKey(key);
    void readPreferences(key).then((result) => { if (result.ok) setPreferenceState(result.data); });
  }, []);

  const handleSave = useCallback(async (key: string, profile: PreferenceProfile) => {
    const result = await savePreferences(key, profile);
    if (result.ok) setPreferenceState(result.data);
  }, []);

  const handleUpdate = useCallback(async (key: string, profile: Partial<PreferenceProfile>) => {
    const result = await updatePreferences(key, profile);
    if (result.ok) setPreferenceState(result.data);
  }, []);

  const handleClear = useCallback(async (key: string) => {
    const result = await clearPreferences(key);
    if (result.ok) setPreferenceState(result.data);
  }, []);

  const handleRead = useCallback(async (key: string) => {
    const result = await readPreferences(key);
    if (result.ok) setPreferenceState(result.data);
  }, []);

  return (
    <div className="settings-page">
      <header className="route-hero card-surface">
        <div>
          <h1>설정</h1>
          <p>상담 조건과 저장 범위를 관리할 수 있어요.</p>
        </div>
      </header>

      <section className="settings-controls card-surface" aria-label="상담 조건과 저장 범위">
        <p className="panel-kicker">실제 제공 기능</p>
        <p>입력한 조건은 현재 세션 기준 추천 순서에만 사용돼요. 필요하면 언제든 지울 수 있습니다.</p>
        <PreferencePanel state={preferenceState} sessionKey={sessionKey} onSet={handleSave} onUpdate={handleUpdate} onClear={handleClear} onRead={handleRead} />
      </section>
    </div>
  );
}
