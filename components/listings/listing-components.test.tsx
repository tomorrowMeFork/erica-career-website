/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { ListingPanel } from "./listing-panel.js";

const citation = { citation_id: 1, chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "채용", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: null, deadline_status: "unknown" as const };
const item = (deadline_status: "active" | "expired" | "unknown", title: string, overrides: Partial<RecommendationItem> = {}): RecommendationItem => ({ ...baseItem(deadline_status, title), ...overrides });

function baseItem(deadline_status: "active" | "expired" | "unknown", title: string): RecommendationItem {
  return { recommendation_id: title, chunk_id: title, record_id: title, source_id: "ibus", title, category: "jobs", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status, score: 0.8, match_strength: "general_recommendation" as const, match_reasons: ["일반 안내입니다 [1]"], score_breakdown: { base_retrieval_score: 0.5, major_match_score: 0, target_role_match_score: 0, optional_preference_score: 0, source_quality_score: 0.2, freshness_score: 0.1, final_score: 0.8 }, citations: [citation] };
}

describe("listing components", () => {
  afterEach(() => cleanup());
  it("renders core filters and citation-preserving cards", async () => {
    const onRefresh = vi.fn();
    render(<ListingPanel items={[item("active", "진행 공고"), item("expired", "마감 공고"), item("unknown", "확인 공고")]} activeFilter="전체" onFilterChange={vi.fn()} onRefresh={onRefresh} sessionKey="session-a" preferenceMode="no_preference" />);
    for (const label of ["전체", "추천", "최신", "마감 임박", "출처", "상태"]) expect(screen.getByRole("button", { name: label })).toBeTruthy();
    expect(screen.getByText("기본 추천")).toBeTruthy();
    expect(screen.getByText("모집중")).toBeTruthy();
    expect(screen.getByText("마감됨")).toBeTruthy();
    expect(screen.getAllByText("마감일 확인 필요")[0]).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /공식 페이지 새 창으로 열기/u })[0]?.getAttribute("rel")).toBe("noopener noreferrer");
    fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
    expect(onRefresh).toHaveBeenCalledWith("session-a");
  });

  it("applies real listing filter semantics", () => {
    const items = [
      item("unknown", "확인 공고", { source_id: "z-source", posted_at: null, fetched_at: "2026-05-02T00:00:00.000Z" }),
      item("expired", "마감 공고", { source_id: "a-source", posted_at: "2026-05-04T00:00:00.000Z", match_strength: "partial_match" as const, score: 0.7 }),
      item("active", "맞춤 공고", { source_id: "b-source", posted_at: "2026-05-01T00:00:00.000Z", match_strength: "personalized_match" as const, score: 0.95 }),
      item("active", "최신 진행 공고", { source_id: "a-source", posted_at: null, fetched_at: "2026-05-05T00:00:00.000Z", match_strength: "general_recommendation" as const, score: 0.5 }),
    ];
    const renderPanel = (activeFilter: "전체" | "추천" | "최신" | "마감 임박" | "출처" | "상태") => render(<ListingPanel items={items} activeFilter={activeFilter} onFilterChange={vi.fn()} sessionKey="session-a" preferenceMode="no_preference" />);
    const cardTitles = () => screen.getAllByRole("article").map((article) => within(article).getByRole("heading").textContent);

    const { unmount } = renderPanel("전체");
    expect(cardTitles()).toEqual(["확인 공고", "마감 공고", "맞춤 공고", "최신 진행 공고"]);
    unmount();

    const latest = renderPanel("최신");
    expect(cardTitles()).toEqual(["마감 공고", "맞춤 공고", "최신 진행 공고", "확인 공고"]);
    latest.unmount();

    const urgent = renderPanel("마감 임박");
    expect(cardTitles()).toEqual(["맞춤 공고", "최신 진행 공고"]);
    urgent.unmount();

    const source = renderPanel("출처");
    expect(cardTitles()).toEqual(["마감 공고", "최신 진행 공고", "맞춤 공고", "확인 공고"]);
    source.unmount();

    const status = renderPanel("상태");
    expect(cardTitles()).toEqual(["맞춤 공고", "최신 진행 공고", "확인 공고", "마감 공고"]);
    status.unmount();

    renderPanel("추천");
    expect(cardTitles()).toEqual(["맞춤 공고", "마감 공고"]);
  });
});
