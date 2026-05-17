import type { DeadlineStatus } from "../../src/ingestion/normalized-record.js";
import { StatusBadge } from "../common/status-badge.js";

export function DeadlineStatusBadge({ status }: { status: DeadlineStatus }) {
  return <StatusBadge kind="deadline" status={status} />;
}
