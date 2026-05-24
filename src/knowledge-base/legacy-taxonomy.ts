import type { KBTaxonomyMetadata } from "./taxonomy.js";

type LegacyTaxonomyKey = `${string}::${string}`;

const LEGACY_TAXONOMY_BY_SOURCE_AND_CATEGORY = {
  [key("ibus-employment-board", "ERICA 경상대학 취업정보")]: {
    collection_category: "job_posting",
    source_family: "ibus",
    category_label_ko: "채용공고",
  },
  [key("cdp-student-guide-pdf", "CDP 학생 매뉴얼")]: {
    collection_category: "guide",
    source_family: "cdp",
    category_label_ko: "가이드",
  },
  [key("book-success-story-viewer", "취업성공후기")]: {
    collection_category: "career_review",
    source_family: "book",
    category_label_ko: "취업후기",
  },
  [key("cdp-root", "CDP root discovery")]: {
    collection_category: "source_discovery",
    source_family: "cdp",
    category_label_ko: "출처 탐색",
  },
  [key("cdp-career-category-discovery", "CDP 취업정보 하위항목 전체")]: {
    collection_category: "source_discovery",
    source_family: "cdp",
    category_label_ko: "출처 탐색",
  },
  [key("cdp-recruit-category-discovery", "CDP 채용정보 하위항목 전체")]: {
    collection_category: "source_discovery",
    source_family: "cdp",
    category_label_ko: "출처 탐색",
  },
  [key("cdp-recruit-category-discovery", "CDP 채용정보 > 일반채용공고")]: {
    collection_category: "job_posting",
    source_family: "cdp",
    category_label_ko: "채용공고",
  },
  [key("ewil-internship-system", "ERICA 현장실습 지원 시스템")]: {
    collection_category: "source_discovery",
    source_family: "ewil",
    category_label_ko: "출처 탐색",
  },
  [key("ewil-notice-board", "ERICA 현장실습 지원 시스템 > 공지사항/인턴공고")]: {
    collection_category: "internship_notice",
    source_family: "ewil",
    category_label_ko: "현장실습/인턴십 안내",
  },
  [key("ewil-info-board", "ERICA 현장실습 지원 시스템 > 설명회")]: {
    collection_category: "career_program",
    source_family: "ewil",
    category_label_ko: "취업 프로그램",
  },
  [key("ewil-internship-reviews", "ERICA 현장실습 지원 시스템 > 실습 후기")]: {
    collection_category: "internship_review",
    source_family: "ewil",
    category_label_ko: "현장실습 후기",
  },
  [key("cdp-recruit-general-board", "CDP 채용정보 > 일반채용공고")]: {
    collection_category: "job_posting",
    source_family: "cdp",
    category_label_ko: "채용공고",
  },
  [key("cdp-recruit-event-board", "CDP 채용정보 > 채용상담 및 설명회")]: {
    collection_category: "career_program",
    source_family: "cdp",
    category_label_ko: "취업 프로그램",
  },
} as const satisfies Record<LegacyTaxonomyKey, KBTaxonomyMetadata>;

export function backfillLegacyTaxonomy(value: unknown): unknown {
  if (!isLegacyTaxonomyCandidate(value) || hasTaxonomyMetadata(value)) {
    return value;
  }

  const legacyTaxonomy = LEGACY_TAXONOMY_BY_SOURCE_AND_CATEGORY[key(value.source_id, value.category)];
  if (legacyTaxonomy === undefined) {
    throw new Error(`missing legacy taxonomy mapping for source_id "${value.source_id}" category "${value.category}"`);
  }

  return { ...value, ...legacyTaxonomy };
}

function key(sourceId: string, category: string): LegacyTaxonomyKey {
  return `${sourceId}::${category}`;
}

function isLegacyTaxonomyCandidate(value: unknown): value is { source_id: string; category: string } {
  return typeof value === "object" && value !== null && "source_id" in value && typeof value.source_id === "string" && "category" in value && typeof value.category === "string";
}

function hasTaxonomyMetadata(value: { [key: string]: unknown }): boolean {
  return "collection_category" in value || "source_family" in value || "category_label_ko" in value;
}
