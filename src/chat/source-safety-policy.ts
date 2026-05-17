import type { CitationAnchor } from "../ingestion/normalized-record.js";
import type { RetrievedChunk } from "../retrieval/retriever.js";
import {
  hasNegationNear,
  normalizeSafetyText,
  redactSensitiveText,
  type SafetyAction,
  type SafetyCategory,
} from "./safety-policy.js";

export type SourcePromptSafetyAction = Extract<SafetyAction, "allow" | "redact" | "quarantine">;
export type SourcePromptSafetyField = "title" | "text";
export type SourcePromptQuarantineReason = "empty_citation_anchors" | "invalid_citation_anchors" | "non_informative_sanitized_evidence";

export type SourcePromptSafetyDecision = {
  chunk_id: string;
  action: SourcePromptSafetyAction;
  categories: SafetyCategory[];
  redacted_fields: SourcePromptSafetyField[];
  quarantine_reason?: SourcePromptQuarantineReason;
};

export type SanitizedRetrievedResultsForPrompt = {
  action: SourcePromptSafetyAction;
  categories: SafetyCategory[];
  unsafe_chunk_ids: string[];
  results: RetrievedChunk[];
  quarantined_results: RetrievedChunk[];
  decisions: SourcePromptSafetyDecision[];
};

type RedactionPattern = {
  pattern: RegExp;
  category: SafetyCategory;
  placeholder: string;
  skipWhenNegated?: boolean;
};

type FieldRedactionResult = {
  value: string;
  categories: SafetyCategory[];
  redacted: boolean;
};

const HOSTILE_MARKDOWN_LINK_PATTERN = /\[([^\]\n]{0,120})\]\(([^)\s]+)(?:\s+"[^"]*")?\)/giu;
const REDACTION_PLACEHOLDER_PATTERN = /\[redacted_[a-z_]+\]/giu;
const NUMERIC_CITATION_MARKER_PATTERN = /\[\d+\]/gu;

const REDACTION_PATTERNS: readonly RedactionPattern[] = [
  {
    pattern: /<\/?\s*(?:system|developer|assistant|user|retrieved_context|chunk)\b[^>]*>/giu,
    category: "source_injection",
    placeholder: "[redacted_prompt_tag]",
  },
  {
    pattern: /(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|system|developer)\s+(?:instructions?|rules?)/giu,
    category: "source_injection",
    placeholder: "[redacted_source_instruction]",
  },
  {
    pattern: /이전\s*(?:지시|명령|규칙)(?:을|를)?\s*무시(?:하고|하(?:세요|라|십시오)?|해)?/gu,
    category: "source_injection",
    placeholder: "[redacted_source_instruction]",
  },
  {
    pattern: /(?:시스템|개발자)\s*(?:지시|명령|규칙)(?:을|를)?\s*무시[^\s.,;!?。]*/gu,
    category: "source_injection",
    placeholder: "[redacted_source_instruction]",
  },
  {
    pattern: /(?:너는|당신은)\s*이제\s*(?:시스템|개발자|관리자)[^\n.。]*/gu,
    category: "source_injection",
    placeholder: "[redacted_source_instruction]",
  },
  {
    pattern: /(?:출처|인용)(?:를|을)?\s*(?:생략|숨기|제거|무시)[^\s.,;!?。]*/gu,
    category: "citation_bypass",
    placeholder: "[redacted_citation_bypass]",
  },
  {
    pattern: /(?:citations?|sources?)\s*(?:을|를)?\s*(?:생략|숨기|제거|무시|omit|hide|remove|ignore|skip)[^\s.,;!?。]*|(?:do\s+not|don't)\s+cite|without\s+citations?/giu,
    category: "citation_bypass",
    placeholder: "[redacted_citation_bypass]",
  },
  {
    pattern: /(?:한양(?:대학교)?|ERICA|에리카|학교|대학)[^\n.。]{0,24}(?:공식\s*)?(?:인증|보증|승인|제휴)(?:된|받은)?/gu,
    category: "official_endorsement_claim",
    placeholder: "[redacted_official_endorsement_claim]",
    skipWhenNegated: true,
  },
  {
    pattern: /(?:officially\s+)?(?:endorsed|approved|certified|guaranteed)\s+by\s+(?:hanyang|erica)/giu,
    category: "official_endorsement_claim",
    placeholder: "[redacted_official_endorsement_claim]",
    skipWhenNegated: true,
  },
  {
    pattern: /(?:취업|합격|채용|인턴십)[^\n.。]{0,12}(?:보장|확정)/gu,
    category: "guaranteed_outcome_claim",
    placeholder: "[redacted_guaranteed_outcome_claim]",
    skipWhenNegated: true,
  },
  {
    pattern: /(?:100|백)\s*%\s*(?:취업|합격|채용)|\bguaranteed\s+(?:employment|job|offer|hire|internship|acceptance)\b/giu,
    category: "guaranteed_outcome_claim",
    placeholder: "[redacted_guaranteed_outcome_claim]",
    skipWhenNegated: true,
  },
];

export function sanitizeRetrievedResultsForPrompt(results: readonly RetrievedChunk[]): SanitizedRetrievedResultsForPrompt {
  const sanitizedResults: RetrievedChunk[] = [];
  const quarantinedResults: RetrievedChunk[] = [];
  const decisions: SourcePromptSafetyDecision[] = [];
  const allCategories = new Set<SafetyCategory>();
  const unsafeChunkIds = new Set<string>();

  for (const result of results) {
    const anchorValidity = validateCitationAnchors(result.chunk.citation_anchors);
    const title = redactSourceField(result.chunk.title);
    const text = redactSourceField(result.chunk.text);
    const categories = uniqueCategories([...title.categories, ...text.categories]);
    const redactedFields: SourcePromptSafetyField[] = [
      ...(title.redacted ? ["title" as const] : []),
      ...(text.redacted ? ["text" as const] : []),
    ];
    const sanitizedResult = cloneRetrievedChunkWithSanitizedText(result, title.value, text.value);
    const quarantineReason = getQuarantineReason(anchorValidity, title.value, text.value);
    const action: SourcePromptSafetyAction = quarantineReason !== undefined ? "quarantine" : redactedFields.length > 0 ? "redact" : "allow";

    for (const category of categories) allCategories.add(category);
    if (action !== "allow") unsafeChunkIds.add(result.chunk.chunk_id);

    decisions.push({
      chunk_id: result.chunk.chunk_id,
      action,
      categories,
      redacted_fields: redactedFields,
      ...(quarantineReason !== undefined ? { quarantine_reason: quarantineReason } : {}),
    });

    if (action === "quarantine") {
      quarantinedResults.push(sanitizedResult);
    } else {
      sanitizedResults.push(sanitizedResult);
    }
  }

  return {
    action: summarizeAction(decisions),
    categories: [...allCategories],
    unsafe_chunk_ids: [...unsafeChunkIds],
    results: sanitizedResults,
    quarantined_results: quarantinedResults,
    decisions,
  };
}

function redactSourceField(value: string): FieldRedactionResult {
  const categories = new Set<SafetyCategory>();
  let sanitized = redactUnsafeMarkdownLinks(value, categories);
  const withoutPii = redactSensitiveText(sanitized);

  if (withoutPii !== sanitized) {
    categories.add("pii_echo");
    sanitized = withoutPii;
  }

  for (const redaction of REDACTION_PATTERNS) {
    sanitized = sanitized.replace(redaction.pattern, (match: string) => {
      if (redaction.skipWhenNegated === true && hasNegationNear(sanitized, match)) {
        return match;
      }
      categories.add(redaction.category);
      return redaction.placeholder;
    });
  }

  const redacted = categories.size > 0;
  return { value: redacted ? compactWhitespace(sanitized) : value, categories: [...categories], redacted };
}

function redactUnsafeMarkdownLinks(value: string, categories: Set<SafetyCategory>): string {
  return value.replace(HOSTILE_MARKDOWN_LINK_PATTERN, (match: string, label: string, rawUrl: string) => {
    if (!isUnsafeMarkdownUrl(rawUrl)) return match;
    categories.add("unsafe_markdown_link");
    const citationMarkers = label.match(NUMERIC_CITATION_MARKER_PATTERN)?.join(" ");
    return citationMarkers !== undefined ? `${citationMarkers} [redacted_unsafe_link]` : "[redacted_unsafe_link]";
  });
}

function isUnsafeMarkdownUrl(value: string): boolean {
  if (/^(?:javascript|data|file|vbscript):/iu.test(value)) return true;
  try {
    const parsedUrl = new URL(value);
    return (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") || parsedUrl.username.length > 0 || parsedUrl.password.length > 0;
  } catch (_error) {
    return value.startsWith("//") || value.includes("\\") || /[\u0000-\u001F\u007F]/u.test(value);
  }
}

function validateCitationAnchors(anchors: readonly CitationAnchor[]): "valid" | "empty" | "invalid" {
  if (anchors.length === 0) return "empty";
  return anchors.every(isValidCitationAnchor) ? "valid" : "invalid";
}

function isValidCitationAnchor(anchor: CitationAnchor): boolean {
  if (typeof anchor.label !== "string" || anchor.label.trim().length === 0) return false;
  if (anchor.page_number !== undefined && (!Number.isInteger(anchor.page_number) || anchor.page_number <= 0)) return false;
  try {
    const parsedUrl = new URL(anchor.url);
    if (parsedUrl.protocol !== "https:" || parsedUrl.username.length > 0 || parsedUrl.password.length > 0) return false;
    return !anchor.url.includes("#page=") || anchor.page_number !== undefined;
  } catch (_error) {
    return false;
  }
}

function getQuarantineReason(
  anchorValidity: "valid" | "empty" | "invalid",
  sanitizedTitle: string,
  sanitizedText: string,
): SourcePromptQuarantineReason | undefined {
  if (anchorValidity === "empty") return "empty_citation_anchors";
  if (anchorValidity === "invalid") return "invalid_citation_anchors";
  if (isNonInformative(sanitizedTitle) || isNonInformative(sanitizedText)) return "non_informative_sanitized_evidence";
  return undefined;
}

function isNonInformative(value: string): boolean {
  const withoutPlaceholders = value.replace(REDACTION_PLACEHOLDER_PATTERN, " ");
  const normalized = normalizeSafetyText(withoutPlaceholders).replace(/[^\p{L}\p{N}]+/gu, "");
  return normalized.length < 4;
}

function cloneRetrievedChunkWithSanitizedText(result: RetrievedChunk, title: string, text: string): RetrievedChunk {
  return {
    ...result,
    matched_terms: [...result.matched_terms],
    ranking_features: { ...result.ranking_features },
    chunk: {
      ...result.chunk,
      citation_anchors: result.chunk.citation_anchors.map((anchor) => ({ ...anchor })),
      title,
      text,
    },
  };
}

function compactWhitespace(value: string): string {
  return value
    .replace(/[\t ]+/gu, " ")
    .replace(/\s*\n\s*/gu, "\n")
    .trim();
}

function uniqueCategories(categories: readonly SafetyCategory[]): SafetyCategory[] {
  return [...new Set(categories)];
}

function summarizeAction(decisions: readonly SourcePromptSafetyDecision[]): SourcePromptSafetyAction {
  if (decisions.some((decision) => decision.action === "quarantine")) return "quarantine";
  if (decisions.some((decision) => decision.action === "redact")) return "redact";
  return "allow";
}
