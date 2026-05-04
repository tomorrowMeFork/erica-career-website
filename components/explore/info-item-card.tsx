import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { getSourceDisplayLabel } from "../citations/source-card.js";
import { DeadlineStatusBadge } from "../listings/deadline-status-badge.js";

export function InfoItemCard({ item }: { item: RecommendationItem }) {
  return (
    <article className="info-item-card card-surface" data-deadline_status={item.deadline_status}>
      <header>
        <div>
          <h3>{item.title}</h3>
          <p>{getOneLineSummary()}</p>
        </div>
        <DeadlineStatusBadge status={item.deadline_status} />
      </header>

      <div className="listing-meta" aria-label="출처 및 날짜 정보">
        <p>출처: {getSourceDisplayLabel("", item.url)}</p>
        <p>
          확인일: <time dateTime={item.fetched_at}>{formatDate(item.fetched_at)}</time>
        </p>
        <p>
          게시일: {item.posted_at !== null ? <time dateTime={item.posted_at}>{formatDate(item.posted_at)}</time> : "확인 필요"}
        </p>
      </div>

      <div className="info-item-card__actions">
        <a className="primary-button" href={`/source/${encodeURIComponent(item.recommendation_id)}`} aria-label={`${item.title} 출처 상세 열기`}>
          출처 상세
        </a>
        <a className="pill-control" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 원문 보기 새 창으로 열기`}>
          원문 보기
        </a>
      </div>
    </article>
  );
}

function getOneLineSummary(): string {
  return "ERICA 커리어 관련 정보입니다. 일정과 조건은 원문에서 확인하세요.";
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}
