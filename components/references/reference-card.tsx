import Link from "next/link";

import type { DeadlineStatus, SessionReferenceItem } from "../../lib/session-references.js";

const deadlineStatusMeta: Record<Exclude<DeadlineStatus, "unknown">, { label: string; variant: "success" | "muted" | "warning" }> = {
  open: { label: "모집중", variant: "success" },
  closing_soon: { label: "마감 임박", variant: "warning" },
  closed: { label: "마감됨", variant: "muted" },
};

export function ReferenceCard({ item }: { item: SessionReferenceItem }) {
  const deadlineMeta = item.deadlineStatus === "unknown" ? null : deadlineStatusMeta[item.deadlineStatus];

  return (
    <article className="reference-card card-surface" data-deadline_status={item.deadlineStatus} aria-label={`${item.title} 참고한 정보`}>
      <header>
        <div>
          <h2>{item.title}</h2>
          <p>{item.sourceLabel}</p>
        </div>
        {deadlineMeta ? <span className={`badge badge--${deadlineMeta.variant}`} aria-label={`마감 상태: ${deadlineMeta.label}`}>{deadlineMeta.label}</span> : null}
      </header>

      <dl className="reference-card__meta" aria-label="출처와 참고 이력">
        {item.postedAt ? (
          <div>
            <dt>게시일</dt>
            <dd><time dateTime={item.postedAt}>{formatDate(item.postedAt)}</time></dd>
          </div>
        ) : null}
        {item.fetchedAt ? (
          <div>
            <dt>확인일</dt>
            <dd><time dateTime={item.fetchedAt}>{formatDate(item.fetchedAt)}</time></dd>
          </div>
        ) : null}
        <div>
          <dt>답변에서</dt>
          <dd>{item.referenceCount}회 참고</dd>
        </div>
      </dl>

      <div className="reference-card__actions">
        <a className="primary-button" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 원문 열기 새 창으로 열기`}>
          원문 열기
        </a>
        <Link className="pill-control" href="/consultation">
          상담 이어가기
        </Link>
      </div>
    </article>
  );
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}
