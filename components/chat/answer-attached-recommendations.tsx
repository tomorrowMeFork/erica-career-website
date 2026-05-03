import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { getMatchStrengthLabel } from "../../lib/deadline-labels.js";
import { DeadlineStatusBadge } from "../listings/deadline-status-badge.js";

export function AnswerAttachedRecommendations({ items }: { items: RecommendationItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="attached-recommendations" aria-label="관련 추천 공고">
      {items.map((item) => (
        <article key={item.recommendation_id} className="recommendation-card card-surface">
          <header><h4>{item.title}</h4><DeadlineStatusBadge status={item.deadline_status} /></header>
          <span>{getMatchStrengthLabel(item.match_strength)} · 점수 {item.score.toFixed(2)}</span>
          <p>{item.source_id} · 게시일 {formatDate(item.posted_at)} · 수집일 {formatDate(item.fetched_at)}</p>
          <ul>{(item.match_reasons ?? []).slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul>
          <p>인용 맥락 {item.citations.map((citation) => `[${citation.citation_id}] ${citation.title}`).join(" · ")}</p>
          <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 공식 페이지 새 창으로 열기`}>공식 페이지 열기</a>
        </article>
      ))}
    </section>
  );
}

function formatDate(value: string | null): string {
  return value === null ? "확인 필요" : value.slice(0, 10);
}
