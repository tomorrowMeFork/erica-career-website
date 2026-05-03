"use client";

import { useEffect, useRef } from "react";

import type { ChatCitation } from "../../src/chat/chat-contract.js";
import { SourceCard } from "./source-card.js";

export function MobileSourceSheet({ open, citations, selectedCitationId, opener, onClose }: { open: boolean; citations: ChatCitation[]; selectedCitationId?: number; opener?: HTMLElement | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        opener?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, opener]);
  if (!open) return null;
  const selected = citations.find((citation) => citation.citation_id === selectedCitationId) ?? citations[0];
  return (
    <div className="mobile-sheet" role="dialog" aria-modal="true" aria-label="출처 확인하기">
      <button ref={closeRef} type="button" onClick={() => { onClose(); opener?.focus(); }}>닫기</button>
      <h2>출처 확인하기</h2>
      {selected !== undefined ? <SourceCard citation={selected} selected /> : <p>출처가 없어요.</p>}
    </div>
  );
}
