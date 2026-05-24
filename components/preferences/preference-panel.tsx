import { useEffect, useState } from "react";
import type { DeadlineSensitivity, PreferenceProfile, PreferenceState } from "../../src/personalization/preference-contract.js";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card.js";
import { Separator } from "../ui/separator.js";
import { PreferenceOptionalAccordion } from "./preference-optional-accordion.js";
import { PreferenceRequiredFields } from "./preference-required-fields.js";
import { StorageScopeChip } from "./storage-scope-chip.js";

export function PreferencePanel({ state, sessionKey, onSet, onUpdate, onClear, onRead }: { state: PreferenceState; sessionKey: string; onSet: (sessionKey: string, profile: PreferenceProfile) => void; onUpdate: (sessionKey: string, profile: Partial<PreferenceProfile>) => void; onClear: (sessionKey: string) => void; onRead: (sessionKey: string) => void }) {
  const [major, setMajor] = useState(state.profile?.major ?? "");
  const [targetRole, setTargetRole] = useState(state.profile?.target_role ?? "");
  const [industry, setIndustry] = useState(state.profile?.industry ?? []);
  const [region, setRegion] = useState(state.profile?.region ?? []);
  const [employmentType, setEmploymentType] = useState(state.profile?.employment_type ?? []);
  const [deadlineSensitivity, setDeadlineSensitivity] = useState<DeadlineSensitivity>(state.profile?.deadline_sensitivity ?? "balanced");
  const [sessionText, setSessionText] = useState("");
  useEffect(() => {
    onRead(sessionKey);
  }, [onRead, sessionKey]);
  useEffect(() => {
    setMajor(state.profile?.major ?? "");
    setTargetRole(state.profile?.target_role ?? "");
    setIndustry(state.profile?.industry ?? []);
    setRegion(state.profile?.region ?? []);
    setEmploymentType(state.profile?.employment_type ?? []);
    setDeadlineSensitivity(state.profile?.deadline_sensitivity ?? "balanced");
  }, [state.profile]);
  const canSave = major.trim().length > 0 && targetRole.trim().length > 0;
  const profile: PreferenceProfile = { major, target_role: targetRole, industry, region, employment_type: employmentType, deadline_sensitivity: deadlineSensitivity, ...(sessionText.trim().length > 0 ? { session_only_optional_text: sessionText } : {}) };
  return (
    <Card aria-label="추천 조건" className="gap-5 erica-surface">
      <CardHeader className="gap-3 pb-0 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <CardTitle className="text-xl"><h2>입력한 조건</h2></CardTitle>
          <p className="text-sm text-muted-foreground">전공과 희망 직무를 입력하면 현재 세션 기준으로 추천 순서를 조정할 수 있어요.</p>
        </div>
        <div className="self-start justify-self-start sm:justify-self-end">
          <StorageScopeChip storageScope={state.storage_scope} rankingEnabled={state.preference_ranking_enabled} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <PreferenceRequiredFields major={major} targetRole={targetRole} onChange={(value) => { setMajor(value.major); setTargetRole(value.target_role); }} />
        <Separator />
        <PreferenceOptionalAccordion industry={industry} region={region} employmentType={employmentType} deadlineSensitivity={deadlineSensitivity} sessionOnlyOptionalText={sessionText} onChange={(value) => { setIndustry(value.industry); setRegion(value.region); setEmploymentType(value.employment_type); setDeadlineSensitivity(value.deadline_sensitivity); setSessionText(value.session_only_optional_text); }} />
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 pt-0 sm:flex-row sm:justify-end">
        <Button type="button" className="rounded-full sm:min-w-36" disabled={!canSave} onClick={() => onSet(sessionKey, profile)}>추천 조건 저장</Button>
        <Button type="button" variant="secondary" disabled={!canSave} onClick={() => onUpdate(sessionKey, profile)}>추천 조건 업데이트</Button>
        <Button type="button" variant="ghost" onClick={() => onClear(sessionKey)}>추천 조건 지우기</Button>
      </CardFooter>
    </Card>
  );
}
