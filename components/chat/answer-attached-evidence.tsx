import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { DeadlineStatusBadge } from "../listings/deadline-status-badge.js";

export function AnswerAttachedEvidence({ items }: { items: RecommendationItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="attached-evidence" aria-label="답변 근거 정보">
      {items.map((item) => (
        <article key={item.recommendation_id} className="evidence-card card-surface">
          <header><h4>{item.title}</h4><DeadlineStatusBadge status={item.deadline_status} /></header>
          <p>source_id {item.source_id} · 게시일 {formatDate(item.posted_at)} · 수집일 {formatDate(item.fetched_at)}</p>
          <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 원문 출처 새 창으로 열기`}>원문 출처</a>
        </article>
      ))}
    </section>
  );
}

function formatDate(value: string | null): string {
  return value === null ? "확인 필요" : value.slice(0, 10);
}
