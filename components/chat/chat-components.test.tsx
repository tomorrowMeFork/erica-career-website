/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StudentDashboard } from "../dashboard/student-dashboard.js";
import { AssistantAnswer } from "./assistant-answer.js";

const citation = { citation_id: 1, chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "채용 공고", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active" as const };
const recommendation = { recommendation_id: "rec-1", chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "백엔드 인턴", category: "jobs", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active" as const, score: 0.9, match_strength: "personalized_match" as const, match_reasons: ["전공 조건과 연결됩니다 [1]"], score_breakdown: { base_retrieval_score: 0.5, major_match_score: 0.2, target_role_match_score: 0.1, optional_preference_score: 0, source_quality_score: 0.1, freshness_score: 0, final_score: 0.9 }, citations: [citation] };

describe("chat dashboard components", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("shows empty Korean dashboard and disables whitespace submit", () => {
    vi.stubGlobal("sessionStorage", window.sessionStorage);
    render(<StudentDashboard />);
    expect(screen.getAllByText("무엇을 도와드릴까요?")[0]).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "질문 보내기" }).disabled).toBe(true);
  });

  it("submits complete-response chat, fetches recommendations, and renders history metadata", async () => {
    vi.stubGlobal("fetch", vi.fn((url) => Promise.resolve(new Response(JSON.stringify(String(url).includes("recommendations") ? { recommendations: [recommendation], generated_at: "2026-05-03T00:00:00.000Z", trace_id: "trace-rec", preference_mode: "preference", privacy_metadata: { preference_ranking_enabled: true, profile_source: "preference_service", storage_scope: "session" } } : String(url).includes("preferences") ? { preference_ranking_enabled: false, profile: null, storage_scope: "none" } : { answer: "채용 공고입니다 [1]", citations: [citation], refusal_tier: "normal_answer", confidence: 0.8, trace_id: "trace-chat" }), { status: 200 }))));
    render(<StudentDashboard />);
    fireEvent.change(screen.getByLabelText("질문 입력"), { target: { value: "채용 공고 알려줘" } });
    fireEvent.click(screen.getByRole("button", { name: "질문 보내기" }));
    expect(await screen.findByText((content) => content.includes("채용 공고입니다"))).toBeTruthy();
    expect(screen.getByText("응답 추적 ID 보기")).toBeTruthy();
    expect(screen.getAllByText("백엔드 인턴").length).toBeGreaterThan(0);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({ body: expect.stringContaining('"top_k":5') })));
  });

  it("renders refusal notices and recommendation cards without destructive styling", () => {
    render(<AssistantAnswer response={{ answer: "근거 부족", citations: [], refusal_tier: "hard_refuse", confidence: 0, trace_id: "trace" }} recommendations={[recommendation]} onOpenCitation={vi.fn()} />);
    expect(screen.getByText("확인된 근거가 부족해 답변할 수 없어요. 공식 출처에서 최신 정보를 확인해 주세요.")).toBeTruthy();
    expect(screen.getByText("맞춤 추천 · 점수 0.90")).toBeTruthy();
    expect(screen.getByText("전공 조건과 연결됩니다 [1]")).toBeTruthy();
  });
});
