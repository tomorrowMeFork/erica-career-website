import Link from "next/link";

import type { DeadlineStatus, SessionReferenceItem } from "../../lib/session-references.js";
import { MetadataList } from "../common/metadata-list.js";
import { StatusBadge } from "../common/status-badge.js";
import { Badge } from "../ui/badge.js";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card.js";

type StatusBadgeDeadline = "open" | "closing_soon" | "closed" | "unknown";

export function ReferenceCard({ item }: { item: SessionReferenceItem }) {
  return (
    <article data-deadline_status={item.deadlineStatus} aria-label={`${item.title} 참고한 정보`}>
      <Card className="erica-surface h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[var(--erica-surface-shadow-strong)] hover:ring-primary/30">
        <CardHeader className="gap-4 pb-0">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="source" label={item.sourceLabel} />
              <Badge variant="outline" className="border-[var(--hanyang-orange)]/60 bg-[var(--hanyang-orange)]/15 text-[var(--hanyang-gold)]">마감 정보</Badge>
            </div>
            <CardTitle className="text-xl leading-tight tracking-tight text-foreground">
              <h2>{item.title}</h2>
            </CardTitle>
            <CardDescription>이번 상담에서 실제로 참고한 출처와 공고만 모았어요.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <MetadataList
            className="bg-transparent"
            aria-label="출처와 참고 이력"
            rows={[
              { label: "게시일", value: item.postedAt ? formatDate(item.postedAt) : null, dateTime: item.postedAt ?? undefined },
              { label: "확인일", value: item.fetchedAt ? formatDate(item.fetchedAt) : null, dateTime: item.fetchedAt ?? undefined },
              { label: "마감 상태", value: <StatusBadge kind="deadline" status={toStatusBadgeDeadline(item.deadlineStatus)} /> },
              { label: "답변에서", value: `${item.referenceCount}회 참고` },
            ]}
          />
        </CardContent>
        <CardFooter className="flex-wrap gap-2 pt-0">
          <Button asChild className="rounded-full shadow-[var(--shadow-soft)]">
            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 원문 열기 새 창으로 열기`}>
              원문 열기
            </a>
          </Button>
          <Button asChild variant="ghost" className="text-primary">
            <Link href="/consultation">상담 이어가기</Link>
          </Button>
        </CardFooter>
      </Card>
    </article>
  );
}

function toStatusBadgeDeadline(status: DeadlineStatus): StatusBadgeDeadline {
  if (status === "open") return "open";
  if (status === "closing_soon") return "closing_soon";
  if (status === "closed") return "closed";
  return "unknown";
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}
