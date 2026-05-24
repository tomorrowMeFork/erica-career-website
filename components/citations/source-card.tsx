import type { ChatCitation } from "../../src/chat/chat-contract.js";
import { MetadataList } from "../common/metadata-list.js";
import { StatusBadge, getDeadlineBadgeLabel } from "../common/status-badge.js";
import { Badge } from "../ui/badge.js";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card.js";

export function SourceCard({ citation, selected = false }: { citation: ChatCitation; selected?: boolean }) {
  const domain = new URL(citation.url).hostname;
  const sourceLabel = getSourceDisplayLabel(citation.source_id, citation.url);
  const deadlineLabel = getDeadlineBadgeLabel(citation.deadline_status);
  return (
    <Card role="article" data-selected={selected ? "true" : "false"} aria-label={`${citation.title} 출처 카드`} className="erica-surface gap-4 overflow-hidden py-0 ring-1 ring-primary/15 data-[selected=true]:bg-[var(--erica-surface-strong)] data-[selected=true]:ring-[var(--hanyang-retro-mint)]/70">
      <CardHeader className="gap-3 border-t-4 border-t-accent px-5 pt-5 pb-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-[var(--hanyang-yellow-green)]/55 bg-[var(--hanyang-yellow-green)]/15 text-primary" variant="outline">답변 근거</Badge>
          <StatusBadge kind="source" label={sourceLabel} />
          <StatusBadge kind="deadline" status={citation.deadline_status} />
        </div>
        <div className="grid gap-2">
          <CardTitle className="text-lg leading-snug tracking-[-0.01em] text-foreground">{citation.title}</CardTitle>
          <CardDescription>출처: {sourceLabel}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 px-5">
        <MetadataList
          className="bg-transparent"
          aria-label={`${citation.title} 출처 메타데이터`}
          rows={[
            { label: "출처", value: sourceLabel },
            { label: "확인일", value: formatDate(citation.fetched_at), dateTime: citation.fetched_at },
            { label: "게시일", value: citation.posted_at === null ? null : formatDate(citation.posted_at), dateTime: citation.posted_at ?? undefined },
            { label: "페이지", value: citation.page_number === undefined ? null : citation.page_number },
            { label: "도메인", value: domain },
            { label: "마감 상태", value: deadlineLabel },
          ]}
        />
      </CardContent>
      <CardFooter className="justify-between gap-3 border-t border-primary/10 bg-[color-mix(in_oklch,var(--muted),white_35%)] px-5 py-4">
        <span className="text-sm text-muted-foreground">{domain}</span>
        <Button asChild variant="outline" size="sm" className="rounded-full border-primary/30 bg-background text-primary hover:bg-primary hover:text-primary-foreground">
          <a href={citation.url} target="_blank" rel="noopener noreferrer" aria-label={`${citation.title} 원문 보기 새 창으로 열기`}>원문 보기</a>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function getSourceDisplayLabel(sourceId: string, url: string): string {
  const hostname = new URL(url).hostname;
  if (sourceId.includes("ibus") || hostname === "ibus.hanyang.ac.kr") return "ERICA 취업게시판";
  if (sourceId.includes("cdp") || hostname === "cdp.hanyang.ac.kr") return "한양대학교 ERICA 커리어개발센터";
  return "확인된 출처";
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}
