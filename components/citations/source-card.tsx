import type { ChatCitation } from "../../src/chat/chat-contract.js";
import { getDeadlineStatusLabel } from "../../lib/deadline-labels.js";

export function SourceCard({ citation, selected = false }: { citation: ChatCitation; selected?: boolean }) {
  const domain = new URL(citation.url).hostname;
  return (
    <article className="source-card card-surface" data-selected={selected ? "true" : "false"} aria-label={`${citation.title} 출처 카드`}>
      <div className="source-card__badge">공식 출처</div>
      <h3>{citation.title}</h3>
      <p>{citation.source_id} · {domain}</p>
      <p>수집일: <time dateTime={citation.fetched_at}>{formatDate(citation.fetched_at)}</time></p>
      {citation.posted_at !== null ? <p>게시일: <time dateTime={citation.posted_at}>{formatDate(citation.posted_at)}</time></p> : null}
      {citation.page_number !== undefined ? <p>페이지: {citation.page_number}</p> : null}
      <span className="deadline-badge" aria-label={`마감 상태: ${getDeadlineStatusLabel(citation.deadline_status)}`}>{getDeadlineStatusLabel(citation.deadline_status)}</span>
      <a href={citation.url} target="_blank" rel="noopener noreferrer" aria-label={`${citation.title} 공식 페이지 새 창으로 열기`}>공식 페이지 열기</a>
    </article>
  );
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}
