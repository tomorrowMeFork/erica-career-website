"use client";

import type { ChatCitation } from "../../src/chat/chat-contract.js";
import { SourceCard } from "./source-card.js";

export function SourceInspectionRail({ citations, selectedCitationId, onSelect, onClose }: { citations: ChatCitation[]; selectedCitationId?: number; onSelect?: (citationId: number) => void; onClose: () => void }) {
  const selected = citations.find((citation) => citation.citation_id === selectedCitationId) ?? citations[0];
  return (
    <aside className="source-rail" aria-label="출처 확인하기">
      <header><h2>출처 확인하기</h2><button type="button" onClick={onClose}>닫기</button></header>
      <div className="source-rail__list">
        {citations.map((citation) => (
          <button key={citation.citation_id} type="button" data-selected={citation.citation_id === selected?.citation_id ? "true" : "false"} onClick={() => onSelect?.(citation.citation_id)}>
            {citation.citation_id}번 · {citation.title}
          </button>
        ))}
      </div>
      {selected !== undefined ? <SourceCard citation={selected} selected /> : <p>선택된 출처가 없어요.</p>}
    </aside>
  );
}
