"use client";

export function CitationTrigger({ count, onOpen }: { count: number; onOpen: (opener?: HTMLElement) => void }) {
  if (count === 0) return null;
  return (
    <button type="button" className="pill-control source-trigger" onClick={(event) => onOpen(event.currentTarget)}>
      {count}개 출처 사용
    </button>
  );
}
