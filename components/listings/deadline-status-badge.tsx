import type { DeadlineStatus } from "../../src/ingestion/normalized-record.js";
import { getDeadlineStatusLabel, getDeadlineStatusMeta } from "../../lib/deadline-labels.js";

export function DeadlineStatusBadge({ status }: { status: DeadlineStatus }) {
  const meta = getDeadlineStatusMeta(status);
  return <span className={`badge badge--${meta.variant}`} aria-label={`마감 상태: ${meta.label}`}>{getDeadlineStatusLabel(status)}</span>;
}
