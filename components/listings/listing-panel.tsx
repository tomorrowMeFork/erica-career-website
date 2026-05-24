import type { RecommendationItem, RecommendationPrivacyMetadata } from "../../src/recommendations/recommendation-contract.js";
import { EmptyState } from "../common/empty-state.js";
import { LoadingState } from "../common/loading-state.js";
import { StatusBadge } from "../common/status-badge.js";
import { Badge } from "../ui/badge.js";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { ListingCard } from "./listing-card.js";
import { ListingFilter, ListingFilterPills } from "./listing-filter-pills.js";

export function ListingPanel({ items, activeFilter, onFilterChange, onRefresh, sessionKey, preferenceMode, privacyMetadata, loading = false }: { items: RecommendationItem[]; activeFilter: ListingFilter; onFilterChange: (filter: ListingFilter) => void; onRefresh?: (sessionKey: string) => void; sessionKey: string; preferenceMode: "preference" | "no_preference"; privacyMetadata?: RecommendationPrivacyMetadata; loading?: boolean }) {
  const filtered = filterItems(items, activeFilter);
  return (
    <section aria-label="추천 및 최신 공고">
      <Card className="erica-surface-muted border-border/80">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{preferenceMode === "preference" ? "맞춤 추천" : "기본 추천"}</Badge>
                <StatusBadge kind="privacy" storageScope={privacyMetadata?.storage_scope ?? "none"} rankingEnabled={privacyMetadata?.preference_ranking_enabled} />
              </div>
              <CardTitle className="text-2xl tracking-tight text-foreground">
                <h2>추천 공고</h2>
              </CardTitle>
            </div>
            <Button type="button" variant="outline" onClick={() => onRefresh?.(sessionKey)}>
              새로고침
            </Button>
          </div>
          <ListingFilterPills activeFilter={activeFilter} onChange={onFilterChange} />
        </CardHeader>
        <CardContent className="grid gap-4">
          {loading ? <LoadingState statusText="추천 공고를 불러오는 중이에요…" /> : null}
          {filtered.length === 0 ? (
            <EmptyState title="아직 표시할 추천 공고가 없어요" body="전공과 희망 직무를 입력하거나 최신 공고 탭에서 출처 기반 정보를 확인해 보세요." />
          ) : (
            <div className="grid gap-4">{filtered.map((item) => <ListingCard key={item.recommendation_id} item={item} />)}</div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function filterItems(items: RecommendationItem[], filter: ListingFilter): RecommendationItem[] {
  if (filter === "추천") return [...items].filter((item) => item.match_strength !== "general_recommendation").sort((a, b) => b.score - a.score);
  if (filter === "최신") return [...items].sort(compareNewest);
  if (filter === "마감 임박") return [...items].filter((item) => item.deadline_status === "active").sort(compareNewest);
  if (filter === "출처") return [...items].sort((a, b) => a.source_id.localeCompare(b.source_id, "ko") || a.title.localeCompare(b.title, "ko"));
  if (filter === "상태") return [...items].sort((a, b) => statusRank(a) - statusRank(b));
  return items;
}

function compareNewest(a: RecommendationItem, b: RecommendationItem): number {
  return compareNullableDateDescending(a.posted_at, b.posted_at) || compareNullableDateDescending(a.fetched_at, b.fetched_at);
}

function compareNullableDateDescending(left: string | null, right: string | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return Date.parse(right) - Date.parse(left);
}

function statusRank(item: RecommendationItem): number {
  if (item.deadline_status === "active") return 0;
  if (item.deadline_status === "unknown") return 1;
  return 2;
}
