import * as React from "react";

import { cn } from "../../lib/utils.js";
import type { PreferenceStorageScope } from "../../src/personalization/preference-contract.js";
import { Badge } from "../ui/badge.js";

type DeadlineBadgeStatus = "active" | "expired" | "unknown" | "open" | "closing_soon" | "closed";

type BadgeBaseProps = Omit<React.ComponentProps<typeof Badge>, "children" | "variant">;

type StatusBadgeProps = BadgeBaseProps & (
  | { kind: "deadline"; status: DeadlineBadgeStatus; label?: never; storageScope?: never; rankingEnabled?: never }
  | { kind: "source"; label?: string; status?: never; storageScope?: never; rankingEnabled?: never }
  | { kind: "privacy"; storageScope: PreferenceStorageScope; rankingEnabled?: boolean; label?: never; status?: never }
);

export function StatusBadge(props: StatusBadgeProps) {
  if (props.kind === "deadline") {
    const { kind: _kind, status, className, ...rest } = props;
    const label = getDeadlineBadgeLabel(status);
    return (
      <Badge variant="outline" aria-label={rest["aria-label"] ?? `마감 상태: ${label}`} className={cn("min-h-7 px-3 text-sm", deadlineToneClassNames[status], className)} {...rest}>
        {label}
      </Badge>
    );
  }

  if (props.kind === "privacy") {
    const { kind: _kind, storageScope, rankingEnabled, className, ...rest } = props;
    const label = getPrivacyBadgeLabel(storageScope, rankingEnabled);
    return (
      <Badge variant="outline" aria-label={rest["aria-label"] ?? `저장 범위: ${label}`} className={cn("min-h-7 border-primary/35 bg-primary/10 px-3 text-sm text-primary", className)} {...rest}>
        {label}
      </Badge>
    );
  }

  const { kind: _kind, label: sourceLabel, className, ...rest } = props;
  const label = sourceLabel ?? "확인된 출처";
  return (
    <Badge variant="outline" aria-label={rest["aria-label"] ?? `출처: ${label}`} className={cn("min-h-7 border-[var(--hanyang-yellow-green)]/55 bg-[var(--hanyang-yellow-green)]/15 px-3 text-sm text-primary", className)} {...rest}>
      {label}
    </Badge>
  );
}

export function getDeadlineBadgeLabel(status: DeadlineBadgeStatus): string {
  if (status === "active" || status === "open") return "모집중";
  if (status === "closing_soon") return "마감 임박";
  if (status === "expired" || status === "closed") return "마감됨";
  return "마감일 확인 필요";
}

export function getPrivacyBadgeLabel(storageScope: PreferenceStorageScope, rankingEnabled = false): string {
  const label = storageScope === "persistent" ? "동의 후 저장" : storageScope === "session" ? "현재 세션에만 저장" : "저장 안 함";
  return rankingEnabled ? `${label} · 입력한 조건` : label;
}

const deadlineToneClassNames: Record<DeadlineBadgeStatus, string> = {
  active: "border-[var(--hanyang-yellow-green)]/55 bg-[var(--hanyang-yellow-green)]/15 text-primary",
  open: "border-[var(--hanyang-yellow-green)]/55 bg-[var(--hanyang-yellow-green)]/15 text-primary",
  closing_soon: "border-[var(--hanyang-orange)]/60 bg-[var(--hanyang-orange)]/15 text-[var(--hanyang-gold)]",
  expired: "border-border bg-muted text-muted-foreground",
  closed: "border-border bg-muted text-muted-foreground",
  unknown: "border-[var(--hanyang-orange)]/60 bg-[var(--hanyang-orange)]/15 text-[var(--hanyang-gold)]",
};
