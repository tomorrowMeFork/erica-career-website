import type { DeadlineSensitivity } from "../../src/personalization/preference-contract.js";

type OptionalPreferenceDraft = {
  industry: string[];
  region: string[];
  employment_type: string[];
  deadline_sensitivity: DeadlineSensitivity;
  session_only_optional_text: string;
};

export function PreferenceOptionalAccordion({ industry, region, employmentType, deadlineSensitivity, sessionOnlyOptionalText, onChange }: { industry: string[]; region: string[]; employmentType: string[]; deadlineSensitivity: DeadlineSensitivity; sessionOnlyOptionalText: string; onChange: (value: OptionalPreferenceDraft) => void }) {
  const update = (patch: Partial<OptionalPreferenceDraft>) => onChange({ industry, region, employment_type: employmentType, deadline_sensitivity: deadlineSensitivity, session_only_optional_text: sessionOnlyOptionalText, ...patch });
  return (
    <details className="optional-preferences">
      <summary>선택 조건 더보기</summary>
      <label>산업<input name="industry" value={formatList(industry)} placeholder="예: IT, 교육" onChange={(event) => update({ industry: parseList(event.target.value) })} /></label>
      <label>지역<input name="region" value={formatList(region)} placeholder="예: 서울, 경기" onChange={(event) => update({ region: parseList(event.target.value) })} /></label>
      <label>고용 형태<input name="employment_type" value={formatList(employmentType)} placeholder="예: 인턴, 정규직" onChange={(event) => update({ employment_type: parseList(event.target.value) })} /></label>
      <label>마감 민감도<select name="deadline_sensitivity" value={deadlineSensitivity} onChange={(event) => update({ deadline_sensitivity: parseDeadlineSensitivity(event.target.value) })}><option value="urgent_first">마감 임박 우선</option><option value="balanced">균형</option><option value="include_unknown">미정 포함</option></select></label>
      <label>추가 메모<textarea name="session_only_optional_text" value={sessionOnlyOptionalText} onChange={(event) => update({ session_only_optional_text: event.target.value })} /></label>
      <p>선택 메모는 현재 세션 전용이며 영구 저장하지 않습니다.</p>
    </details>
  );
}

function parseList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter((item) => item.length > 0).slice(0, 5);
}

function formatList(value: string[]): string {
  return value.join(", ");
}

function parseDeadlineSensitivity(value: string): DeadlineSensitivity {
  if (value === "urgent_first" || value === "include_unknown") return value;
  return "balanced";
}
