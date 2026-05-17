/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StudentDashboard } from "../dashboard/student-dashboard.js";
import { AssistantAnswer } from "./assistant-answer.js";
import { ChatMessageList } from "./chat-message-list.js";

const citation = { citation_id: 1, chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "채용 공고", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active" as const };
const recommendation = { recommendation_id: "rec-1", chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "백엔드 인턴", category: "jobs", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active" as const, score: 0.9, match_strength: "personalized_match" as const, match_reasons: ["전공 조건과 연결됩니다 [1]"], score_breakdown: { base_retrieval_score: 0.5, major_match_score: 0.2, target_role_match_score: 0.1, optional_preference_score: 0, source_quality_score: 0.1, freshness_score: 0, final_score: 0.9 }, citations: [citation] };

describe("chat dashboard components", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("shows empty Korean dashboard and disables whitespace submit", () => {
    vi.stubGlobal("sessionStorage", window.sessionStorage);
    render(<StudentDashboard />);
    expect(screen.getAllByText("어떤 점이 궁금하신가요?")[0]).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "질문 보내기" }).disabled).toBe(true);
  });

  it("submits complete-response chat, fetches recommendations, and hides internal metadata", async () => {
    vi.stubGlobal("fetch", vi.fn((url) => Promise.resolve(new Response(JSON.stringify(String(url).includes("recommendations") ? { recommendations: [recommendation], generated_at: "2026-05-03T00:00:00.000Z", trace_id: "trace-rec", preference_mode: "preference", privacy_metadata: { preference_ranking_enabled: true, profile_source: "preference_service", storage_scope: "session" } } : String(url).includes("preferences") ? { preference_ranking_enabled: false, profile: null, storage_scope: "none" } : { answer: "채용 공고입니다 [1]", citations: [citation], refusal_tier: "normal_answer", confidence: 0.8, trace_id: "trace-chat" }), { status: 200 }))));
    render(<StudentDashboard />);
    fireEvent.change(screen.getByLabelText("질문 입력"), { target: { value: "채용 공고 알려줘" } });
    fireEvent.click(screen.getByRole("button", { name: "질문 보내기" }));
    const answerText = await screen.findByText((content) => content.includes("채용 공고입니다"));
    const answerArticle = answerText.closest("article");
    expect(answerArticle).toBeTruthy();
    expect(screen.getByRole("heading", { name: "답변에 참고한 정보" })).toBeTruthy();
    expect(within(answerArticle as HTMLElement).queryByText(/trace-chat|trace-rec|trace_id|source_id|chunk_id/u)).toBeNull();
    expect(screen.getAllByText("백엔드 인턴").length).toBeGreaterThan(0);
    expect(screen.queryByText(/trace-chat|trace-rec|trace_id|source_id|chunk_id|record_id|수집일|점수|personalized_match|전공 조건과 연결됩니다/u)).toBeNull();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({ body: expect.stringContaining('"top_k":5') })));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({ body: expect.stringContaining('"session_key":"erica-career-chat:') })));
  });

  it("renders refusal notices and attached evidence without destructive styling", () => {
    render(<AssistantAnswer response={{ answer: "근거 부족", citations: [], refusal_tier: "hard_refuse", confidence: 0, trace_id: "trace" }} recommendations={[recommendation]} onOpenCitation={vi.fn()} />);
    expect(screen.getByText("확인된 근거가 부족해 답변할 수 없어요. 공식 출처에서 최신 정보를 확인해 주세요.")).toBeTruthy();
    expect(screen.getByText(/출처: ERICA 취업게시판 · 게시일 2026-05-01 · 확인일 2026-05-03/u)).toBeTruthy();
    expect(screen.getByText("마감 상태:")).toBeTruthy();
    expect(screen.getByRole("link", { name: "백엔드 인턴 원문 보기 새 창으로 열기" })).toBeTruthy();
    expect(screen.queryByText("전공 조건과 연결됩니다 [1]")).toBeNull();
  });

  it("renders markdown answer content without exposing raw markers and keeps inline citations interactive", () => {
    const onOpenCitation = vi.fn();
    render(<AssistantAnswer response={{ answer: "### 핵심 요약\n\n- **백엔드 인턴** 지원 가능 [1]\n- *마감일*을 원문에서 확인하세요", citations: [citation], refusal_tier: "normal_answer", confidence: 0.8, trace_id: "trace" }} onOpenCitation={onOpenCitation} />);

    const answerArticle = screen.getByRole("heading", { name: "핵심 요약" }).closest("article");
    expect(answerArticle).toBeTruthy();
    expect(within(answerArticle as HTMLElement).getByRole("list")).toBeTruthy();
    expect(within(answerArticle as HTMLElement).getByText("백엔드 인턴")).toBeTruthy();
    expect(answerArticle?.textContent).not.toContain("###");
    expect(answerArticle?.textContent).not.toContain("**");
    expect(answerArticle?.textContent).not.toContain("*마감일*");

    fireEvent.click(within(answerArticle as HTMLElement).getByRole("button", { name: "1번 출처 보기" }));
    expect(onOpenCitation).toHaveBeenCalledWith(citation, [citation], expect.any(HTMLButtonElement));
  });

  it("does not render or execute unsafe HTML from markdown answers", () => {
    const unsafeWindow = window as typeof window & { __markdownExecuted?: boolean };
    unsafeWindow.__markdownExecuted = false;
    render(<AssistantAnswer response={{ answer: "안내 <script>window.__markdownExecuted = true</script><img alt=\"unsafe\" src=\"x\" />\n\n**마크다운 강조**", citations: [], refusal_tier: "normal_answer", confidence: 0.8, trace_id: "trace" }} onOpenCitation={vi.fn()} />);

    expect(screen.getByText("마크다운 강조")).toBeTruthy();
    expect(document.querySelector(".assistant-answer__body script")).toBeNull();
    expect(document.querySelector(".assistant-answer__body img")).toBeNull();
    expect(screen.queryByText(/window.__markdownExecuted/u)).toBeNull();
    expect(unsafeWindow.__markdownExecuted).toBe(false);
  });

  it("renders model-authored markdown links as inert visible text while citations stay interactive", () => {
    const onOpenCitation = vi.fn();
    render(<AssistantAnswer response={{ answer: "[공식 원문](https://evil.example) [1]", citations: [citation], refusal_tier: "normal_answer", confidence: 0.8, trace_id: "trace" }} onOpenCitation={onOpenCitation} />);

    const answerBody = document.querySelector(".assistant-answer__body");
    expect(answerBody).toBeTruthy();
    expect(screen.getByText("공식 원문")).toBeTruthy();
    expect(within(answerBody as HTMLElement).queryByRole("link", { name: "공식 원문" })).toBeNull();
    expect((answerBody as HTMLElement).querySelector('a[href="https://evil.example"]')).toBeNull();

    const citationMarker = within(answerBody as HTMLElement).getByRole("button", { name: "1번 출처 보기" });
    expect(citationMarker.textContent).toBe("[1]");
    fireEvent.click(citationMarker);
    expect(onOpenCitation).toHaveBeenCalledWith(citation, [citation], expect.any(HTMLButtonElement));
  });

  it("does not render markdown image nodes while rendering normal markdown text", () => {
    render(<AssistantAnswer response={{ answer: "![unsafe](https://example.edu/image.png)\n\n**정상 안내**는 계속 보여야 합니다.", citations: [], refusal_tier: "normal_answer", confidence: 0.8, trace_id: "trace" }} onOpenCitation={vi.fn()} />);

    expect(screen.getByText("정상 안내")).toBeTruthy();
    expect(screen.queryByRole("img", { name: "unsafe" })).toBeNull();
    expect(document.querySelector(".assistant-answer__body img")).toBeNull();
  });

  it("scopes repeated citation IDs to the assistant message that opened them", () => {
    const firstCitation = { ...citation, chunk_id: "chunk-a", title: "첫 번째 답변 출처", url: "https://example.edu/first" };
    const secondCitation = { ...citation, chunk_id: "chunk-b", title: "두 번째 답변 출처", url: "https://example.edu/second" };
    const onOpenCitation = vi.fn();
    render(<ChatMessageList messages={[
      { id: "a1", role: "assistant", status: "complete", response: { answer: "첫 답변 [1]", citations: [firstCitation], refusal_tier: "normal_answer", confidence: 0.8, trace_id: "trace-a" } },
      { id: "a2", role: "assistant", status: "complete", response: { answer: "둘째 답변 [1]", citations: [secondCitation], refusal_tier: "normal_answer", confidence: 0.8, trace_id: "trace-b" } },
    ]} onOpenCitation={onOpenCitation} />);
    fireEvent.click(screen.getAllByRole("button", { name: "1번 출처 보기" })[1]);
    expect(onOpenCitation).toHaveBeenCalledWith(secondCitation, [secondCitation], expect.any(HTMLButtonElement));
  });
});
