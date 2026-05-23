import { normalizeKoreanText } from "./normalize-korean.js";

export const DOMAIN_SYNONYM_GROUPS = [
  ["채용", "모집", "공고"],
  ["인턴", "intern", "인턴십"],
  ["상담", "컨설팅", "컨설팅룸", "상담예약"],
  ["취업프로그램", "직무부트캠프", "프로그램"],
  ["자기소개서", "자소서", "첨삭"],
  ["가이드북", "매뉴얼", "사용자가이드"],
  ["취업준비도검사", "진로적성검사", "진로설계", "경력개발", "포트폴리오"],
  ["취업성공후기", "선배", "사례", "인터뷰"],
  ["컴퓨터공학", "컴퓨터공학과", "컴공", "컴퓨터학부", "소프트웨어", "개발자"],
  ["활동", "대외활동", "프로젝트", "포트폴리오", "취업프로그램", "직무부트캠프", "인턴", "현장실습"],
] as const;

const synonymLookup = buildSynonymLookup();

export function expandDomainSynonyms(terms: readonly string[]): string[] {
  const expanded = new Set<string>();

  for (const term of terms) {
    const normalizedTerm = normalizeKoreanText(term);
    if (normalizedTerm.length === 0) {
      continue;
    }

    expanded.add(normalizedTerm);
    const synonyms = synonymLookup.get(normalizedTerm);
    if (!synonyms) {
      continue;
    }
    for (const synonym of synonyms) {
      expanded.add(synonym);
    }
  }

  return [...expanded].sort((left, right) => left.localeCompare(right, "ko"));
}

function buildSynonymLookup(): Map<string, string[]> {
  const lookup = new Map<string, string[]>();
  for (const group of DOMAIN_SYNONYM_GROUPS) {
    const normalizedGroup = group.map((term) => normalizeKoreanText(term));
    for (const term of normalizedGroup) {
      lookup.set(
        term,
        normalizedGroup.filter((candidate) => candidate !== term),
      );
    }
  }
  return lookup;
}
