import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { getSourceDisplayLabel } from "../citations/source-card.js";
import { DeadlineStatusBadge } from "./deadline-status-badge.js";

export function ListingCard({ item }: { item: RecommendationItem }) {
  const sourceLabel = getSourceDisplayLabel(item.source_id, item.url);
  const citationTitles = item.citations.map((citation) => citation.title);

  return (
    <article className="listing-card card-surface" data-deadline_status={item.deadline_status}>
      <header><h3>{item.title}</h3><DeadlineStatusBadge status={item.deadline_status} /></header>
      <div className="listing-meta" aria-label="출처 및 날짜 정보">
        <p>분류: {getCategoryDisplayLabel(item.category)} · 출처: {sourceLabel}</p>
        <p>게시일: {formatDate(item.posted_at)} · 확인일: {formatDate(item.fetched_at)}</p>
      </div>
      {citationTitles.length > 0 ? <p className="source-context">참고 출처: {citationTitles.join(" · ")}</p> : null}
      <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 공식 페이지 새 창으로 열기`}>공식 페이지 열기</a>
    </article>
  );
}

function formatDate(value: string | null): string {
  return value === null ? "확인 필요" : value.slice(0, 10);
}

function getCategoryDisplayLabel(category: string): string {
  if (category === "jobs") return "채용";
  if (category === "programs") return "프로그램";
  if (category === "notices") return "공지";
  return "기타";
}
