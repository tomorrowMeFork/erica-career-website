"use client";

export const listingFilters = ["전체", "추천", "최신", "마감 임박", "출처", "상태"] as const;
export type ListingFilter = (typeof listingFilters)[number];

export function ListingFilterPills({ activeFilter, onChange }: { activeFilter: ListingFilter; onChange: (filter: ListingFilter) => void }) {
  return <div className="filter-pills" role="group" aria-label="공고 필터">{listingFilters.map((filter) => <button key={filter} type="button" className="pill-control" aria-pressed={activeFilter === filter} onClick={() => onChange(filter)}>{filter}</button>)}</div>;
}
