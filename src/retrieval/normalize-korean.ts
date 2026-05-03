const hangulSequencePattern = /[가-힣]+/gu;
const tokenPattern = /[\p{Letter}\p{Number}]+/gu;
const punctuationPattern = /[“”‘’`´·•★☆▶▷◀◁◆◇■□▲△▼▽|]+/gu;

export function normalizeKoreanText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(punctuationPattern, " ")
    .replace(/[()[\]{}<>.,;:!?"'\\/]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function extractSearchTerms(value: string): string[] {
  const normalized = normalizeKoreanText(value);
  if (normalized.length === 0) {
    return [];
  }

  const terms = new Set<string>();
  for (const match of normalized.matchAll(tokenPattern)) {
    terms.add(match[0]);
  }
  for (const gram of hangulNgrams(normalized)) {
    terms.add(gram);
  }

  return [...terms].sort(compareStrings);
}

export function hangulNgrams(value: string, sizes = [2, 3]): string[] {
  const normalized = normalizeKoreanText(value);
  const grams = new Set<string>();

  for (const match of normalized.matchAll(hangulSequencePattern)) {
    const sequence = match[0];
    for (const size of sizes) {
      if (!Number.isInteger(size) || size <= 0 || sequence.length < size) {
        continue;
      }
      for (let index = 0; index <= sequence.length - size; index += 1) {
        grams.add(sequence.slice(index, index + size));
      }
    }
  }

  return [...grams].sort(compareStrings);
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, "ko");
}
