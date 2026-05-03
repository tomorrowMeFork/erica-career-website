import type { RefusalTier } from "../src/chat/chat-contract.js";
import type { DeadlineStatus } from "../src/ingestion/normalized-record.js";
import type { MatchStrength } from "../src/recommendations/recommendation-contract.js";

type LabelMeta = { label: string; variant: "success" | "muted" | "warning" | "info" | "accent" | "neutral" };

export const deadlineStatusLabels: Record<DeadlineStatus, LabelMeta> = {
  active: { label: "모집중", variant: "success" },
  expired: { label: "마감됨", variant: "muted" },
  unknown: { label: "마감일 확인 필요", variant: "warning" },
};

export const matchStrengthLabels: Record<MatchStrength, LabelMeta> = {
  personalized_match: { label: "맞춤 추천", variant: "accent" },
  partial_match: { label: "일부 조건 일치", variant: "info" },
  general_recommendation: { label: "일반 안내", variant: "neutral" },
};

export const refusalTierLabels: Record<RefusalTier, LabelMeta & { notice: string }> = {
  hard_refuse: {
    label: "답변 근거 부족",
    variant: "info",
    notice: "확인된 근거가 부족해 답변할 수 없어요. 공식 출처에서 최신 정보를 확인해 주세요.",
  },
  soft_hedge: {
    label: "확인 필요",
    variant: "warning",
    notice: "일부 정보는 확인이 필요해요. 아래 출처와 날짜를 함께 확인해 주세요.",
  },
  normal_answer: { label: "출처 기반 답변", variant: "neutral", notice: "출처 기반 답변" },
};

export function getDeadlineStatusLabel(status: DeadlineStatus): string {
  return deadlineStatusLabels[status].label;
}

export function getDeadlineStatusMeta(status: DeadlineStatus): LabelMeta {
  return deadlineStatusLabels[status];
}

export function getMatchStrengthLabel(strength: MatchStrength): string {
  return matchStrengthLabels[strength].label;
}

export function getRefusalTierMeta(tier: RefusalTier): LabelMeta & { notice: string } {
  return refusalTierLabels[tier];
}
