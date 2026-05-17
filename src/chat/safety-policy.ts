export type SafetyAction = "allow" | "redact" | "refuse" | "quarantine" | "fail_closed";
export type SafetyLayer = "input" | "source" | "output" | "render";
export type SafetyCategory =
  | "prompt_injection"
  | "citation_bypass"
  | "official_endorsement_request"
  | "official_endorsement_claim"
  | "guaranteed_outcome_request"
  | "guaranteed_outcome_claim"
  | "private_access_request"
  | "unsupported_automation"
  | "privacy_sensitive"
  | "hidden_profiling"
  | "source_injection"
  | "unsafe_markdown_link"
  | "citation_laundering"
  | "pii_echo"
  | "out_of_scope";

const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\u2060\uFEFF]/gu;
const CITE_MARKER_PATTERN = /\[(?:\d+)\]/gu;
const WHITESPACE_PATTERN = /\s+/gu;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gu;
const PHONE_PATTERN = /(?<!\d)(?:\+82[-\s]?)?(?:0\d{1,2}|1\d{2})[-\s]?\d{3,4}[-\s]?\d{4}\b/gu;
const STUDENT_ID_PATTERN = /(?<!\d)(?:19|20)\d{6,8}(?!\d)/gu;

const NEGATION_PATTERNS = ["아니", "않", "없", "못", "지 않", "아닙니다", "없습니다", "하지 않"] as const;

export function normalizeSafetyText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(ZERO_WIDTH_PATTERN, "")
    .replace(/\r\n/gu, "\n")
    .replace(/\r/gu, "\n")
    .toLowerCase()
    .replace(WHITESPACE_PATTERN, " ")
    .trim();
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(EMAIL_PATTERN, "[redacted_email]")
    .replace(STUDENT_ID_PATTERN, "[redacted_student_id]")
    .replace(PHONE_PATTERN, "[redacted_phone]");
}

export function hasNegationNear(text: string, phrase: string): boolean {
  const normalizedText = normalizeSafetyText(text).replace(CITE_MARKER_PATTERN, "");
  const normalizedPhrase = normalizeSafetyText(phrase);
  const phraseIndex = normalizedText.indexOf(normalizedPhrase);

  if (phraseIndex === -1) {
    return false;
  }

  const start = Math.max(0, phraseIndex - 12);
  const end = Math.min(normalizedText.length, phraseIndex + normalizedPhrase.length + 16);
  const window = normalizedText.slice(start, end);

  return NEGATION_PATTERNS.some((marker) => window.includes(marker));
}

export function buildPolicyRefusalAnswer(): string {
  return "현재 요청은 개인정보 처리, 비공개 접근, 출처 생략, 결과 보장 또는 자동 실행과 관련되어 ERICA Career Chat의 안전 범위를 벗어납니다. 공식 출처에서 확인 가능한 진로·취업 정보 범위로 다시 질문해 주세요.";
}
