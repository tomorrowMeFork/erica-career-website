import type { PreferenceStorageScope } from "../../src/personalization/preference-contract.js";

export function StorageScopeChip({ storageScope, rankingEnabled = false }: { storageScope: PreferenceStorageScope; rankingEnabled?: boolean }) {
  const label = storageScope === "persistent" ? "동의 후 저장" : storageScope === "session" ? "현재 세션에만 저장" : "저장 안 함";
  return <span className="pill-control storage-chip">{label}{rankingEnabled ? " · 입력한 조건" : ""}</span>;
}
