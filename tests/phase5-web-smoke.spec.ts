import { expect, test } from "@playwright/test";

const citation = { citation_id: 1, chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "채용 공고", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active" };
const recommendation = { recommendation_id: "rec-1", chunk_id: "chunk-1", record_id: "record-1", source_id: "ibus", title: "백엔드 인턴", category: "jobs", url: "https://example.edu/jobs", fetched_at: "2026-05-03T00:00:00.000Z", posted_at: "2026-05-01T00:00:00.000Z", deadline_status: "active", score: 0.9, match_strength: "personalized_match", match_reasons: ["전공 조건과 연결됩니다 [1]"], score_breakdown: { base_retrieval_score: 0.5, major_match_score: 0.2, target_role_match_score: 0.1, optional_preference_score: 0, source_quality_score: 0.1, freshness_score: 0, final_score: 0.9 }, citations: [citation] };
const sessionReferencesFixture = {
  _v: 1,
  items: [
    {
      url: "https://www.hanyang.ac.kr/career/example",
      title: "ERICA 현장실습 모집",
      sourceLabel: "한양대학교 ERICA",
      postedAt: "2026-05-01",
      fetchedAt: "2026-05-04",
      deadlineStatus: "open",
      firstReferencedAt: "2026-05-04T09:00:00.000Z",
      lastReferencedAt: "2026-05-04T09:00:00.000Z",
      referenceCount: 1,
      lastQuery: "컴퓨터공학과 현장실습 알려줘",
    },
  ],
};
const forbiddenRenderedStrings = ["정보 둘러보기", "정보 더 둘러보기", "홈", "source_id", "chunk_id", "trace_id", "record_id", "수집일", "score", "점수", "상담 기록"];

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

test("source detail deep link shows user-facing copy and consultation CTA", async ({ page }) => {
  await page.goto("/source/example");
  await expect(page.getByRole("heading", { name: "출처 상세" })).toBeVisible();
  await expect(page.getByText("이 정보의 원문 출처를 확인하세요.")).toBeVisible();
  await expect(page.getByRole("link", { name: "이 정보에 대해 질문하기" })).toBeVisible();
});

test("no forbidden raw or internal labels visible across routes", async ({ page }) => {
  for (const path of ["/", "/consultation", "/source/example"]) {
    await page.goto(path);
    for (const forbidden of ["source_id", "chunk_id", "trace_id", "Career Consultation", "Information Explore", "Collected Information", "Source Verification"]) {
      await expect(page.getByText(forbidden, { exact: false })).toHaveCount(0);
    }
  }
});

test("primary navigation points to consultation, references, and settings only", async ({ page }) => {
  await page.goto("/");
  const navs = [page.locator('nav[aria-label="주요 페이지"]'), page.locator('nav[aria-label="모바일 주요 페이지"]')];

  for (const nav of navs) {
    await expect(nav.locator('a[href="/consultation"]').filter({ hasText: "커리어 상담" })).toHaveCount(1);
    await expect(nav.locator('a[href="/references"]').filter({ hasText: "참고한 정보" })).toHaveCount(1);
    await expect(nav.locator('a[href="/settings"]').filter({ hasText: "설정" })).toHaveCount(1);
    await expect(nav.locator("a")).toHaveCount(3);
    await expect(nav.getByText("출처 확인")).toHaveCount(0);
    await expect(nav.getByText("정보 둘러보기", { exact: true })).toHaveCount(0);
    await expect(nav.getByText("홈", { exact: true })).toHaveCount(0);
  }
});

test("primary navigation active state is exact-match only", async ({ page }) => {
  const navs = [page.locator('nav[aria-label="주요 페이지"]'), page.locator('nav[aria-label="모바일 주요 페이지"]')];

  for (const path of ["/", "/source/example", "/explore"]) {
    await page.goto(path);
    for (const nav of navs) {
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
    }
  }

  for (const path of ["/consultation", "/references", "/settings"]) {
    await page.goto(path);
    for (const nav of navs) {
      await expect(nav.locator('[aria-current="page"]')).toHaveAttribute("href", path);
    }
  }
});

test.describe.skip("references-first redesign contract", () => {
  test("primary navigation uses consultation, references, and settings", async ({ page }) => {
    await page.goto("/");
    const desktopNav = page.getByRole("navigation", { name: "주요 페이지" });
    await expect(desktopNav.getByRole("link", { name: "커리어 상담" })).toHaveAttribute("href", "/consultation");
    await expect(desktopNav.getByRole("link", { name: "참고한 정보" })).toHaveAttribute("href", "/references");
    await expect(desktopNav.getByRole("link", { name: "설정" })).toHaveAttribute("href", "/settings");
    await expect(desktopNav.getByText("정보 둘러보기", { exact: true })).toHaveCount(0);
    await expect(desktopNav.getByText("홈", { exact: true })).toHaveCount(0);
  });

  test("references empty state explains that citations appear after consultation", async ({ page }) => {
    let recommendationApiCalled = false;
    await page.route("**/api/recommendations**", async (route) => {
      recommendationApiCalled = true;
      await route.abort();
    });
    await page.goto("/references");
    await expect(page.getByRole("heading", { name: "참고한 정보" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "아직 참고한 정보가 없습니다" })).toBeVisible();
    await expect(page.getByRole("link", { name: "커리어 상담 시작하기" })).toHaveAttribute("href", "/consultation");
    expect(recommendationApiCalled, "/references must read sessionStorage without calling /api/recommendations").toBe(false);
  });

  test("references populated state renders sessionStorage fixture without recommendations API", async ({ page }) => {
    let recommendationApiCalled = false;
    await page.route("**/api/recommendations**", async (route) => {
      recommendationApiCalled = true;
      await route.abort();
    });
    await page.context().addInitScript((referencesJson) => {
      window.sessionStorage.setItem("erica-career-chat:session-references", referencesJson);
    }, JSON.stringify(sessionReferencesFixture));

    await page.goto("/references");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "참고한 정보" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ERICA 현장실습 모집" })).toHaveAttribute("href", "https://www.hanyang.ac.kr/career/example");
    await expect(page.getByText("한양대학교 ERICA")).toBeVisible();
    await expect(page.getByText("게시일 2026-05-01")).toBeVisible();
    await expect(page.getByText("확인일 2026-05-04")).toBeVisible();
    await expect(page.getByText("1회 참고")).toBeVisible();
    await expect(page.getByText("컴퓨터공학과 현장실습 알려줘")).toBeVisible();
    expect(recommendationApiCalled, "/references must not fetch /api/recommendations for stored references").toBe(false);
  });

  test("explore remains compatible by redirecting to references", async ({ page }) => {
    await page.goto("/explore");
    await expect(page).toHaveURL(/\/references$/u);
    await expect(page.getByRole("heading", { name: "참고한 정보" })).toBeVisible();
  });

  test("consultation starts without empty source placeholder and keeps preferences collapsed", async ({ page }) => {
    await page.goto("/consultation");
    await expect(page.getByText("출처 확인하기", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "추천 조건 열기" })).toBeVisible();
    await expect(page.getByLabel("상담 조건")).toBeHidden();
  });

  test("target routes hide broad-browse copy, fake history, raw IDs, collection dates, and score labels", async ({ page }) => {
    for (const path of ["/", "/consultation", "/references", "/source/example"]) {
      await page.goto(path);
      for (const forbidden of forbiddenRenderedStrings) {
        await expect(page.getByText(forbidden, { exact: false })).toHaveCount(0);
      }
    }
  });
});
