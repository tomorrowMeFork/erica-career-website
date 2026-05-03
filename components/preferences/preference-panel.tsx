"use client";

import { useEffect, useState } from "react";
import type { PreferenceProfile, PreferenceState } from "../../src/personalization/preference-contract.js";
import { PreferenceOptionalAccordion } from "./preference-optional-accordion.js";
import { PreferenceRequiredFields } from "./preference-required-fields.js";
import { StorageScopeChip } from "./storage-scope-chip.js";

export function PreferencePanel({ state, sessionKey, onSet, onUpdate, onClear, onRead }: { state: PreferenceState; sessionKey: string; onSet: (sessionKey: string, profile: PreferenceProfile) => void; onUpdate: (sessionKey: string, profile: Partial<PreferenceProfile>) => void; onClear: (sessionKey: string) => void; onRead: (sessionKey: string) => void }) {
  const [major, setMajor] = useState(state.profile?.major ?? "");
  const [targetRole, setTargetRole] = useState(state.profile?.target_role ?? "");
  const [sessionText, setSessionText] = useState("");
  useEffect(() => {
    onRead(sessionKey);
  }, [onRead, sessionKey]);
  const canSave = major.trim().length > 0 && targetRole.trim().length > 0;
  const profile: PreferenceProfile = { major, target_role: targetRole, industry: [], region: [], employment_type: [], deadline_sensitivity: "balanced", ...(sessionText.trim().length > 0 ? { session_only_optional_text: sessionText } : {}) };
  return (
    <section className="preference-panel soft-surface" aria-label="추천 조건">
      <header><h2>입력한 조건</h2><StorageScopeChip storageScope={state.storage_scope} rankingEnabled={state.preference_ranking_enabled} /></header>
      <p>전공과 희망 직무를 입력하면 추천 순서를 조정할 수 있어요.</p>
      <PreferenceRequiredFields major={major} targetRole={targetRole} onChange={(value) => { setMajor(value.major); setTargetRole(value.target_role); }} />
      <PreferenceOptionalAccordion onTextChange={setSessionText} />
      <button type="button" className="pill-control primary-button" disabled={!canSave} onClick={() => onSet(sessionKey, profile)}>추천 조건 저장</button>
      <button type="button" className="pill-control" disabled={!canSave} onClick={() => onUpdate(sessionKey, profile)}>추천 조건 업데이트</button>
      <button type="button" className="pill-control" onClick={() => onClear(sessionKey)}>추천 조건 지우기</button>
    </section>
  );
}
