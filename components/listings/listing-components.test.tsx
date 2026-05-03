import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ListingPanel } from "./listing-panel.js";

const citation = { citation_id: 1, chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "채용", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: null, deadline_status: "unknown" as const };
const item = (deadline_status: "active" | "expired" | "unknown", title: string) => ({ recommendation_id: title, chunk_id: title, record_id: title, source_id: "ibus", title, category: "jobs", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status, score: 0.8, match_strength: "general_recommendation" as const, match_reasons: ["일반 안내입니다 [1]"], score_breakdown: { base_retrieval_score: 0.5, major_match_score: 0, target_role_match_score: 0, optional_preference_score: 0, source_quality_score: 0.2, freshness_score: 0.1, final_score: 0.8 }, citations: [citation] });

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
});
