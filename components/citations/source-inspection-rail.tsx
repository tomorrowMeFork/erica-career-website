import type { ChatCitation } from "../../src/chat/chat-contract.js";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { ScrollArea } from "../ui/scroll-area.js";
import { Separator } from "../ui/separator.js";
import { SourceCard } from "./source-card.js";

export function SourceInspectionRail({ citations, selectedCitation, onSelect, onClose }: { citations: ChatCitation[]; selectedCitation?: ChatCitation; onSelect?: (citation: ChatCitation) => void; onClose: () => void }) {
  const selected = selectedCitation ?? citations[0];
  return (
    <Card className="erica-surface-strong sticky top-24 w-full min-w-0 max-h-[calc(100vh-var(--space-section))] overflow-hidden border-primary/15 py-0">
      <aside aria-label="답변 출처">
        <CardHeader className="gap-3 px-4 pt-4 pb-0">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base tracking-[-0.01em] text-foreground"><h2>답변 출처</h2></CardTitle>
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-full border-primary/25 bg-background text-primary" onClick={onClose}>닫기</Button>
          </div>
          <p className="text-sm break-keep text-muted-foreground">답변에 연결된 근거를 확인하고 원문으로 이동할 수 있어요.</p>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-4 px-4 pb-4">
          <Separator />
          <ScrollArea className="erica-surface-muted max-h-36 rounded-lg border border-primary/15">
            <div className="grid gap-2 p-2">
              {citations.map((citation, index) => (
                <Button key={`${citation.citation_id}-${citation.chunk_id}-${index}`} type="button" variant={citation === selected ? "secondary" : "ghost"} size="sm" data-selected={citation === selected ? "true" : "false"} className="h-auto min-h-11 justify-start rounded-lg px-3 py-2 text-left whitespace-normal data-[selected=true]:border data-[selected=true]:border-primary/20 data-[selected=true]:text-primary" onClick={() => onSelect?.(citation)}>
                  근거 보기 · {citation.title}
                </Button>
              ))}
            </div>
          </ScrollArea>
          {selected !== undefined ? <SourceCard citation={selected} selected /> : <p className="erica-surface-muted rounded-lg border border-dashed border-primary/25 px-4 py-5 text-sm text-muted-foreground">선택된 출처가 없어요.</p>}
        </CardContent>
      </aside>
    </Card>
  );
}
