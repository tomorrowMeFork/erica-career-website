import { Button } from "../ui/button.js";

export function CitationTrigger({ count, onOpen }: { count: number; onOpen: (opener?: HTMLElement) => void }) {
  if (count === 0) return null;
  return (
    <Button type="button" variant="secondary" size="sm" className="w-fit rounded-full border border-accent/40 bg-accent/15 text-accent-foreground shadow-none hover:bg-accent/25" onClick={(event) => onOpen(event.currentTarget)}>
      근거 보기 ({count}개)
    </Button>
  );
}
