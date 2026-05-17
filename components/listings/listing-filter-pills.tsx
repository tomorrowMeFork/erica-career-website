import { Button } from "../ui/button.js";

export const listingFilters = ["전체", "추천", "최신", "마감 임박", "출처", "상태"] as const;
export type ListingFilter = (typeof listingFilters)[number];

export function ListingFilterPills({ activeFilter, onChange }: { activeFilter: ListingFilter; onChange: (filter: ListingFilter) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="공고 필터">
      {listingFilters.map((filter) => {
        const isActive = activeFilter === filter;
        return (
          <Button
            key={filter}
            type="button"
            variant={isActive ? "default" : "outline"}
            size="sm"
            aria-pressed={isActive}
            className="rounded-full"
            onClick={() => onChange(filter)}
          >
            {filter}
          </Button>
        );
      })}
    </div>
  );
}
