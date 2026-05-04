import { expect, test } from "@playwright/test";

const citation = { citation_id: 1, chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "채용 공고", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active" };
const recommendation = { recommendation_id: "rec-1", chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "백엔드 인턴", category: "jobs", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active", score: 0.9, match_strength: "personalized_match", match_reasons: ["전공 조건과 연결됩니다 [1]"], score_breakdown: { base_retrieval_score: 0.5, major_match_score: 0.2, target_role_match_score: 0.1, optional_preference_score: 0, source_quality_score: 0.1, freshness_score: 0, final_score: 0.9 }, citations: [citation] };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/chat", async (route) => route.fulfill({ json: { answer: "채용 공고입니다 [1]", citations: [citation], refusal_tier: "normal_answer", confidence: 0.8, trace_id: "trace-chat" } }));
  await page.route("**/api/recommendations", async (route) => route.fulfill({ json: { recommendations: [recommendation], generated_at: "2026-05-03T00:00:00.000Z", trace_id: "trace-rec", preference_mode: "preference", privacy_metadata: { preference_ranking_enabled: true, profile_source: "preference_service", storage_scope: "session" } } }));
  await page.route("**/api/preferences**", async (route) => route.fulfill({ json: { preference_ranking_enabled: false, profile: null, storage_scope: "none" } }));
});

test("home shows consultation entry point with Korean copy", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "커리어 상담" })).toBeVisible();
  await expect(page.getByText("ERICA의 확인된 커리어 정보를 바탕으로 질문에 답해드려요.")).toBeVisible();
  await expect(page.getByRole("link", { name: "커리어 상담 시작하기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "정보 둘러보기" }).first()).toBeVisible();
  await expect(page.getByText("답변 근거")).toBeVisible();
  await expect(page.getByText("마감 확인")).toBeVisible();
});

test("consultation desktop 1280 shows chat flow, evidence, and preferences", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/consultation");
  await expect(page.getByRole("heading", { name: "커리어 상담" })).toBeVisible();
  await expect(page.getByText("어떤 점이 궁금하신가요?")).toBeVisible();
  await expect(page.locator('[aria-label="상담 조건"]')).toBeVisible();
  await page.getByLabel("질문 입력").fill("채용 공고 알려줘");
  await page.getByRole("button", { name: "질문 보내기" }).click();
  await expect(page.getByText("채용 공고입니다")).toBeVisible();
  await expect(page.getByRole("heading", { name: "답변에 참고한 정보" })).toBeVisible();
  await expect(page.getByRole("button", { name: "1번 출처 보기" })).toBeVisible();
  await page.getByRole("button", { name: "1번 출처 보기" }).click();
  await expect(page.getByText("출처: ERICA 취업게시판").first()).toBeVisible();
});

test("consultation mobile 390 opens source sheet and restores focus on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/consultation");
  await expect(page.getByLabel("채팅")).toBeVisible();
  await expect(page.getByText("어떤 점이 궁금하신가요?")).toBeVisible();
  await page.getByLabel("질문 입력").fill("채용 공고 알려줘");
  await page.getByRole("button", { name: "질문 보내기" }).click();
  await page.getByRole("button", { name: "1번 출처 보기" }).click();
  await expect(page.getByRole("dialog", { name: "답변 출처" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "답변 출처" })).toBeHidden();
});

test("explore shows auxiliary information browsing", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: "정보 둘러보기" })).toBeVisible();
  await expect(page.getByText("ERICA 공고와 프로그램을 한눈에 살펴볼 수 있어요.")).toBeVisible();
});

test("source detail deep link shows user-facing copy and consultation CTA", async ({ page }) => {
  await page.goto("/source/example");
  await expect(page.getByRole("heading", { name: "출처 상세" })).toBeVisible();
  await expect(page.getByText("이 정보의 원문 출처를 확인하세요.")).toBeVisible();
  await expect(page.getByRole("link", { name: "이 정보에 대해 질문하기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "정보 더 둘러보기" })).toBeVisible();
});

test("no forbidden raw or internal labels visible across routes", async ({ page }) => {
  for (const path of ["/", "/consultation", "/explore", "/source/example"]) {
    await page.goto(path);
    for (const forbidden of ["source_id", "chunk_id", "trace_id", "Career Consultation", "Information Explore", "Collected Information", "Source Verification"]) {
      await expect(page.getByText(forbidden, { exact: false })).toHaveCount(0);
    }
  }
});

test("no 출처 확인 in primary navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "주요 페이지" }).getByText("출처 확인")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "모바일 주요 페이지" }).getByText("출처 확인")).toHaveCount(0);
});
