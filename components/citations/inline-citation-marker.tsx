import type { ChatCitation } from "../../src/chat/chat-contract.js";

export function InlineCitationMarker({ citation, scopedCitations, onOpen }: { citation: ChatCitation; scopedCitations: ChatCitation[]; onOpen: (citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => void }) {
  return (
    <button className="inline-citation touch-target" type="button" aria-label={`${citation.citation_id}번 출처 보기`} onClick={(event) => onOpen(citation, scopedCitations, event.currentTarget)}>
      [{citation.citation_id}]
    </button>
  );
}
