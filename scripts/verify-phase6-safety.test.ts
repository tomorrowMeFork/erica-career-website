import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { verifyPhase6Safety } from "./verify-phase6-safety.js";

describe("verifyPhase6Safety", () => {
  it("passes when Korean disclaimer, source verification, and safe scripts exist", () => {
    const root = fixtureRoot();
    writeFixture(root, { valid: true });

    expect(verifyPhase6Safety(root)).toMatchObject({ ok: true, failures: [] });
  });

  it("fails when disclaimer copy is absent", () => {
    const root = fixtureRoot();
    writeFixture(root, { valid: true, disclaimer: "채팅 안내" });

    const result = verifyPhase6Safety(root);

    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain("Korean informational disclaimer");
  });

  it("fails on official endorsement or guaranteed-outcome claims", () => {
    const root = fixtureRoot();
    writeFixture(root, { valid: true, extraDashboard: "공식 한양대학교 인증 서비스입니다. 취업 결과를 보장합니다." });

    const result = verifyPhase6Safety(root);

    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain("official endorsement claim");
    expect(result.failures.join("\n")).toContain("guaranteed outcome claim");
  });

  it("fails on env/secret-like references and prohibited Phase 6 scope", () => {
    const root = fixtureRoot();
    writeFixture(root, {
      valid: true,
      extraDashboard: "process.env.OPENAI_COMPAT_API_KEY apiKey='secret-test-key-12345' SSO production crawling saved jobs resume tooling private/authenticated crawling",
    });

    const result = verifyPhase6Safety(root);

    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain("environment value reference");
    expect(result.failures.join("\n")).toContain("secret-like literal");
    expect(result.failures.join("\n")).toContain("SSO scope token");
    expect(result.failures.join("\n")).toContain("production crawling scope token");
  });
});

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "phase6-safety-"));
  for (const dir of ["components/safety", "components/dashboard", "components/citations", "scripts", "app/consultation", "app", "lib"]) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  return root;
}

function writeFixture(root: string, options: { valid: boolean; disclaimer?: string; extraDashboard?: string }) {
  const disclaimer = options.disclaimer ?? "참고용 안내 공식 출처 페이지에서 확인 공식 한양대학교 인증 서비스가 아님 취업 결과를 보장하지 않";
  writeFileSync(join(root, "components/safety/disclaimer-notice.tsx"), options.valid ? disclaimer : "참고 안내");
  writeFileSync(join(root, "app/consultation/page.tsx"), `import { DisclaimerNotice } from "../../components/safety/disclaimer-notice.js"; <DisclaimerNotice /> ${options.extraDashboard ?? ""}`);
  writeFileSync(join(root, "components/citations/source-card.tsx"), "공식 페이지 열기 noopener noreferrer");
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { "verify:phase6-safety": "tsx scripts/verify-phase6-safety.ts" } }));
}
