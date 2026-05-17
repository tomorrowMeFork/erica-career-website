import { Button } from "../ui/button.js";

export const infoFilters = ["전체", "진행 중", "최근 게시", "출처", "마감 상태"] as const;

export type InfoFilter = (typeof infoFilters)[number];

export function InfoFilterPills({ activeFilter, onChange }: { activeFilter: InfoFilter; onChange: (filter: InfoFilter) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="정보 필터">
      {infoFilters.map((filter) => (
        <Button key={filter} type="button" variant={activeFilter === filter ? "secondary" : "outline"} aria-pressed={activeFilter === filter} onClick={() => onChange(filter)}>
          {filter}
        </Button>
      ))}
    </div>
  );
}
