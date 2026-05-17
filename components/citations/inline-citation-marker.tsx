import type { ChatCitation } from "../../src/chat/chat-contract.js";
import { Button } from "../ui/button.js";

export function InlineCitationMarker({ citation, scopedCitations, onOpen }: { citation: ChatCitation; scopedCitations: ChatCitation[]; onOpen: (citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => void }) {
  return (
    <Button className="mx-1 inline-flex min-h-7 min-w-7 rounded-full border-accent/50 bg-accent/15 px-2 align-baseline text-xs font-semibold text-accent-foreground shadow-none hover:bg-accent/25" variant="outline" size="xs" type="button" aria-label={`${citation.citation_id}번 출처 보기`} onClick={(event) => onOpen(citation, scopedCitations, event.currentTarget)}>
      [{citation.citation_id}]
    </Button>
  );
}
