import type { ChatCitation } from "../../src/chat/chat-contract.js";
import { getDeadlineStatusLabel } from "../../lib/deadline-labels.js";

export function SourceCard({ citation, selected = false }: { citation: ChatCitation; selected?: boolean }) {
  const domain = new URL(citation.url).hostname;
  return (
    <article className="source-card card-surface" data-selected={selected ? "true" : "false"} aria-label={`${citation.title} 출처 카드`}>
      <div className="source-card__badge">답변 근거</div>
      <h3>{citation.title}</h3>
      <div className="source-meta">
        <p>출처: {getSourceDisplayLabel(citation.source_id, citation.url)}</p>
        <p>확인일: <time dateTime={citation.fetched_at}>{formatDate(citation.fetched_at)}</time></p>
        {citation.posted_at !== null ? <p>게시일: <time dateTime={citation.posted_at}>{formatDate(citation.posted_at)}</time></p> : null}
        {citation.page_number !== undefined ? <p>페이지: {citation.page_number}</p> : null}
        <p>{domain}</p>
      </div>
      <span className="deadline-badge" aria-label={`마감 상태: ${getDeadlineStatusLabel(citation.deadline_status)}`}>{getDeadlineStatusLabel(citation.deadline_status)}</span>
      <a href={citation.url} target="_blank" rel="noopener noreferrer" aria-label={`${citation.title} 원문 보기 새 창으로 열기`}>원문 보기</a>
    </article>
  );
}

export function getSourceDisplayLabel(sourceId: string, url: string): string {
  const hostname = new URL(url).hostname;
  if (sourceId.includes("ibus") || hostname === "ibus.hanyang.ac.kr") return "ERICA 취업게시판";
  if (sourceId.includes("cdp") || hostname === "cdp.hanyang.ac.kr") return "한양대학교 ERICA 커리어개발센터";
  return "확인된 출처";
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}
