import { z } from "zod";

export const CollectionCategoryValues = [
  "job_posting",
  "career_review",
  "internship_notice",
  "internship_review",
  "career_program",
  "guide",
  "notice",
  "source_discovery",
  "unknown_legacy",
] as const;

export const SourceFamilyValues = ["cdp", "ewil", "ibus", "book", "hanyang_career", "unknown_legacy"] as const;

export const CategoryLabelKoValues = [
  "채용공고",
  "취업후기",
  "현장실습/인턴십 안내",
  "현장실습 후기",
  "취업 프로그램",
  "가이드",
  "공지사항",
  "출처 탐색",
  "기존 분류 미확인",
] as const;

export const CollectionCategorySchema = z.enum(CollectionCategoryValues);
export const SourceFamilySchema = z.enum(SourceFamilyValues);
export const CategoryLabelKoSchema = z.enum(CategoryLabelKoValues);

export const ContentRoleValues = ["opportunity", "advice_evidence", "procedure_guide", "supporting_context"] as const;
export const ContentRoleSchema = z.enum(ContentRoleValues);

export type CollectionCategory = z.infer<typeof CollectionCategorySchema>;
export type SourceFamily = z.infer<typeof SourceFamilySchema>;
export type CategoryLabelKo = z.infer<typeof CategoryLabelKoSchema>;
export type ContentRole = z.infer<typeof ContentRoleSchema>;

export const CategoryLabelKoByCollectionCategory = {
  job_posting: "채용공고",
  career_review: "취업후기",
  internship_notice: "현장실습/인턴십 안내",
  internship_review: "현장실습 후기",
  career_program: "취업 프로그램",
  guide: "가이드",
  notice: "공지사항",
  source_discovery: "출처 탐색",
  unknown_legacy: "기존 분류 미확인",
} as const satisfies Record<CollectionCategory, CategoryLabelKo>;

export const KBTaxonomyMetadataShape = {
  collection_category: CollectionCategorySchema,
  source_family: SourceFamilySchema,
  category_label_ko: CategoryLabelKoSchema,
} as const;

export type KBTaxonomyMetadata = {
  collection_category: CollectionCategory;
  source_family: SourceFamily;
  category_label_ko: CategoryLabelKo;
};

export const SourceFamilyLabelKoBySourceFamily = {
  cdp: "한양대학교 ERICA 커리어개발센터",
  ewil: "ERICA 현장실습지원센터",
  ibus: "ERICA 취업게시판",
  book: "취업후기 자료집",
  hanyang_career: "한양대학교 커리어 통합 출처",
  unknown_legacy: "기존 출처 미확인",
} as const satisfies Record<SourceFamily, string>;

export const ContentRoleByCollectionCategory = {
  job_posting: "opportunity",
  career_program: "opportunity",
  internship_notice: "opportunity",
  career_review: "advice_evidence",
  internship_review: "advice_evidence",
  guide: "procedure_guide",
  notice: "supporting_context",
  source_discovery: "supporting_context",
  unknown_legacy: "supporting_context",
} as const satisfies Record<CollectionCategory, ContentRole>;

export function getCategoryLabelKo(collectionCategory: CollectionCategory): CategoryLabelKo {
  return CategoryLabelKoByCollectionCategory[collectionCategory];
}

export function getSourceFamilyLabelKo(sourceFamily: SourceFamily): string {
  return SourceFamilyLabelKoBySourceFamily[sourceFamily];
}

export function getContentRole(collectionCategory: CollectionCategory): ContentRole {
  return ContentRoleByCollectionCategory[collectionCategory];
}

export function isCollectionCategory(value: unknown): value is CollectionCategory {
  return CollectionCategorySchema.safeParse(value).success;
}

export function isSourceFamily(value: unknown): value is SourceFamily {
  return SourceFamilySchema.safeParse(value).success;
}

export function assertCategoryLabelKoMatches(metadata: KBTaxonomyMetadata, context: z.RefinementCtx): void {
  const expectedLabel = getCategoryLabelKo(metadata.collection_category);
  if (metadata.category_label_ko !== expectedLabel) {
    context.addIssue({
      code: "custom",
      message: `category_label_ko must be ${expectedLabel} for collection_category ${metadata.collection_category}`,
      path: ["category_label_ko"],
    });
  }
}
