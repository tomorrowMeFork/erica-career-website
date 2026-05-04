import type { ChatCitation } from "../../src/chat/chat-contract.js";
import { SourceCard } from "./source-card.js";

export function SourceInspectionRail({ citations, selectedCitation, onSelect, onClose }: { citations: ChatCitation[]; selectedCitation?: ChatCitation; onSelect?: (citation: ChatCitation) => void; onClose: () => void }) {
  const selected = selectedCitation ?? citations[0];
  return (
    <aside className="source-rail" aria-label="답변 출처">
      <header><h2>답변 출처</h2><button type="button" onClick={onClose}>닫기</button></header>
      <div className="source-rail__list">
        {citations.map((citation, index) => (
          <button key={`${citation.citation_id}-${citation.chunk_id}-${index}`} type="button" data-selected={citation === selected ? "true" : "false"} onClick={() => onSelect?.(citation)}>
            근거 보기 · {citation.title}
          </button>
        ))}
      </div>
      {selected !== undefined ? <SourceCard citation={selected} selected /> : <p>선택된 출처가 없어요.</p>}
    </aside>
  );
}
