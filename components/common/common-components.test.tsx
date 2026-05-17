/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state.js";
import { LoadingState } from "./loading-state.js";
import { MetadataList } from "./metadata-list.js";
import { RouteHero } from "./route-hero.js";
import { StatusBadge } from "./status-badge.js";

describe("common ERICA composition components", () => {
  afterEach(() => cleanup());

  it("renders route and empty states with accessible Korean copy", () => {
    render(
      <>
        <RouteHero titleId="route-title" eyebrow="상담" title="커리어 상담" description="확인된 출처를 바탕으로 안내합니다." />
        <EmptyState aria-label="참고한 정보 없음" title="아직 참고한 정보가 없습니다" body="상담에서 확인한 출처를 여기에 모아요." />
      </>,
    );

    expect(screen.getByRole("heading", { name: "커리어 상담" })).toBeTruthy();
    expect(screen.getByLabelText("참고한 정보 없음")).toBeTruthy();
  });

  it("preserves metadata labels and skips missing values", () => {
    render(
      <MetadataList
        aria-label="필수 메타데이터"
        rows={[
          { label: "출처", value: "ERICA 취업게시판" },
          { label: "게시일", value: "2026-05-01", dateTime: "2026-05-01T00:00:00.000Z" },
          { label: "확인일", value: "2026-05-03", dateTime: "2026-05-03T00:00:00.000Z" },
          { label: "마감 상태", value: null },
        ]}
      />,
    );

    expect(screen.getByText("출처")).toBeTruthy();
    expect(screen.getByText("게시일")).toBeTruthy();
    expect(screen.getByText("확인일")).toBeTruthy();
    expect(screen.queryByText("마감 상태")).toBeNull();
  });

  it("keeps status badge labels and aria names Korean", () => {
    render(
      <>
        <StatusBadge kind="deadline" status="active" />
        <StatusBadge kind="deadline" status="unknown" />
        <StatusBadge kind="source" label="ERICA 취업게시판" />
        <StatusBadge kind="privacy" storageScope="session" rankingEnabled />
        <LoadingState statusText="관련 출처를 확인하고 답변을 준비하고 있어요…" />
      </>,
    );

    expect(screen.getByLabelText("마감 상태: 모집중")).toBeTruthy();
    expect(screen.getByLabelText("마감 상태: 마감일 확인 필요")).toBeTruthy();
    expect(screen.getByLabelText("출처: ERICA 취업게시판")).toBeTruthy();
    expect(screen.getByLabelText("저장 범위: 현재 세션에만 저장 · 입력한 조건")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("관련 출처를 확인하고 답변을 준비하고 있어요");
  });
});
