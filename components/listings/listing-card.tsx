import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { DeadlineStatusBadge } from "./deadline-status-badge.js";
import { MatchReasonList } from "./match-reason-list.js";
import { MatchStrengthBadge } from "./match-strength-badge.js";

export function ListingCard({ item }: { item: RecommendationItem }) {
  return (
    <article className="listing-card card-surface" data-deadline_status={item.deadline_status}>
      <header><h3>{item.title}</h3><DeadlineStatusBadge status={item.deadline_status} /></header>
      <div className="listing-meta">
        <p>{item.category} · source_id {item.source_id}</p>
        <p>게시일: {item.posted_at?.slice(0, 10) ?? "확인 필요"} · 수집일: {item.fetched_at.slice(0, 10)}</p>
      </div>
      <p className="listing-score">점수 {item.score.toFixed(2)} <MatchStrengthBadge strength={item.match_strength} /></p>
      <MatchReasonList reasons={item.match_reasons} />
      <p className="source-context">출처 맥락 {item.citations.map((citation) => `[${citation.citation_id}] ${citation.title}`).join(" · ")}</p>
      <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 공식 페이지 새 창으로 열기`}>공식 페이지 열기</a>
    </article>
  );
}
