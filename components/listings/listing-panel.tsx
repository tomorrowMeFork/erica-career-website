import type { RecommendationItem, RecommendationPrivacyMetadata } from "../../src/recommendations/recommendation-contract.js";
import { ListingCard } from "./listing-card.js";
import { ListingFilter, ListingFilterPills } from "./listing-filter-pills.js";

export function ListingPanel({ items, activeFilter, onFilterChange, onRefresh, sessionKey, preferenceMode, privacyMetadata, loading = false }: { items: RecommendationItem[]; activeFilter: ListingFilter; onFilterChange: (filter: ListingFilter) => void; onRefresh?: (sessionKey: string) => void; sessionKey: string; preferenceMode: "preference" | "no_preference"; privacyMetadata?: RecommendationPrivacyMetadata; loading?: boolean }) {
  const filtered = filterItems(items, activeFilter);
  return (
    <section className="listing-panel soft-surface" aria-label="추천 및 최신 공고">
      <header><h2>추천 공고</h2><span>{preferenceMode === "preference" ? "맞춤 추천" : "기본 추천"}</span></header>
      <ListingFilterPills activeFilter={activeFilter} onChange={onFilterChange} />
      <p>{privacyMetadata?.storage_scope === "session" ? "현재 세션에만 저장" : "저장 안 함"}</p>
      <button type="button" className="pill-control" onClick={() => onRefresh?.(sessionKey)}>새로고침</button>
      {loading ? <p>추천 공고를 불러오는 중이에요…</p> : null}
      {filtered.length === 0 ? <div className="card-surface"><h3>아직 표시할 추천 공고가 없어요</h3><p>전공과 희망 직무를 입력하거나 최신 공고 탭에서 출처 기반 정보를 확인해 보세요.</p></div> : filtered.map((item) => <ListingCard key={item.recommendation_id} item={item} />)}
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
