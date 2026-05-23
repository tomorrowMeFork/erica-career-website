import type { DeadlineStatus, KnowledgeChunk } from "../ingestion/normalized-record.js";
import type { CollectionCategory, SourceFamily } from "../knowledge-base/taxonomy.js";

export const MAX_RETRIEVE_TOP_K = 25;

export type RetrieveFilters = {
  collection_categories?: CollectionCategory[];
  source_families?: SourceFamily[];
  source_ids?: string[];
  deadline_statuses?: DeadlineStatus[];
};

export type RetrieveInput = { query: string; topK?: number; filters?: RetrieveFilters };
export type RetrievedChunk = {
  chunk: KnowledgeChunk;
  score: number;
  normalized_score: number;
  matched_terms: string[];
  ranking_features: {
    lexical_score: number;
    title_boost: number;
    category_boost: number;
    freshness_boost: number;
    deadline_penalty: number;
    boilerplate_penalty: number;
  };
};
export interface Retriever {
  retrieve(input: RetrieveInput): Promise<RetrievedChunk[]>;
}
