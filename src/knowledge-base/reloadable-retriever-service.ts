import type { KnowledgeChunk } from "../ingestion/normalized-record.js";
import { Bm25Retriever } from "../retrieval/bm25-retriever.js";
import type { RetrievedChunk, RetrieveInput, Retriever } from "../retrieval/retriever.js";
import type { LoadKnowledgeBaseChunksInput } from "./jsonl-loader.js";
import { loadKnowledgeBaseChunks } from "./jsonl-loader.js";

export type KnowledgeBaseSnapshotStats = {
  chunk_count: number;
  source_count: number;
  collection_category_counts: Record<string, number>;
  source_family_counts: Record<string, number>;
};

export type KnowledgeBaseSnapshotMetadata = {
  version: number;
  loaded_at: string;
  stats: KnowledgeBaseSnapshotStats;
};

export type KnowledgeBaseSnapshot = KnowledgeBaseSnapshotMetadata & {
  chunks: readonly KnowledgeChunk[];
  retriever: Retriever;
};

export type ReloadableKnowledgeBaseRetrieverOptions = {
  loadInput?: LoadKnowledgeBaseChunksInput;
  loader?: () => readonly KnowledgeChunk[];
  retrieverFactory?: (chunks: readonly KnowledgeChunk[]) => Retriever;
  clock?: () => Date;
};

export class ReloadableKnowledgeBaseRetriever implements Retriever {
  private snapshot: KnowledgeBaseSnapshot;
  private readonly loader: () => readonly KnowledgeChunk[];
  private readonly retrieverFactory: (chunks: readonly KnowledgeChunk[]) => Retriever;
  private readonly clock: () => Date;

  constructor(options: ReloadableKnowledgeBaseRetrieverOptions = {}) {
    this.loader = options.loader ?? (() => loadKnowledgeBaseChunks(options.loadInput));
    this.retrieverFactory = options.retrieverFactory ?? ((chunks) => new Bm25Retriever(chunks));
    this.clock = options.clock ?? (() => new Date());
    this.snapshot = this.buildSnapshot(1);
  }

  async retrieve(input: RetrieveInput): Promise<RetrievedChunk[]> {
    return this.snapshot.retriever.retrieve(input);
  }

  currentRetriever(): Retriever {
    return this.snapshot.retriever;
  }

  currentSnapshot(): KnowledgeBaseSnapshot {
    return this.snapshot;
  }

  metadata(): KnowledgeBaseSnapshotMetadata {
    const { version, loaded_at, stats } = this.snapshot;
    return { version, loaded_at, stats };
  }

  stats(): KnowledgeBaseSnapshotStats {
    return this.snapshot.stats;
  }

  reload(): KnowledgeBaseSnapshotMetadata {
    const nextSnapshot = this.buildSnapshot(this.snapshot.version + 1);
    this.snapshot = nextSnapshot;
    return this.metadata();
  }

  private buildSnapshot(version: number): KnowledgeBaseSnapshot {
    const chunks = [...this.loader()];
    const retriever = this.retrieverFactory(chunks);
    return {
      version,
      loaded_at: this.clock().toISOString(),
      stats: summarizeChunks(chunks),
      chunks,
      retriever,
    };
  }
}

function summarizeChunks(chunks: readonly KnowledgeChunk[]): KnowledgeBaseSnapshotStats {
  const sourceIds = new Set<string>();
  const collectionCategoryCounts: Record<string, number> = {};
  const sourceFamilyCounts: Record<string, number> = {};

  for (const chunk of chunks) {
    sourceIds.add(chunk.source_id);
    collectionCategoryCounts[chunk.collection_category] = (collectionCategoryCounts[chunk.collection_category] ?? 0) + 1;
    sourceFamilyCounts[chunk.source_family] = (sourceFamilyCounts[chunk.source_family] ?? 0) + 1;
  }

  return {
    chunk_count: chunks.length,
    source_count: sourceIds.size,
    collection_category_counts: collectionCategoryCounts,
    source_family_counts: sourceFamilyCounts,
  };
}
