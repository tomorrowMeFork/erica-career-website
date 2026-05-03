import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { verifyPhase5Ui } from "./verify-phase5-ui.js";

describe("verifyPhase5Ui", () => {
  it("passes when required Korean strings and tokens are present", () => {
    const root = fixtureRoot();
    writeFixture(root, true);
    expect(verifyPhase5Ui(root)).toMatchObject({ ok: true, failures: [] });
  });

  it("fails when required labels or prohibited scope appear", () => {
    const root = fixtureRoot();
    writeFixture(root, false);
    const result = verifyPhase5Ui(root);
    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain("prohibited Phase 5 scope token");
  });
});

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "phase5-ui-"));
  for (const dir of ["app", "components/dashboard", "components/chat", "components/citations", "lib"]) mkdirSync(join(root, dir), { recursive: true });
  return root;
}

function writeFixture(root: string, valid: boolean) {
  writeFileSync(join(root, "app/layout.tsx"), '<html lang="ko"></html>');
  writeFileSync(join(root, "app/globals.css"), 'oklch(0.99 0.004 250) oklch(0.48 0.13 252) Pretendard Noto Sans KR Apple SD Gothic Neo 280px 360px 400px 1440px');
  writeFileSync(join(root, "components/dashboard/student-dashboard.tsx"), valid ? "무엇을 도와드릴까요? 현재 세션에만 저장 fetchRecommendations clearPreferences" : "무엇을 도와드릴까요? SSO");
  writeFileSync(join(root, "components/chat/chat-composer.tsx"), "질문 보내기");
  writeFileSync(join(root, "components/citations/source-card.tsx"), "공식 페이지 열기 noopener noreferrer");
  writeFileSync(join(root, "lib/deadline-labels.ts"), "모집중 마감됨 마감일 확인 필요 답변 근거 부족 확인 필요");
}
