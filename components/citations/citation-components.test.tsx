/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CitationTrigger } from "./citation-trigger.js";
import { InlineCitationMarker } from "./inline-citation-marker.js";
import { MobileSourceSheet } from "./mobile-source-sheet.js";
import { SourceInspectionRail } from "./source-inspection-rail.js";

const citation = { citation_id: 1, chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "채용 공고", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active" as const, page_number: 3 };

describe("citation inspection components", () => {
  afterEach(() => cleanup());
  it("opens inline marker as keyboard button without navigation", async () => {
    const onOpen = vi.fn();
    render(<InlineCitationMarker citation={citation} scopedCitations={[citation]} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "1번 출처 보기" }));
    expect(onOpen).toHaveBeenCalledWith(citation, [citation], expect.any(HTMLButtonElement));
  });

  it("renders citation trigger with count-based Korean label", () => {
    const onOpen = vi.fn();
    render(<CitationTrigger count={2} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "근거 보기 (2개)" }));
    expect(onOpen).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });

  it("renders desktop source rail metadata and safe official link", () => {
    render(<SourceInspectionRail citations={[citation]} selectedCitation={citation} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "답변 출처" })).toBeTruthy();
    expect(screen.getByLabelText("답변 출처")).toBeTruthy();
    expect(screen.getByText("답변 근거")).toBeTruthy();
    expect(screen.getByText("출처: ERICA 취업게시판")).toBeTruthy();
    expect(screen.getByText("확인일")).toBeTruthy();
    expect(screen.getByText("2026-05-03")).toBeTruthy();
    expect(screen.getByText("게시일")).toBeTruthy();
    expect(screen.getByText("2026-05-01")).toBeTruthy();
    expect(screen.getAllByText("example.edu").length).toBeGreaterThan(0);
    expect(screen.getByText("페이지")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByLabelText("마감 상태: 모집중")).toBeTruthy();
    expect(screen.queryByText(/source_id|chunk_id|ibus/u)).toBeNull();
    const link = screen.getByRole("link", { name: "채용 공고 원문 보기 새 창으로 열기" });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renders mobile source sheet close first and restores focus on Escape", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    const onClose = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(true);
      return <MobileSourceSheet open={open} citations={[citation]} selectedCitation={citation} opener={opener} onClose={() => { onClose(); setOpen(false); }} />;
    }
    render(<Harness />);
    const close = screen.getByRole("button", { name: "닫기" });
    await waitFor(() => expect(document.activeElement).toBe(close));
    expect(screen.getByRole("dialog", { name: "답변 출처" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("renders mobile source sheet metadata without internal identifiers", () => {
    render(<MobileSourceSheet open citations={[citation]} selectedCitation={citation} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "답변 출처" })).toBeTruthy();
    expect(screen.getByText("출처: ERICA 취업게시판")).toBeTruthy();
    expect(screen.getByText("마감 상태")).toBeTruthy();
    expect(screen.queryByText(/source_id|chunk_id|record_id|trace_id|ibus/u)).toBeNull();
  });
});
