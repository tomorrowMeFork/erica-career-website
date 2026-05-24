import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

const evidenceDir = resolve(process.cwd(), ".omo/evidence");

const citation = {
  citation_id: 1,
  chunk_id: "chunk-1",
  record_id: "record-1",
  source_id: "ibus",
  title: "채용 공고",
  url: "https://example.edu/jobs",
  fetched_at: "2026-05-03T00:00:00.000Z",
  posted_at: "2026-05-01T00:00:00.000Z",
  deadline_status: "active",
  page_number: 12,
} as const;

const recommendation = {
  recommendation_id: "rec-1",
  chunk_id: "chunk-1",
  record_id: "record-1",
  source_id: "ibus",
  title: "백엔드 인턴",
  category: "jobs",
  url: "https://example.edu/intern",
  fetched_at: "2026-05-03T00:00:00.000Z",
  posted_at: "2026-05-01T00:00:00.000Z",
  deadline_status: "active",
  score: 0.9,
  match_strength: "personalized_match",
  match_reasons: ["전공 조건과 연결됩니다 [1]"],
  score_breakdown: {
    base_retrieval_score: 0.5,
    major_match_score: 0.2,
    target_role_match_score: 0.1,
    optional_preference_score: 0,
    source_quality_score: 0.1,
    freshness_score: 0,
    final_score: 0.9,
  },
  citations: [citation],
} as const;

const normalChatResponse = {
  answer: "컴퓨터공학과 인턴 공고입니다 [1]",
  citations: [citation],
  refusal_tier: "normal_answer",
  confidence: 0.8,
  trace_id: "trace-chat",
} as const;

const recommendationResponse = {
  recommendations: [recommendation],
  generated_at: "2026-05-03T00:00:00.000Z",
  trace_id: "trace-rec",
  preference_mode: "preference",
  privacy_metadata: {
    preference_ranking_enabled: true,
    profile_source: "preference_service",
    storage_scope: "session",
  },
} as const;

const emptyPreferenceState = {
  preference_ranking_enabled: false,
  profile: null,
  storage_scope: "none",
} as const;

test.beforeEach(() => {
  mkdirSync(resolve(process.cwd(), ".omo/evidence"), { recursive: true });
});

async function mockBaseRoutes(page: Page) {
  await page.route("**/api/chat", async (route) =>
    route.fulfill({ json: normalChatResponse }),
  );
  await page.route("**/api/recommendations", async (route) =>
    route.fulfill({ json: recommendationResponse }),
  );
  await page.route("**/api/preferences**", async (route) =>
    route.fulfill({ json: emptyPreferenceState }),
  );
}

async function askQuestion(page: Page) {
  await page.getByLabel("질문 입력").fill("컴퓨터공학과 인턴 알려줘");
  await page.getByRole("button", { name: "질문 보내기" }).click();
  await expect(page.getByText("컴퓨터공학과 인턴 공고입니다")).toBeVisible();
}

async function captureEvidence(page: Page, fileName: string) {
  await page.screenshot({
    path: resolve(evidenceDir, fileName),
    fullPage: true,
  });
}

function parseBackgroundAlpha(backgroundColor: string): number {
  if (backgroundColor.startsWith("rgb(")) return 1;
  const rgbaMatch = backgroundColor.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/u);
  if (rgbaMatch !== null) return Number(rgbaMatch[1]);
  return 1;
}

async function expectReadableSurface(locator: Locator, label: string) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  const styles = await locator.evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return {
      backgroundColor: computed.backgroundColor,
      borderTopLeftRadius: computed.borderTopLeftRadius,
      boxShadow: computed.boxShadow,
    };
  });
  expect(
    parseBackgroundAlpha(styles.backgroundColor),
    `${label} background alpha should stay readable`,
  ).toBeGreaterThanOrEqual(0.68);
  expect(styles.boxShadow, `${label} should keep an elevation shadow`).not.toBe(
    "none",
  );
  expect(
    Number.parseFloat(styles.borderTopLeftRadius),
    `${label} should keep the 22px rounded surface radius`,
  ).toBeGreaterThanOrEqual(21.5);
}

async function assertNoHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
}

test("desktop consultation keeps readable card surfaces", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only readability coverage");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockBaseRoutes(page);

  await page.goto("/consultation");
  await askQuestion(page);
  await page.getByRole("button", { name: "1번 출처 보기" }).click();

  const hero = page.locator("[aria-labelledby='consultationTitle']");
  const chat = page.getByLabel("채팅");
  const disclaimer = page.getByLabel("안전 안내");
  const answer = page
    .getByRole("article", { name: "출처 기반 답변" })
    .locator(".erica-surface-strong");
  const composer = page.locator("form .erica-surface");
  const sourceCard = page.getByRole("article", { name: "채용 공고 출처 카드" });

  await expectReadableSurface(hero, "hero");
  await expectReadableSurface(disclaimer, "safety notice");
  await expectReadableSurface(chat, "chat");
  await expectReadableSurface(answer, "answer");
  await expectReadableSurface(composer, "composer");
  await expectReadableSurface(sourceCard, "source card");
  await expect(sourceCard.getByLabel("출처: ERICA 취업게시판")).toBeVisible();
  await expect(
    page.getByText("답변에 연결된 근거를 확인하고 원문으로 이동할 수 있어요."),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => window.getComputedStyle(document.body).backgroundImage),
    )
    .toContain("radial-gradient");
  await captureEvidence(page, "task-6-ui-readability-desktop.png");
});

test("mobile consultation keeps citation sheet readable without overflow", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only readability coverage");
  await page.setViewportSize({ width: 390, height: 844 });
  await mockBaseRoutes(page);

  await page.goto("/consultation");
  await expect(page.getByLabel("질문 입력")).toBeVisible();
  await askQuestion(page);
  await page.getByRole("button", { name: "1번 출처 보기" }).click();

  const dialog = page.getByRole("dialog", { name: "답변 출처" });
  const sourceCard = dialog.getByRole("article", { name: "채용 공고 출처 카드" });
  await expect(dialog).toBeVisible();
  await expect(sourceCard).toBeVisible();
  await expect(sourceCard.getByLabel("출처: ERICA 취업게시판")).toBeVisible();
  await expect(sourceCard.getByText("채용 공고", { exact: true })).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await captureEvidence(page, "task-6-ui-readability-mobile.png");
});
