import { useId } from "react";

import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { MetadataList } from "../common/metadata-list.js";
import { StatusBadge } from "../common/status-badge.js";
import { getSourceDisplayLabel } from "../citations/source-card.js";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card.js";

export function AnswerAttachedEvidence({ items }: { items: RecommendationItem[] }) {
  const titleId = useId();
  if (items.length === 0) return null;
  return (
    <section className="grid gap-4" aria-labelledby={titleId}>
      <h3 id={titleId} className="text-base font-semibold tracking-tight text-foreground">답변에 참고한 정보</h3>
      {items.map((item) => (
        <article key={item.recommendation_id} aria-label={`${item.title} 참고 정보`}>
          <Card className="gap-4 border-border/80 bg-background/70 py-4 shadow-none">
            <CardHeader className="flex-row items-start justify-between gap-3 px-4">
              <div className="grid gap-2">
                <StatusBadge kind="source" label={getSourceDisplayLabel(item.source_id, item.url)} className="w-fit" />
                <CardTitle className="text-base leading-6 tracking-tight">{item.title}</CardTitle>
              </div>
              <StatusBadge kind="deadline" status={item.deadline_status} />
            </CardHeader>
            <CardContent className="px-4">
              <MetadataList rows={[
                { label: "출처", value: getSourceDisplayLabel(item.source_id, item.url) },
                { label: "게시일", value: formatDate(item.posted_at), dateTime: item.posted_at ?? undefined },
                { label: "확인일", value: formatDate(item.fetched_at), dateTime: item.fetched_at },
                { label: "마감 상태", value: <StatusBadge kind="deadline" status={item.deadline_status} /> },
              ]} />
            </CardContent>
            <CardFooter className="px-4">
              <Button asChild variant="outline" size="sm">
                <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 원문 보기 새 창으로 열기`}>원문 보기</a>
              </Button>
            </CardFooter>
          </Card>
        </article>
      ))}
    </section>
  );
}

function formatDate(value: string | null): string {
  return value === null ? "확인 필요" : value.slice(0, 10);
}
