import { useEffect, useRef } from "react";

import type { ChatCitation } from "../../src/chat/chat-contract.js";
import { Button } from "../ui/button.js";
import { ScrollArea } from "../ui/scroll-area.js";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet.js";
import { SourceCard } from "./source-card.js";

export function MobileSourceSheet({ open, citations, selectedCitation, opener, onClose }: { open: boolean; citations: ChatCitation[]; selectedCitation?: ChatCitation; opener?: HTMLElement | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null | undefined>(opener);
  const wasOpenRef = useRef(open);
  openerRef.current = opener;
  const restoreOpenerFocus = () => window.setTimeout(() => {
    const currentOpener = openerRef.current;
    const fallbackOpener = selectedCitation === undefined ? null : document.querySelector<HTMLElement>(`button[aria-label="${selectedCitation.citation_id}번 출처 보기"]`);
    (currentOpener?.isConnected === true ? currentOpener : fallbackOpener)?.focus();
  }, 50);
  useEffect(() => {
    if (wasOpenRef.current && !open) restoreOpenerFocus();
    wasOpenRef.current = open;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    document.body.dataset.sourceSheetOpen = "true";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        restoreOpenerFocus();
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      delete document.body.dataset.sourceSheetOpen;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, opener]);
  const selected = selectedCitation ?? citations[0];
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent side="bottom" showCloseButton={false} className="isolate z-[100] max-h-[88vh] gap-0 overflow-hidden rounded-t-2xl border-primary/25 bg-[var(--color-surface-primary)] p-0 text-card-foreground shadow-[0_-28px_90px_color-mix(in_oklch,var(--hanyang-blue),transparent_55%)] ring-1 ring-white/70" onCloseAutoFocus={(event) => { event.preventDefault(); restoreOpenerFocus(); }}>
        <SheetHeader className="gap-3 border-b border-primary/15 bg-[linear-gradient(90deg,color-mix(in_oklch,var(--hanyang-blue),white_88%),var(--color-surface-primary))] px-4 py-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-lg tracking-[-0.01em]">답변 출처</SheetTitle>
            <SheetClose asChild>
              <Button ref={closeRef} type="button" variant="outline" size="sm" className="h-8 rounded-full border-primary/30 bg-background text-primary hover:bg-primary hover:text-primary-foreground">닫기</Button>
            </SheetClose>
          </div>
          <SheetDescription className="break-keep">답변에 연결된 근거를 확인하고 원문으로 이동할 수 있어요.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="max-h-[calc(88vh-104px)] bg-[var(--color-surface-primary)] px-4 py-4 pb-[calc(var(--space-4)+env(safe-area-inset-bottom))]">
          {selected !== undefined ? <SourceCard citation={selected} selected /> : <p className="rounded-lg border border-dashed border-border bg-card px-4 py-5 text-sm text-muted-foreground">출처가 없어요.</p>}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
