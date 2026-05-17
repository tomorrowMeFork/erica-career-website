import type { PreferenceStorageScope } from "../../src/personalization/preference-contract.js";
import { StatusBadge } from "../common/status-badge.js";

export function StorageScopeChip({ storageScope, rankingEnabled = false }: { storageScope: PreferenceStorageScope; rankingEnabled?: boolean }) {
  return <StatusBadge kind="privacy" storageScope={storageScope} rankingEnabled={rankingEnabled} />;
}
