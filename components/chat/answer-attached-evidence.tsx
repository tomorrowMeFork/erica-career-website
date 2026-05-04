import { useId } from "react";

import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { getSourceDisplayLabel } from "../citations/source-card.js";
import { DeadlineStatusBadge } from "../listings/deadline-status-badge.js";

export function AnswerAttachedEvidence({ items }: { items: RecommendationItem[] }) {
  const titleId = useId();
  if (items.length === 0) return null;
  return (
    <section className="attached-evidence" aria-labelledby={titleId}>
      <h3 id={titleId}>답변에 참고한 정보</h3>
      {items.map((item) => (
        <article key={item.recommendation_id} className="evidence-card card-surface">
          <header><h4>{item.title}</h4><DeadlineStatusBadge status={item.deadline_status} /></header>
          <p>출처: {getSourceDisplayLabel(item.source_id, item.url)} · 게시일 {formatDate(item.posted_at)} · 확인일 {formatDate(item.fetched_at)}</p>
          <p>마감 상태: <DeadlineStatusBadge status={item.deadline_status} /></p>
          <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 원문 보기 새 창으로 열기`}>원문 보기</a>
        </article>
      ))}
    </section>
  );
}

function formatDate(value: string | null): string {
  return value === null ? "확인 필요" : value.slice(0, 10);
}
