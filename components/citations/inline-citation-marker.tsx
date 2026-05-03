"use client";

export function InlineCitationMarker({ citationId, onOpen }: { citationId: number; onOpen: (citationId: number, opener?: HTMLElement) => void }) {
  return (
    <button className="inline-citation touch-target" type="button" aria-label={`${citationId}번 출처 보기`} onClick={(event) => onOpen(citationId, event.currentTarget)}>
      [{citationId}]
    </button>
  );
}
