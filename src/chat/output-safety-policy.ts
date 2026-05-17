import { hasNegationNear, normalizeSafetyText, redactSensitiveText, type SafetyAction, type SafetyCategory } from "./safety-policy.js";

export type OutputSafetyAction = Extract<SafetyAction, "allow" | "refuse">;

export type OutputSafetyViolation = {
  category: SafetyCategory;
  detail: string;
  match: string;
};

export type OutputSafetyEvaluation = {
  action: OutputSafetyAction;
  categories: SafetyCategory[];
  violations: OutputSafetyViolation[];
  visibleCitationMarkerIds: number[];
};

type PhraseRule = {
  category: SafetyCategory;
  detail: string;
  pattern: RegExp;
  allowNegation: boolean;
};

const phraseRules: readonly PhraseRule[] = [
  { category: "prompt_injection", detail: "prompt injection claim", pattern: /이전\s*지시(?:를)?\s*무시/gu, allowNegation: false },
  { category: "guaranteed_outcome_claim", detail: "unsafe outcome claim", pattern: /취업(?:을|이)?\s*보장/gu, allowNegation: true },
  { category: "guaranteed_outcome_claim", detail: "unsafe outcome claim", pattern: /합격(?:을|이)?\s*보장/gu, allowNegation: true },
  { category: "guaranteed_outcome_claim", detail: "unsafe outcome claim", pattern: /채용(?:을|이)?\s*보장/gu, allowNegation: true },
  { category: "guaranteed_outcome_claim", detail: "unsafe outcome claim", pattern: /합격(?:을|이)?\s*확정/gu, allowNegation: true },
  { category: "guaranteed_outcome_claim", detail: "unsafe outcome claim", pattern: /100\s*%\s*채용/gu, allowNegation: true },
  { category: "guaranteed_outcome_claim", detail: "unsafe outcome claim", pattern: /내정(?:을|이)?\s*보장/gu, allowNegation: true },
  { category: "guaranteed_outcome_claim", detail: "unsafe outcome claim", pattern: /프리\s*패스/gu, allowNegation: true },
  { category: "official_endorsement_claim", detail: "official or private access claim", pattern: /공식\s*인증/gu, allowNegation: true },
  { category: "official_endorsement_claim", detail: "official or private access claim", pattern: /공식\s*승인/gu, allowNegation: true },
  { category: "official_endorsement_claim", detail: "official or private access claim", pattern: /한양(?:대|대학교)(?:와|과)?\s*제휴/gu, allowNegation: true },
  { category: "official_endorsement_claim", detail: "official or private access claim", pattern: /학교(?:가|는)?\s*보증/gu, allowNegation: true },
  { category: "official_endorsement_claim", detail: "official or private access claim", pattern: /공인\s*서비스/gu, allowNegation: true },
  { category: "private_access_request", detail: "official or private access claim", pattern: /sso\s*로\s*확인/gu, allowNegation: true },
  { category: "private_access_request", detail: "official or private access claim", pattern: /비공개\s*공고/gu, allowNegation: true },
  { category: "citation_bypass", detail: "citation bypass claim", pattern: /출처(?:를)?\s*생략/gu, allowNegation: true },
  { category: "citation_bypass", detail: "citation bypass claim", pattern: /근거\s*없이/gu, allowNegation: false },
  { category: "citation_bypass", detail: "citation bypass claim", pattern: /출처\s*없이/gu, allowNegation: false },
  { category: "citation_bypass", detail: "citation bypass claim", pattern: /인용\s*없이/gu, allowNegation: false },
];

const markdownImagePattern = /!\[[^\n]*?\]\([^\n)]*\)/gu;
const markdownLinkPattern = /(?<!!)\[[^\n]+?\]\([^\n)]*\)/gu;
const autolinkPattern = /<(?:(?:https?:\/\/|mailto:)[^\s<>]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>/gu;
const rawUrlPattern = /\b(?:https?:\/\/|www\.)[^\s<>()]+/giu;
const rawHtmlTagPattern = /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s[^<>]*)?>/gu;

export function evaluateOutputSafety(answer: string): OutputSafetyEvaluation {
  const violations: OutputSafetyViolation[] = [];
  const normalizedAnswer = normalizeSafetyText(answer);
  const visibleCitationMarkerIds = extractVisibleCitationMarkerIds(answer);

  for (const rule of phraseRules) {
    for (const match of normalizedAnswer.matchAll(rule.pattern)) {
      const matchedText = match[0];
      if (rule.allowNegation && hasNegationNear(answer, matchedText)) continue;
      violations.push({ category: rule.category, detail: rule.detail, match: matchedText });
    }
  }

  if (redactSensitiveText(answer) !== answer) {
    violations.push({ category: "pii_echo", detail: "personal data echoed in output", match: "pii" });
  }

  if (extractRawCitationMarkerIds(answer).length > visibleCitationMarkerIds.length) {
    violations.push({ category: "citation_bypass", detail: "hidden or non-visible citation marker", match: "hidden citation" });
  }

  collectPatternViolations(answer, markdownImagePattern, "unsafe_markdown_link", "markdown image", violations);
  collectPatternViolations(answer, markdownLinkPattern, "unsafe_markdown_link", "markdown link", violations);
  collectPatternViolations(answer, autolinkPattern, "unsafe_markdown_link", "markdown autolink", violations);
  collectPatternViolations(answer, rawUrlPattern, "unsafe_markdown_link", "raw url", violations);
  collectPatternViolations(answer, rawHtmlTagPattern, "unsafe_markdown_link", "raw html", violations);

  return {
    action: violations.length === 0 ? "allow" : "refuse",
    categories: uniqueCategories(violations),
    violations,
    visibleCitationMarkerIds,
  };
}

export function extractVisibleCitationMarkerIds(answer: string): number[] {
  return extractRawCitationMarkerIds(maskNonVisibleCitationContexts(answer));
}

function extractRawCitationMarkerIds(answer: string): number[] {
  const ids: number[] = [];
  for (const match of answer.matchAll(/\[(\d+)\]/gu)) {
    const rawId = match[1];
    if (rawId === undefined) continue;
    ids.push(Number.parseInt(rawId, 10));
  }
  return ids;
}

function collectPatternViolations(answer: string, pattern: RegExp, category: SafetyCategory, detail: string, violations: OutputSafetyViolation[]): void {
  for (const match of answer.matchAll(pattern)) {
    violations.push({ category, detail, match: match[0] });
  }
}

function uniqueCategories(violations: readonly OutputSafetyViolation[]): SafetyCategory[] {
  const seen = new Set<SafetyCategory>();
  const categories: SafetyCategory[] = [];
  for (const violation of violations) {
    if (seen.has(violation.category)) continue;
    seen.add(violation.category);
    categories.push(violation.category);
  }
  return categories;
}

function maskNonVisibleCitationContexts(answer: string): string {
  const chars = [...answer.replace(/\r\n/gu, "\n").replace(/\r/gu, "\n")];
  maskFencedCode(chars);
  maskPattern(chars, /`[^`\n]*`/gu);
  maskPattern(chars, markdownImagePattern);
  maskPattern(chars, markdownLinkPattern);
  maskPattern(chars, autolinkPattern);
  maskPattern(chars, rawUrlPattern);
  maskPattern(chars, rawHtmlTagPattern);
  return chars.join("");
}

function maskFencedCode(chars: string[]): void {
  const text = chars.join("");
  maskPattern(chars, /^```[\s\S]*?^```/gmu);
  if (chars.join("") !== text) return;
  maskPattern(chars, /^~~~[\s\S]*?^~~~/gmu);
}

function maskPattern(chars: string[], pattern: RegExp): void {
  const text = chars.join("");
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    if (start === undefined) continue;
    const end = start + match[0].length;
    for (let index = start; index < end; index += 1) {
      chars[index] = " ";
    }
  }
}
