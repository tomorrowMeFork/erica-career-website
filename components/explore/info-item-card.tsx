import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { MetadataList } from "../common/metadata-list.js";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card.js";
import { getSourceDisplayLabel } from "../citations/source-card.js";
import { DeadlineStatusBadge } from "../listings/deadline-status-badge.js";

export function InfoItemCard({ item }: { item: RecommendationItem }) {
  return (
    <article data-deadline_status={item.deadline_status} aria-label={`${item.title} 정보 카드`}>
      <Card className="erica-surface gap-4 border-border/80">
        <CardHeader className="gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-2">
            <CardTitle className="text-xl tracking-tight text-foreground"><h3>{item.title}</h3></CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">{getOneLineSummary()}</p>
          </div>
          <DeadlineStatusBadge status={item.deadline_status} />
        </CardHeader>
        <CardContent>
          <MetadataList
            aria-label="출처 및 날짜 정보"
            rows={[
              { label: "출처", value: getSourceDisplayLabel("", item.url) },
              { label: "확인일", value: formatDate(item.fetched_at), dateTime: item.fetched_at },
              { label: "게시일", value: item.posted_at !== null ? formatDate(item.posted_at) : "확인 필요", dateTime: item.posted_at ?? undefined },
            ]}
          />
        </CardContent>
        <CardFooter className="flex-wrap gap-2">
          <Button asChild>
            <a href={`/source/${encodeURIComponent(item.recommendation_id)}`} aria-label={`${item.title} 출처 상세 열기`}>출처 상세</a>
          </Button>
          <Button asChild variant="outline">
            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 원문 보기 새 창으로 열기`}>원문 보기</a>
          </Button>
        </CardFooter>
      </Card>
    </article>
  );
}

function getOneLineSummary(): string {
  return "ERICA 커리어 관련 정보입니다. 일정과 조건은 원문에서 확인하세요.";
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}
