/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PreferencePanel } from "./preference-panel.js";
import { SettingsMenu } from "./settings-menu.js";
import { StorageScopeChip } from "./storage-scope-chip.js";

describe("preference components", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => cleanup());
  it("shows required fields first and enables save only when complete", async () => {
    const onSet = vi.fn();
    render(<PreferencePanel state={{ preference_ranking_enabled: false, profile: null, storage_scope: "none" }} sessionKey="session-a" onSet={onSet} onUpdate={vi.fn()} onClear={vi.fn()} onRead={vi.fn()} />);
    expect(screen.getByLabelText("전공")).toBeTruthy();
    expect(screen.getByLabelText("희망 직무")).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "추천 조건 저장" }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("전공"), { target: { value: "컴퓨터학부" } });
    fireEvent.change(screen.getByLabelText("희망 직무"), { target: { value: "백엔드 개발자" } });
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "추천 조건 저장" }).disabled).toBe(false);
    const optionalTrigger = screen.getByRole("button", { name: "선택 조건 더보기" });
    expect(optionalTrigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(optionalTrigger);
    expect(optionalTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/현재 세션 전용/u)).toBeTruthy();
  });

  it("includes controlled optional fields in save payloads", () => {
    const onSet = vi.fn();
    render(<PreferencePanel state={{ preference_ranking_enabled: false, profile: null, storage_scope: "none" }} sessionKey="session-a" onSet={onSet} onUpdate={vi.fn()} onClear={vi.fn()} onRead={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("전공"), { target: { value: "컴퓨터학부" } });
    fireEvent.change(screen.getByLabelText("희망 직무"), { target: { value: "백엔드 개발자" } });
    fireEvent.click(screen.getByRole("button", { name: "선택 조건 더보기" }));
    fireEvent.change(screen.getByLabelText("산업"), { target: { value: "IT, 교육" } });
    fireEvent.change(screen.getByLabelText("지역"), { target: { value: "서울" } });
    fireEvent.change(screen.getByLabelText("고용 형태"), { target: { value: "인턴" } });
    fireEvent.click(screen.getByRole("combobox", { name: "마감 민감도" }));
    fireEvent.click(screen.getByRole("option", { name: "마감 임박 우선" }));
    fireEvent.change(screen.getByLabelText("추가 메모"), { target: { value: "현장실습 선호" } });
    fireEvent.click(screen.getByRole("button", { name: "추천 조건 저장" }));
    expect(onSet).toHaveBeenCalledWith("session-a", {
      major: "컴퓨터학부",
      target_role: "백엔드 개발자",
      industry: ["IT", "교육"],
      region: ["서울"],
      employment_type: ["인턴"],
      deadline_sensitivity: "urgent_first",
      session_only_optional_text: "현장실습 선호",
    });
  });

  it("shows storage labels and safe settings confirmations", async () => {
    const onClearPreferences = vi.fn();
    const onClearChatHistory = vi.fn();
    render(<><StorageScopeChip storageScope="session" rankingEnabled /><StorageScopeChip storageScope="none" /><StorageScopeChip storageScope="persistent" /><SettingsMenu onClearPreferences={onClearPreferences} onClearChatHistory={onClearChatHistory} /></>);
    expect(screen.getByText(/현재 세션에만 저장/u)).toBeTruthy();
    expect(screen.getAllByText("저장 안 함").length).toBeGreaterThan(0);
    expect(screen.getByText("동의 후 저장")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("button", { name: "설정" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitem", { name: "추천 조건 지우기" }));
    expect(screen.getByText("현재 세션의 추천 조건을 지울까요? 맞춤 추천이 꺼지고 기본 추천으로 돌아갑니다.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onClearPreferences).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("button", { name: "설정" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitem", { name: "대화 기록 지우기" }));
    expect(screen.getByText("현재 브라우저 세션의 대화 기록을 지울까요? 서버에는 저장되지 않습니다.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "대화 기록 지우기" }));
    expect(onClearChatHistory).toHaveBeenCalledTimes(1);
  });
});
