import { expect, test } from "@playwright/test";

const citation = { citation_id: 1, chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "채용 공고", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active" };
const recommendation = { recommendation_id: "rec-1", chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "백엔드 인턴", category: "jobs", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active", score: 0.9, match_strength: "personalized_match", match_reasons: ["전공 조건과 연결됩니다 [1]"], score_breakdown: { base_retrieval_score: 0.5, major_match_score: 0.2, target_role_match_score: 0.1, optional_preference_score: 0, source_quality_score: 0.1, freshness_score: 0, final_score: 0.9 }, citations: [citation] };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/chat", async (route) => route.fulfill({ json: { answer: "채용 공고입니다 [1]", citations: [citation], refusal_tier: "normal_answer", confidence: 0.8, trace_id: "trace-chat" } }));
  await page.route("**/api/recommendations", async (route) => route.fulfill({ json: { recommendations: [recommendation], generated_at: "2026-05-03T00:00:00.000Z", trace_id: "trace-rec", preference_mode: "preference", privacy_metadata: { preference_ranking_enabled: true, profile_source: "preference_service", storage_scope: "session" } } }));
  await page.route("**/api/preferences**", async (route) => route.fulfill({ json: { preference_ranking_enabled: false, profile: null, storage_scope: "none" } }));
});

test("desktop 1280 shows safety disclaimer on consultation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/consultation");

  await expect(page.getByText("참고용 안내")).toBeVisible();
  await expect(page.getByText("공식 출처 페이지에서 확인")).toBeVisible();
  await expect(page.getByText("공식 한양대학교 인증 서비스가 아님")).toBeVisible();
  await expect(page.getByText("취업 결과를 보장하지 않습니다")).toBeVisible();
  await expect(page.getByText(/공식 한양대학교 인증 서비스입니다|취업 결과를 보장합니다/u)).toHaveCount(0);

  await page.getByLabel("질문 입력").fill("채용 공고 알려줘");
  await page.getByRole("button", { name: "질문 보내기" }).click();
  await page.getByRole("button", { name: "1번 출처 보기" }).click();
  await expect(page.getByText("출처: ERICA 취업게시판").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /원문 보기/u }).first()).toHaveAttribute("href", "https://example.edu/jobs");
});

test("mobile 390 shows disclaimer while citation and privacy controls remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/consultation");

  await expect(page.getByLabel("안전 안내")).toBeVisible();
  await expect(page.getByText("참고용 안내")).toBeVisible();
  await expect(page.getByText(/공식 한양대학교 인증 서비스입니다|취업 결과를 보장합니다/u)).toHaveCount(0);

  await page.getByLabel("질문 입력").fill("채용 공고 알려줘");
  await page.getByRole("button", { name: "질문 보내기" }).click();
  await page.getByRole("button", { name: "1번 출처 보기" }).click();
  await expect(page.getByRole("dialog", { name: "답변 출처" })).toBeVisible();
});
