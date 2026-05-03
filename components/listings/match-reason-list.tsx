export function MatchReasonList({ reasons = [] }: { reasons?: string[] }) {
  return <ul className="match-reasons">{reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul>;
}
