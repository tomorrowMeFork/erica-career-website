import type { RetrievedChunk } from "../retrieval/retriever.js";

export type SourceQualityBreakdown = {
  deadline_score: number;
  posted_recency_score: number;
  fetched_recency_score: number;
  citation_detail_score: number;
  url_detail_score: number;
  boilerplate_score: number;
  freshness_score: number;
  final_score: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function clampScore(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function roundScore(value: number): number {
  return Math.round(clampScore(value) * 10000) / 10000;
}

function recencyScore(timestamp: string | null, referenceDate: Date, halfLifeDays: number): number {
  if (timestamp === null) {
    return 0.35;
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  const ageDays = Math.max(0, (referenceDate.getTime() - parsed.getTime()) / DAY_MS);
  return clampScore(1 - ageDays / halfLifeDays);
}

function hasDetailedUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (_error) {
    return false;
  }

  const pathSegments = parsed.pathname.split("/").filter(Boolean);
  const hasQuery = parsed.searchParams.size > 0;
  const hasFragment = parsed.hash.length > 0;
  const rootLikePath = pathSegments.length <= 1;

  return !rootLikePath || hasQuery || hasFragment;
}

function scoreCitationDetail(candidate: RetrievedChunk): number {
  const { chunk } = candidate;
  const detailedAnchors = chunk.citation_anchors.filter(
    (anchor) => anchor.page_number !== undefined || anchor.url !== chunk.source_url || hasDetailedUrl(anchor.url),
  );
  if (detailedAnchors.some((anchor) => anchor.page_number !== undefined || anchor.url !== chunk.source_url)) {
    return 1;
  }

  const anchorCountScore = Math.min(1, chunk.citation_anchors.length / 2);
  const detailScore = detailedAnchors.length > 0 ? 1 : 0.35;

  return roundScore(anchorCountScore * 0.45 + detailScore * 0.55);
}

export function scoreSourceQuality(candidate: RetrievedChunk, referenceDate: Date = new Date()): SourceQualityBreakdown {
  const { chunk } = candidate;
  const deadline_score = chunk.deadline_status === "active" ? 1 : chunk.deadline_status === "unknown" ? 0.45 : 0;
  const posted_recency_score = recencyScore(chunk.posted_at, referenceDate, 120);
  const fetched_recency_score = recencyScore(chunk.fetched_at, referenceDate, 180);
  const citation_detail_score = scoreCitationDetail(candidate);
  const url_detail_score = hasDetailedUrl(chunk.source_url) ? 1 : 0.2;
  const boilerplate_score = clampScore(1 - candidate.ranking_features.boilerplate_penalty);
  const freshness_score = roundScore(deadline_score * 0.5 + posted_recency_score * 0.3 + fetched_recency_score * 0.2);

  const final_score = roundScore(
    deadline_score * 0.25 +
      posted_recency_score * 0.15 +
      fetched_recency_score * 0.1 +
      citation_detail_score * 0.2 +
      url_detail_score * 0.15 +
      boilerplate_score * 0.15,
  );

  return {
    deadline_score: roundScore(deadline_score),
    posted_recency_score: roundScore(posted_recency_score),
    fetched_recency_score: roundScore(fetched_recency_score),
    citation_detail_score,
    url_detail_score: roundScore(url_detail_score),
    boilerplate_score: roundScore(boilerplate_score),
    freshness_score,
    final_score,
  };
}
