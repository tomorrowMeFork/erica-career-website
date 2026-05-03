import type { KnowledgeChunk } from "../ingestion/normalized-record.js";

export type RetrieveInput = { query: string; topK?: number };
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
