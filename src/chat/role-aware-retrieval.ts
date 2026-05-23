import type { CollectionCategory } from "../knowledge-base/taxonomy.js";
import { MAX_RETRIEVE_TOP_K, type RetrievedChunk, type RetrieveFilters, type Retriever } from "../retrieval/retriever.js";

export type RoleAwareRetrievalInput = {
  retriever: Retriever;
  query: string;
  topK: number;
  filters?: RetrieveFilters;
};

type RolePlan = {
  categories: CollectionCategory[];
  topK: number;
};

const opportunityCategories: CollectionCategory[] = ["job_posting", "career_program"];
const internshipOpportunityCategories: CollectionCategory[] = ["job_posting", "career_program", "internship_notice"];
const adviceCategories: CollectionCategory[] = ["career_review", "internship_review"];
const procedureCategories: CollectionCategory[] = ["guide", "notice"];

export async function retrieveRoleAwareEvidence(input: RoleAwareRetrievalInput): Promise<RetrievedChunk[]> {
  if (hasExplicitCategoryFilter(input.filters)) {
    return input.retriever.retrieve({ query: input.query, topK: input.topK, ...(input.filters !== undefined ? { filters: input.filters } : {}) });
  }

  const plans = buildRolePlans(input.query, input.topK);
  if (plans.length === 0) {
    return input.retriever.retrieve({ query: input.query, topK: input.topK, ...(input.filters !== undefined ? { filters: input.filters } : {}) });
  }

  const roleResults: RetrievedChunk[] = [];
  for (const plan of plans) {
    roleResults.push(...(await input.retriever.retrieve({
      query: input.query,
      topK: plan.topK,
      filters: mergeFilters(input.filters, { collection_categories: plan.categories }),
    })));
  }

  const fallbackResults = await input.retriever.retrieve({ query: input.query, topK: input.topK, ...(input.filters !== undefined ? { filters: input.filters } : {}) });
  return dedupeRetrievedChunks([...roleResults, ...fallbackResults]).slice(0, input.topK);
}

function hasExplicitCategoryFilter(filters: RetrieveFilters | undefined): boolean {
  return filters?.collection_categories !== undefined && filters.collection_categories.length > 0;
}

function buildRolePlans(query: string, topK: number): RolePlan[] {
  const signals = analyzeQueryIntent(query);
  const plans: CollectionCategory[][] = [];

  if (!signals.mixedCareerAdvice) {
    return [];
  }

  if (signals.opportunity) plans.push(signals.internship ? internshipOpportunityCategories : opportunityCategories);
  if (signals.advice) plans.push(adviceCategories);
  if (signals.procedure) plans.push(procedureCategories);

  if (plans.length === 0 && signals.careerGeneral) {
    plans.push(opportunityCategories, adviceCategories, procedureCategories);
  }

  const perRoleTopK = Math.max(2, Math.ceil(topK / Math.max(plans.length, 1)) + 1);
  return plans.map((categories) => ({ categories, topK: Math.min(MAX_RETRIEVE_TOP_K, perRoleTopK) }));
}

function analyzeQueryIntent(query: string): { opportunity: boolean; advice: boolean; procedure: boolean; internship: boolean; careerGeneral: boolean; mixedCareerAdvice: boolean } {
  const normalized = query.toLocaleLowerCase("ko-KR");
  const internship = /인턴|인턴십|현장실습|실습/u.test(normalized);
  const careerGeneral = /취업|커리어|진로|백엔드|프론트엔드|개발자|디자인|기획/u.test(normalized);
  const mixedCareerAdvice = careerGeneral && /고민|준비|조언|추천|기회|활동|학년|세부분야|못 정|못정|좋을|뭘 보면|뭐 보면|무엇을 보면|어떻게/u.test(normalized);
  const opportunity = /공고|채용|모집|추천|지원|기회|프로그램|인턴|현장실습|뭘 보면|뭐 보면|무엇을 보면/u.test(normalized) || careerGeneral;
  const advice = /후기|경험|면접|조언|준비|고민|팁|사례|선배|세부분야|세부 분야|못 정|못정|활동/u.test(normalized) || /준비/u.test(normalized);
  const procedure = /방법|절차|신청|예약|상담|첨삭|가이드|어디|확인|이용|활동/u.test(normalized) || /준비|고민|세부분야|세부 분야/u.test(normalized);

  return { opportunity, advice, procedure, internship, careerGeneral, mixedCareerAdvice };
}

function mergeFilters(base: RetrieveFilters | undefined, override: RetrieveFilters): RetrieveFilters {
  return {
    ...(base ?? {}),
    ...override,
  };
}

function dedupeRetrievedChunks(results: RetrievedChunk[]): RetrievedChunk[] {
  const byChunkId = new Map<string, RetrievedChunk>();
  for (const result of results) {
    const existing = byChunkId.get(result.chunk.chunk_id);
    if (existing === undefined || result.score > existing.score) {
      byChunkId.set(result.chunk.chunk_id, result);
    }
  }
  return [...byChunkId.values()];
}
