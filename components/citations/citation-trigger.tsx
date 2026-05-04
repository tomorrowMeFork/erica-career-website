export function CitationTrigger({ count, onOpen }: { count: number; onOpen: (opener?: HTMLElement) => void }) {
  if (count === 0) return null;
  return (
    <button type="button" className="pill-control source-trigger" onClick={(event) => onOpen(event.currentTarget)}>
      근거 보기 ({count}개)
    </button>
  );
}
