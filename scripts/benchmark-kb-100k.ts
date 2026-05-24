import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";

import type { DeadlineStatus, KnowledgeChunk } from "../src/ingestion/normalized-record.js";
import { ReloadableKnowledgeBaseRetriever } from "../src/knowledge-base/reloadable-retriever-service.js";
import {
  CategoryLabelKoByCollectionCategory,
  type CollectionCategory,
  CollectionCategoryValues,
  type SourceFamily,
  SourceFamilyValues,
} from "../src/knowledge-base/taxonomy.js";
import { Bm25Retriever } from "../src/retrieval/bm25-retriever.js";
import type { RetrieveFilters, Retriever } from "../src/retrieval/retriever.js";

const CHUNK_COUNT = 100_000;
const QUERY_COUNT = 20;
const EVIDENCE_PATH = ".sisyphus/evidence/task-10-100k-benchmark.json";
const REFERENCE_DATE = new Date("2026-05-03T00:00:00.000Z");

const THRESHOLDS = {
  cold_load_ms: 10_000,
  p95_unfiltered_retrieval_ms: 750,
  p95_filtered_retrieval_ms: 500,
  memory_delta_mb: 1_536,
} as const;

const categorySignals: Record<CollectionCategory, { ko: string; en: string; category: string }> = {
  job_posting: { ko: "채용정보 일반채용", en: "job-posting", category: "채용공고" },
  career_review: { ko: "취업성공후기 합격후기", en: "career-review", category: "취업후기" },
  internship_notice: { ko: "현장실습 인턴채용", en: "internship-notice", category: "현장실습 안내" },
  internship_review: { ko: "현장실습 후기", en: "internship-review", category: "현장실습 후기" },
  career_program: { ko: "취업프로그램 직무부트캠프", en: "career-program", category: "취업 프로그램" },
  guide: { ko: "가이드북 진로설계", en: "guide", category: "가이드" },
  notice: { ko: "공지사항 상담예약", en: "notice", category: "공지사항" },
  source_discovery: { ko: "출처 탐색 경력개발", en: "source-discovery", category: "출처 탐색" },
  unknown_legacy: { ko: "기존 분류 미확인", en: "legacy-unknown", category: "기존 분류 미확인" },
};

type TimedResult<T> = {
  value: T;
  elapsedMs: number;
};

type ThresholdResult = {
  actual: number;
  threshold: number | null;
  passed: boolean;
  unit: "ms" | "MB";
  threshold_applicable: boolean;
};

type BenchmarkEvidence = {
  benchmark: "kb-100k-scale";
  generated_at: string;
  synthetic_corpus: {
    chunk_count: number;
    collection_categories: readonly CollectionCategory[];
    source_families: readonly SourceFamily[];
    persisted_corpus: false;
  };
  metrics: {
    cold_load_time_ms: number;
    memory_delta_mb: number;
    p95_unfiltered_retrieval_latency_ms: number;
    p95_filtered_retrieval_latency_ms: number;
    reload_time_ms: number;
    unfiltered_retrieval_latency_ms: number[];
    filtered_retrieval_latency_ms: number[];
  };
  thresholds: typeof THRESHOLDS;
  pass_fail: {
    cold_load_time: ThresholdResult;
    memory_delta: ThresholdResult;
    p95_unfiltered_retrieval_latency: ThresholdResult;
    p95_filtered_retrieval_latency: ThresholdResult;
    reload_time: ThresholdResult;
  };
  ok: boolean;
  recommendation: string;
  gc_available: boolean;
};

async function main(): Promise<void> {
  runGarbageCollectionIfAvailable();
  const baselineMemoryMb = currentRssMb();
  const chunks = generateSyntheticChunks(CHUNK_COUNT);

  const coldLoad = time(() =>
    new ReloadableKnowledgeBaseRetriever({
      loader: () => chunks,
      retrieverFactory: benchmarkRetrieverFactory,
      clock: () => REFERENCE_DATE,
    }),
  );

  runGarbageCollectionIfAvailable();
  const memoryDeltaMb = roundMetric(Math.max(0, currentRssMb() - baselineMemoryMb));
  const service = coldLoad.value;

  const unfilteredRetrievalLatencies = await measureRetrievalLatencies(service.currentRetriever(), buildBenchmarkQueries(false));
  const filteredRetrievalLatencies = await measureRetrievalLatencies(service.currentRetriever(), buildBenchmarkQueries(true));
  const reload = time(() => service.reload());

  const metrics = {
    cold_load_time_ms: coldLoad.elapsedMs,
    memory_delta_mb: memoryDeltaMb,
    p95_unfiltered_retrieval_latency_ms: percentile95(unfilteredRetrievalLatencies),
    p95_filtered_retrieval_latency_ms: percentile95(filteredRetrievalLatencies),
    reload_time_ms: reload.elapsedMs,
    unfiltered_retrieval_latency_ms: unfilteredRetrievalLatencies,
    filtered_retrieval_latency_ms: filteredRetrievalLatencies,
  };
  const passFail = buildPassFail(metrics);
  const ok = Object.values(passFail).every((result) => result.passed);
  const evidence: BenchmarkEvidence = {
    benchmark: "kb-100k-scale",
    generated_at: new Date().toISOString(),
    synthetic_corpus: {
      chunk_count: chunks.length,
      collection_categories: CollectionCategoryValues,
      source_families: SourceFamilyValues,
      persisted_corpus: false,
    },
    metrics,
    thresholds: THRESHOLDS,
    pass_fail: passFail,
    ok,
    recommendation: ok
      ? "All measured thresholds passed for the current in-memory BM25 retriever."
      : "One or more thresholds failed; optimize the current in-memory retriever with an inverted index before considering a vector DB or database migration.",
    gc_available: typeof gcFunction() === "function",
  };

  await mkdir(dirname(EVIDENCE_PATH), { recursive: true });
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ ok: evidence.ok, metrics: evidence.metrics, pass_fail: evidence.pass_fail, recommendation: evidence.recommendation, evidence_path: EVIDENCE_PATH }, null, 2));
}

function benchmarkRetrieverFactory(chunks: readonly KnowledgeChunk[]): Retriever {
  return new Bm25Retriever(chunks, { referenceDate: REFERENCE_DATE });
}

function generateSyntheticChunks(count: number): KnowledgeChunk[] {
  return Array.from({ length: count }, (_, index) => {
    const collectionCategory = CollectionCategoryValues[index % CollectionCategoryValues.length];
    const sourceFamily = SourceFamilyValues[index % SourceFamilyValues.length];
    const signal = categorySignals[collectionCategory];
    const sourceId = `synthetic-${sourceFamily}-${collectionCategory}`;
    const canonicalUrl = `https://example.com/kb-benchmark/${sourceFamily}/${collectionCategory}/${index}`;
    const deadlineStatus = deadlineStatusFor(index);
    return {
      chunk_id: `synthetic-chunk-${index.toString().padStart(6, "0")}`,
      record_id: `synthetic-record-${index.toString().padStart(6, "0")}`,
      source_id: sourceId,
      source_name: `Synthetic ${sourceFamily} ${signal.category}`,
      source_url: canonicalUrl,
      canonical_url: canonicalUrl,
      title: `${signal.category} synthetic scale record ${index}`,
      category: signal.category,
      collection_category: collectionCategory,
      source_family: sourceFamily,
      category_label_ko: CategoryLabelKoByCollectionCategory[collectionCategory],
      fetched_at: "2024-01-01T00:00:00.000Z",
      posted_at: null,
      deadline_status: deadlineStatus,
      deadline_raw_text: deadlineStatus === "active" ? "상시 모집" : "",
      content_hash: index.toString(16).padStart(64, "0"),
      citation_anchors: [{ url: canonicalUrl, label: `Synthetic benchmark citation ${index}` }],
      source_text_trust: "untrusted_source_text",
      chunk_ordinal: 0,
      text: `${signal.ko} ${signal.en} source-${sourceFamily} category-${collectionCategory} retrieval-token-${index % 997}`,
    };
  });
}

function deadlineStatusFor(index: number): DeadlineStatus {
  if (index % 11 === 0) {
    return "active";
  }
  if (index % 13 === 0) {
    return "expired";
  }
  return "unknown";
}

function buildBenchmarkQueries(filtered: boolean): { query: string; topK: number; filters?: RetrieveFilters }[] {
  return Array.from({ length: QUERY_COUNT }, (_, index) => {
    const collectionCategory = CollectionCategoryValues[index % CollectionCategoryValues.length];
    const sourceFamily = SourceFamilyValues[index % SourceFamilyValues.length];
    const signal = categorySignals[collectionCategory];
    return {
      query: `${signal.ko} ${signal.en}`,
      topK: 10,
      ...(filtered ? { filters: { collection_categories: [collectionCategory], source_families: [sourceFamily] } } : {}),
    };
  });
}

async function measureRetrievalLatencies(retriever: Retriever, queries: { query: string; topK: number; filters?: RetrieveFilters }[]): Promise<number[]> {
  const latencies: number[] = [];
  for (const query of queries) {
    const timed = await timeAsync(() => retriever.retrieve(query));
    latencies.push(timed.elapsedMs);
  }
  return latencies;
}

function buildPassFail(metrics: BenchmarkEvidence["metrics"]): BenchmarkEvidence["pass_fail"] {
  return {
    cold_load_time: thresholdResult(metrics.cold_load_time_ms, THRESHOLDS.cold_load_ms, "ms"),
    memory_delta: thresholdResult(metrics.memory_delta_mb, THRESHOLDS.memory_delta_mb, "MB"),
    p95_unfiltered_retrieval_latency: thresholdResult(metrics.p95_unfiltered_retrieval_latency_ms, THRESHOLDS.p95_unfiltered_retrieval_ms, "ms"),
    p95_filtered_retrieval_latency: thresholdResult(metrics.p95_filtered_retrieval_latency_ms, THRESHOLDS.p95_filtered_retrieval_ms, "ms"),
    reload_time: { actual: metrics.reload_time_ms, threshold: null, passed: true, unit: "ms", threshold_applicable: false },
  };
}

function thresholdResult(actual: number, threshold: number, unit: "ms" | "MB"): ThresholdResult {
  return { actual, threshold, passed: actual <= threshold, unit, threshold_applicable: true };
}

function percentile95(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return roundMetric(sorted[index] ?? 0);
}

function time<T>(callback: () => T): TimedResult<T> {
  const startedAt = performance.now();
  const value = callback();
  return { value, elapsedMs: roundMetric(performance.now() - startedAt) };
}

async function timeAsync<T>(callback: () => Promise<T>): Promise<TimedResult<T>> {
  const startedAt = performance.now();
  const value = await callback();
  return { value, elapsedMs: roundMetric(performance.now() - startedAt) };
}

function currentRssMb(): number {
  return process.memoryUsage().rss / 1_048_576;
}

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}

function runGarbageCollectionIfAvailable(): void {
  const collectGarbage = gcFunction();
  if (typeof collectGarbage === "function") {
    collectGarbage();
  }
}

function gcFunction(): (() => void) | undefined {
  return (globalThis as { gc?: () => void }).gc;
}

await main();
