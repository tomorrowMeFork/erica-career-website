import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { MetadataList } from "../common/metadata-list.js";
import { StatusBadge } from "../common/status-badge.js";
import { Button } from "../ui/button.js";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card.js";
import { getSourceDisplayLabel } from "../citations/source-card.js";
import { DeadlineStatusBadge } from "./deadline-status-badge.js";
import { MatchStrengthBadge } from "./match-strength-badge.js";

export function ListingCard({ item }: { item: RecommendationItem }) {
  const sourceLabel = getSourceDisplayLabel(item.source_id, item.url);
  const citationTitles = item.citations.map((citation) => citation.title);

  return (
    <article data-deadline_status={item.deadline_status} aria-label={`${item.title} 추천 정보`}>
      <Card className="overflow-hidden border-border/80 bg-card/95 shadow-sm transition-colors hover:border-primary/35">
        <CardHeader className="gap-4 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="source" label={sourceLabel} />
              <DeadlineStatusBadge status={item.deadline_status} />
              <MatchStrengthBadge strength={item.match_strength} />
            </div>
            <CardTitle className="text-xl leading-tight tracking-tight text-foreground">
              <h3>{item.title}</h3>
            </CardTitle>
            <CardDescription className="text-sm leading-6">분류와 출처, 날짜를 먼저 확인한 뒤 원문에서 세부 조건을 확인하세요.</CardDescription>
          </div>
          <CardAction className="hidden sm:block">
            <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{getCategoryDisplayLabel(item.category)}</span>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <MetadataList
            aria-label="출처 및 날짜 정보"
            rows={[
              { label: "분류", value: getCategoryDisplayLabel(item.category) },
              { label: "출처", value: sourceLabel },
              { label: "게시일", value: formatDate(item.posted_at), dateTime: item.posted_at ?? undefined },
              { label: "확인일", value: formatDate(item.fetched_at), dateTime: item.fetched_at },
              { label: "마감 상태", value: <DeadlineStatusBadge status={item.deadline_status} /> },
            ]}
          />
          {citationTitles.length > 0 ? <p className="rounded-lg bg-secondary px-4 py-3 text-sm leading-6 text-secondary-foreground">참고 출처: {citationTitles.join(" · ")}</p> : null}
        </CardContent>
        <CardFooter>
          <Button asChild>
            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 공식 페이지 새 창으로 열기`}>
              공식 페이지 열기
            </a>
          </Button>
        </CardFooter>
      </Card>
    </article>
  );
}

function formatDate(value: string | null): string {
  return value === null ? "확인 필요" : value.slice(0, 10);
}

function getCategoryDisplayLabel(category: string): string {
  if (category === "jobs") return "채용";
  if (category === "programs") return "프로그램";
  if (category === "notices") return "공지";
  return "기타";
}
