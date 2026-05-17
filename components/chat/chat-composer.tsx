import { Button } from "../ui/button.js";
import { Card, CardContent } from "../ui/card.js";
import { Textarea } from "../ui/textarea.js";

export function ChatComposer({ query, onQueryChange, onSubmit, isLoading, maxLength = 2000 }: { query: string; onQueryChange: (query: string) => void; onSubmit: () => void; isLoading: boolean; maxLength?: number }) {
  const disabled = isLoading || query.trim().length === 0;
  return (
    <form className="relative z-0 w-full min-w-0" onSubmit={(event) => { event.preventDefault(); if (!disabled) onSubmit(); }}>
      <Card className="border-primary/20 bg-card/95 py-3 shadow-[var(--shadow-soft)] ring-1 ring-primary/5">
        <CardContent className="grid gap-3 px-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Textarea aria-label="질문 입력" value={query} maxLength={maxLength} className="min-h-24 resize-y border-primary/15 bg-background/80 text-base leading-7 focus-visible:border-primary" onChange={(event) => onQueryChange(event.target.value)} onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !disabled) onSubmit();
          }} placeholder="채용 공고, 마감일, 취업 프로그램을 질문해 보세요" />
          <Button type="submit" size="lg" disabled={disabled} className="w-full rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] hover:bg-[var(--hanyang-blue-deep)] sm:w-auto">질문 보내기</Button>
          <p className="text-sm text-muted-foreground sm:col-span-2">{isLoading ? "관련 출처를 확인하고 답변을 준비하고 있어요…" : "⌘/Ctrl + Enter로 전송 · 답변은 참고용이며, 중요 내용은 원문에서 확인하세요."}</p>
        </CardContent>
      </Card>
    </form>
  );
}
