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
  for (const dir of ["app", "app/consultation", "components/dashboard", "components/chat", "components/citations", "lib"]) mkdirSync(join(root, dir), { recursive: true });
  return root;
}

function writeFixture(root: string, valid: boolean) {
  writeFileSync(join(root, "app/layout.tsx"), '<html lang="ko"></html>');
  writeFileSync(join(root, "app/globals.css"), '--color-primary --color-canvas Pretendard Noto Sans KR sans-serif --font-body');
  writeFileSync(join(root, "app/page.tsx"), "커리어 상담");
  writeFileSync(join(root, "app/consultation/page.tsx"), valid ? "어떤 점이 궁금하신가요 답변에 참고한 정보 fetchRecommendations clearPreferences" : "어떤 점이 궁금하신가요 SSO");
  writeFileSync(join(root, "components/chat/chat-message-list.tsx"), "어떤 점이 궁금하신가요?");
  writeFileSync(join(root, "components/chat/chat-composer.tsx"), "질문 보내기");
  writeFileSync(join(root, "components/chat/answer-attached-evidence.tsx"), "답변에 참고한 정보");
  writeFileSync(join(root, "components/citations/source-card.tsx"), "답변 근거 noopener noreferrer");
  writeFileSync(join(root, "components/citations/mobile-source-sheet.tsx"), "답변 출처");
  writeFileSync(join(root, "lib/deadline-labels.ts"), "모집중 마감됨 마감일 확인 필요 답변 근거 부족 확인 필요");
}
