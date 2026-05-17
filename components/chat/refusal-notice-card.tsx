import type { RefusalTier } from "../../src/chat/chat-contract.js";
import { getRefusalTierMeta } from "../../lib/deadline-labels.js";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert.js";

export function RefusalNoticeCard({ refusalTier }: { refusalTier: RefusalTier }) {
  if (refusalTier === "normal_answer") return null;
  const meta = getRefusalTierMeta(refusalTier);
  const variant = meta.variant === "warning" ? "default" : "destructive";
  const tone = meta.variant === "warning" ? "border-warning/60 bg-warning/15 text-warning-foreground" : "border-destructive/35 bg-destructive/10";
  return (
    <Alert variant={variant} className={tone}>
      <AlertTitle>{meta.label}</AlertTitle>
      <AlertDescription>{meta.notice}</AlertDescription>
    </Alert>
  );
}
