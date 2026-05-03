import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InlineCitationMarker } from "./inline-citation-marker.js";
import { MobileSourceSheet } from "./mobile-source-sheet.js";
import { SourceInspectionRail } from "./source-inspection-rail.js";

const citation = { citation_id: 1, chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "채용 공고", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active" as const, page_number: 3 };

describe("citation inspection components", () => {
  afterEach(() => cleanup());
  it("opens inline marker as keyboard button without navigation", async () => {
    const onOpen = vi.fn();
    render(<InlineCitationMarker citationId={1} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "1번 출처 보기" }));
    expect(onOpen).toHaveBeenCalledWith(1, expect.any(HTMLButtonElement));
  });

  it("renders desktop source rail metadata and safe official link", () => {
    render(<SourceInspectionRail citations={[citation]} selectedCitationId={1} onClose={vi.fn()} />);
    expect(screen.getByText("공식 출처")).toBeTruthy();
    expect(screen.getByText("ibus · example.edu")).toBeTruthy();
    expect(screen.getByText("페이지: 3")).toBeTruthy();
    const link = screen.getByRole("link", { name: "채용 공고 공식 페이지 새 창으로 열기" });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renders mobile source sheet close first and restores focus on Escape", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    const onClose = vi.fn();
    render(<MobileSourceSheet open citations={[citation]} selectedCitationId={1} opener={opener} onClose={onClose} />);
    expect(screen.getByRole("button", { name: "닫기" }).textContent).toBe("닫기");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
