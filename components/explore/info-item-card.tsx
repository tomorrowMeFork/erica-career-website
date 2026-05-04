import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { DeadlineStatusBadge } from "../listings/deadline-status-badge.js";

export function InfoItemCard({ item }: { item: RecommendationItem }) {
  return (
    <article className="info-item-card card-surface" data-deadline_status={item.deadline_status}>
      <header>
        <div>
          <p className="panel-kicker">커리어 정보</p>
          <h3>{item.title}</h3>
        </div>
        <DeadlineStatusBadge status={item.deadline_status} />
      </header>

      <div className="listing-meta" aria-label="출처 및 날짜 정보">
        <p>source_id {item.source_id}</p>
        <p>분류 {item.category}</p>
        <p>
          수집일: <time dateTime={item.fetched_at}>{formatDate(item.fetched_at)}</time>
        </p>
        <p>
          게시일: {item.posted_at !== null ? <time dateTime={item.posted_at}>{formatDate(item.posted_at)}</time> : "확인 필요"}
        </p>
      </div>

      <div className="info-item-card__actions">
        <a className="primary-button" href={`/source/${encodeURIComponent(item.chunk_id)}`} aria-label={`${item.title} 출처 확인 페이지 열기`}>
          자세히 보기
        </a>
        <a className="pill-control" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 원문 출처 새 창으로 열기`}>
          원문 출처
        </a>
      </div>
    </article>
  );
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}
