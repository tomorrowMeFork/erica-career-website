import { buildPolicyRefusalAnswer, hasNegationNear, normalizeSafetyText, redactSensitiveText, type SafetyAction, type SafetyCategory } from "./safety-policy.js";

export const INPUT_SAFETY_POLICY_VERSION = "2026-05-17";

export type InputSafetyEvaluation = {
  action: SafetyAction;
  categories: SafetyCategory[];
  sanitized_query: string;
  redacted_query: string;
  policy_version: string;
  refusal_answer?: string;
};

const promptBypassPatterns = [
  /이전\s*지시(?:를)?\s*무시/u,
  /출처\s*(?:를\s*)?(?:생략|없이)/u,
  /인용\s*없이/u,
  /아무\s*출처(?:나)?\s*붙이/u,
] as const;

const privateAccessPatterns = [
  /sso/u,
  /비공개/u,
  /private/u,
  /다른\s*학생/u,
  /타\s*학생/u,
  /상담\s*기록/u,
] as const;

const automationPatterns = [
  /(?:신청|지원서|신청서|접수|제출|보내|전송|예약)\s*(?:해줘|해 주세요|해줘요|해줄래|해 줄래|해줄 수 있어)/u,
  /예약\s*대행/u,
  /이메일\s*보내/u,
  /메일\s*보내/u,
  /(?:보내|전송|연락)\s*줘/u,
] as const;

const resumeRewritePatterns = [
  /(?:이력서|자기소개서|자소서|cover\s*letter|커버레터).*(?:전부|전체|통째로|새로|다시).*(?:작성|써|만들)\s*줘/u,
  /(?:이력서|자기소개서|자소서|cover\s*letter|커버레터).*(?:작성|써|만들)\s*해줘/u,
] as const;

const interviewFabricationPatterns = [
  /면접.*(?:답변|대답|응답).*(?:작성해|작성|만들어|만들|지어|써)\s*줘/u,
  /면접\s*예상\s*답변.*(?:작성해|작성|만들어|만들|지어|써)\s*줘/u,
] as const;

const endorsementManipulationPatterns = [
  /공식\s*인증\s*서비스.*(?:말해|써|작성해|붙여)\s*줘/u,
  /공식\s*인증\s*서비스.*(?:이라고\s*)?(?:말해|써)\s*줘/u,
] as const;

const unsafePiiActionPatterns = [
  /(?:전화번호|휴대폰|연락처|이메일|메일|학번).*(?:예약|신청|접수|제출|보내|전송|연락)\s*(?:해줘|해 주세요|해줘요|해줄래|해 줄래|해줄 수 있어)/u,
  /(?:전화번호|휴대폰|연락처|이메일|메일|학번).*예약\s*해줘/u,
] as const;

const piiTextPattern = /(?:\+82[-\s]?)?(?:0\d{1,2}|1\d{2})[-\s]?\d{3,4}[-\s]?\d{4}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|(?<!\d)(?:19|20)\d{6,8}(?!\d)/u;

export function evaluateInputSafety(query: string): InputSafetyEvaluation {
  const sanitized_query = normalizeSafetyText(query);
  const redacted_query = redactSensitiveText(query);
  const categories = new Set<SafetyCategory>();

  if (matchesAny(sanitized_query, promptBypassPatterns)) {
    addCategory(categories, "prompt_injection");
    addCategory(categories, "citation_bypass");
  }

  if (matchesAny(sanitized_query, privateAccessPatterns)) {
    addCategory(categories, "private_access_request");
    addCategory(categories, "privacy_sensitive");
  }

  if (matchesAny(sanitized_query, automationPatterns)) {
    addCategory(categories, "unsupported_automation");
  }

  if (matchesAny(sanitized_query, resumeRewritePatterns) || matchesAny(sanitized_query, interviewFabricationPatterns)) {
    addCategory(categories, "out_of_scope");
  }

  if (matchesAny(sanitized_query, endorsementManipulationPatterns)) {
    addCategory(categories, "official_endorsement_request");
  }

  if (containsUnsafeClaimDirective(sanitized_query)) {
    addCategory(categories, "guaranteed_outcome_request");
  }

  if (matchesAny(sanitized_query, unsafePiiActionPatterns)) {
    addCategory(categories, "privacy_sensitive");
    addCategory(categories, "unsupported_automation");
  }

  const hasPii = piiTextPattern.test(query);
  if (hasPii) {
    addCategory(categories, "pii_echo");
    addCategory(categories, "privacy_sensitive");
  }

  const shouldRefuse =
    categories.has("prompt_injection") ||
    categories.has("private_access_request") ||
    categories.has("unsupported_automation") ||
    categories.has("official_endorsement_request") ||
    categories.has("guaranteed_outcome_request") ||
    categories.has("out_of_scope");

  return {
    action: shouldRefuse ? "refuse" : hasPii ? "redact" : "allow",
    categories: Array.from(categories),
    sanitized_query,
    redacted_query,
    policy_version: INPUT_SAFETY_POLICY_VERSION,
    refusal_answer: shouldRefuse ? buildPolicyRefusalAnswer() : undefined,
  };
}

function matchesAny(text: string, patterns: ReadonlyArray<RegExp>): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function addCategory(categories: Set<SafetyCategory>, category: SafetyCategory): void {
  categories.add(category);
}

function containsUnsafeClaimDirective(text: string): boolean {
  if (hasNegationNear(text, "취업 보장")) {
    return false;
  }

  return /취업\s*보장.*(?:이라고\s*)?(?:말해|써|작성해|붙여)\s*줘/u.test(text) || /(?:말해|써|작성해|붙여)\s*줘.*취업\s*보장/u.test(text);
}
