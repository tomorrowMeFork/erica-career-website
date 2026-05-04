import { useEffect, useRef } from "react";

import type { ChatCitation } from "../../src/chat/chat-contract.js";
import { SourceCard } from "./source-card.js";

export function MobileSourceSheet({ open, citations, selectedCitation, opener, onClose }: { open: boolean; citations: ChatCitation[]; selectedCitation?: ChatCitation; opener?: HTMLElement | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        opener?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusableElements(sheetRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, opener]);
  if (!open) return null;
  const selected = selectedCitation ?? citations[0];
  return (
    <>
      <button type="button" className="mobile-sheet-backdrop" aria-label="답변 출처 닫기" onClick={() => { onClose(); opener?.focus(); }} />
      <div ref={sheetRef} className="mobile-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-source-sheet-title">
        <button ref={closeRef} type="button" className="pill-control" onClick={() => { onClose(); opener?.focus(); }}>닫기</button>
        <h2 id="mobile-source-sheet-title">답변 출처</h2>
        {selected !== undefined ? <SourceCard citation={selected} selected /> : <p>출처가 없어요.</p>}
      </div>
    </>
  );
}

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (root === null) return [];
  const selector = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
  return Array.from(root.querySelectorAll<HTMLElement>(selector));
}
