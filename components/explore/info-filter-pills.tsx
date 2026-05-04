export const infoFilters = ["전체", "마감 임박", "최신순", "출처별", "상태별"] as const;

export type InfoFilter = (typeof infoFilters)[number];

export function InfoFilterPills({ activeFilter, onChange }: { activeFilter: InfoFilter; onChange: (filter: InfoFilter) => void }) {
  return (
    <div className="filter-pills" role="group" aria-label="정보 필터">
      {infoFilters.map((filter) => (
        <button key={filter} type="button" className="pill-control" aria-pressed={activeFilter === filter} onClick={() => onChange(filter)}>
          {filter}
        </button>
      ))}
    </div>
  );
}
