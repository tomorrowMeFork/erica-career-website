export const infoFilters = ["전체", "진행 중", "최근 게시", "출처", "마감 상태"] as const;

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
