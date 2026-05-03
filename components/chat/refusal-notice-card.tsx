import type { RefusalTier } from "../../src/chat/chat-contract.js";
import { getRefusalTierMeta } from "../../lib/deadline-labels.js";

export function RefusalNoticeCard({ refusalTier }: { refusalTier: RefusalTier }) {
  if (refusalTier === "normal_answer") return null;
  const meta = getRefusalTierMeta(refusalTier);
  return <div className={`refusal-notice refusal-notice--${meta.variant}`}><strong>{meta.label}</strong><p>{meta.notice}</p></div>;
}
