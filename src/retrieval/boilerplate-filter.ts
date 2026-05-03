import { z } from "zod";

import { normalizeKoreanText } from "./normalize-korean.js";

export const BoilerplateClassificationSchema = z.object({
  label: z.enum(["answerable", "mixed", "boilerplate_only"]),
  boilerplate_score: z.number(),
  answer_signal_score: z.number(),
  matched_boilerplate_signals: z.array(z.string()),
  matched_answer_signals: z.array(z.string()),
});

export type BoilerplateClassification = z.infer<typeof BoilerplateClassificationSchema>;

const boilerplateSignals = [
  "포털시스템 로그인",
  "아이디/비밀번호",
  "공유",
  "인쇄",
  "다운로드",
  "전체화면",
  "PRINT",
  "목차",
  "MAIN",
  "HOME",
  "exit_to_app",
  "subjectclose",
] as const;

const answerSignals = [
  "상담예약",
  "전문가 상담",
  "컨설팅룸예약",
  "취업프로그램",
  "채용정보",
  "자기소개서 첨삭",
  "교수님 상담",
  "진로설계",
  "경력개발",
  "경력포트폴리오",
  "포트폴리오",
  "취업준비도검사",
  "직무부트캠프",
  "현장실습",
  "인턴채용",
  "일반채용",
  "아르바이트",
  "가이드북",
  "취업성공후기",
] as const;

export function classifyBoilerplate(text: string): BoilerplateClassification {
  const normalizedText = sanitizeForMatching(text);
  const matchedBoilerplateSignals = matchSignals(normalizedText, boilerplateSignals);
  const matchedAnswerSignals = matchSignals(normalizedText, answerSignals);
  const boilerplateScore = matchedBoilerplateSignals.length;
  const answerSignalScore = matchedAnswerSignals.length * 2;

  const label = classifyLabel(boilerplateScore, answerSignalScore);

  return BoilerplateClassificationSchema.parse({
    label,
    boilerplate_score: boilerplateScore,
    answer_signal_score: answerSignalScore,
    matched_boilerplate_signals: matchedBoilerplateSignals,
    matched_answer_signals: matchedAnswerSignals,
  });
}

export function sanitizeForMatching(text: string): string {
  return normalizeKoreanText(text.replace(/[\u0000-\u001f\u007f]/gu, " "));
}

function classifyLabel(boilerplateScore: number, answerSignalScore: number): BoilerplateClassification["label"] {
  if (answerSignalScore > 0 && boilerplateScore > 0) {
    return "mixed";
  }
  if (answerSignalScore > 0) {
    return "answerable";
  }
  if (boilerplateScore > 0) {
    return "boilerplate_only";
  }
  return "answerable";
}

function matchSignals(text: string, signals: readonly string[]): string[] {
  return signals.filter((signal) => text.includes(normalizeKoreanText(signal)));
}
