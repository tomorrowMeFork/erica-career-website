"use client";

export function PreferenceOptionalAccordion({ onTextChange }: { onTextChange: (text: string) => void }) {
  return (
    <details className="optional-preferences">
      <summary>선택 조건 더보기</summary>
      <label>산업<input name="industry" placeholder="예: IT" /></label>
      <label>지역<input name="region" placeholder="예: 서울" /></label>
      <label>고용 형태<input name="employment_type" placeholder="예: 인턴" /></label>
      <label>마감 민감도<select name="deadline_sensitivity" defaultValue="balanced"><option value="urgent_first">마감 임박 우선</option><option value="balanced">균형</option><option value="include_unknown">미정 포함</option></select></label>
      <label>추가 메모<textarea name="session_only_optional_text" onChange={(event) => onTextChange(event.target.value)} /></label>
      <p>선택 메모는 현재 세션 전용이며 영구 저장하지 않습니다.</p>
    </details>
  );
}
