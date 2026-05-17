import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const evidenceDir = resolve(process.cwd(), ".sisyphus/evidence");

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
    {
      url: "https://cdp.hanyang.ac.kr/recruit/beta",
      title: "나노디그리 설명회",
      sourceLabel: "한양대학교 ERICA 커리어개발센터",
      postedAt: "2026-04-28",
      fetchedAt: "2026-05-04",
      deadlineStatus: "closed",
      firstReferencedAt: "2026-05-04T08:00:00.000Z",
      lastReferencedAt: "2026-05-04T10:00:00.000Z",
      referenceCount: 2,
      lastQuery: "설명회 알려줘",
    },
    {
      url: "https://ibus.hanyang.ac.kr/recruit/alpha",
      title: "가나다 채용 상담",
      sourceLabel: "ERICA 취업게시판",
      postedAt: null,
      fetchedAt: "2026-05-04",
      deadlineStatus: "unknown",
      firstReferencedAt: "2026-05-04T07:00:00.000Z",
      lastReferencedAt: "2026-05-04T09:00:00.000Z",
      referenceCount: 3,
      lastQuery: "채용 상담 알려줘",
    },
  ],
} as const;

const populatedPreferenceState = {
  preference_ranking_enabled: true,
  profile: {
    major: "컴퓨터공학",
    target_role: "백엔드 개발자",
    industry: ["IT"],
    region: ["서울"],
    employment_type: ["인턴"],
    deadline_sensitivity: "balanced",
  },
  storage_scope: "session",
} as const;

const normalChatResponse = {
  answer: "채용 공고입니다 [1]",
  citations: [citation],
  refusal_tier: "normal_answer",
  confidence: 0.8,
  trace_id: "trace-chat",
} as const;

const refusalChatResponse = {
  answer: "확인된 근거가 부족합니다.",
  citations: [],
  refusal_tier: "hard_refuse",
  confidence: 0,
  trace_id: "trace-refusal",
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

const emptyRecommendationResponse = {
  recommendations: [],
  generated_at: "2026-05-03T00:00:00.000Z",
  trace_id: "trace-empty-rec",
  preference_mode: "no_preference",
  privacy_metadata: {
    preference_ranking_enabled: false,
    profile_source: "none",
    storage_scope: "none",
  },
} as const;

const emptyPreferenceState = {
  preference_ranking_enabled: false,
  profile: null,
  storage_scope: "none",
} as const;

test.beforeEach(() => {
  mkdirSync(evidenceDir, { recursive: true });
});

async function mockBaseRoutes(
  page: Page,
  overrides?: {
    chatResponse?: typeof normalChatResponse | typeof refusalChatResponse;
    recommendationResponse?:
      | typeof recommendationResponse
      | typeof emptyRecommendationResponse;
    preferenceResponse?:
      | typeof populatedPreferenceState
      | typeof emptyPreferenceState;
  },
) {
  await page.route("**/api/chat", async (route) =>
    route.fulfill({ json: overrides?.chatResponse ?? normalChatResponse }),
  );
  await page.route("**/api/recommendations", async (route) =>
    route.fulfill({
      json: overrides?.recommendationResponse ?? recommendationResponse,
    }),
  );
  await page.route("**/api/preferences**", async (route) =>
    route.fulfill({
      json: overrides?.preferenceResponse ?? emptyPreferenceState,
    }),
  );
}

async function askQuestion(page: Page, question: string) {
  await page.getByLabel("질문 입력").fill(question);
  await page.getByRole("button", { name: "질문 보내기" }).click();
}

async function openSourceRail(page: Page) {
  await page.getByRole("button", { name: "1번 출처 보기" }).click();
  await expect(
    page.getByText("답변에 연결된 근거를 확인하고 원문으로 이동할 수 있어요."),
  ).toBeVisible();
}

async function assertNoInternalIds(page: Page) {
  await expect(
    page.getByText(
      /source_id|chunk_id|trace_id|record_id|score|점수|수집일|상담 기록/u,
    ),
  ).toHaveCount(0);
}

async function captureEvidence(page: Page, fileName: string) {
  await page.screenshot({
    path: resolve(evidenceDir, fileName),
    fullPage: true,
  });
}

async function assertNoHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
}

async function assertSingleMainLandmark(page: Page) {
  await expect(page.locator("main")).toHaveCount(1);
}

async function assertMobileComposerClearsBottomNav(page: Page) {
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const composer = document
          .querySelector("form")
          ?.getBoundingClientRect();
        const bottomNav = document
          .querySelector("nav[aria-label='모바일 주요 페이지']")
          ?.getBoundingClientRect();
        if (composer === undefined || bottomNav === undefined) return false;
        return composer.bottom <= bottomNav.top;
      }),
    )
    .toBe(true);
}

async function assertConsultationEmptyStateReadable(page: Page) {
  await expect
    .poll(async () =>
      page
        .getByText("어떤 점이 궁금하신가요?", { exact: true })
        .evaluate((heading) => {
          const box = heading.getBoundingClientRect();
          const style = window.getComputedStyle(heading);
          return (
            box.width >= 220 &&
            box.height <= 96 &&
            style.writingMode === "horizontal-tb"
          );
        }),
    )
    .toBe(true);
  await expect
    .poll(async () =>
      page
        .getByText(
          "공고 선택, 활동 비교, 지원 가능성처럼 지금 고민 중인 내용을 편하게 적어보세요.",
        )
        .evaluate((body) => {
          const box = body.getBoundingClientRect();
          return box.width >= 240 && box.height <= 96;
        }),
    )
    .toBe(true);
}

async function assertComposerDoesNotOverlapContent(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const composer = document
          .querySelector("form")
          ?.getBoundingClientRect();
        const chatCard = document
          .querySelector("[aria-label='채팅']")
          ?.getBoundingClientRect();
        if (composer === undefined || chatCard === undefined) return false;
        const contentElements = Array.from(
          document.querySelectorAll(
            "[aria-label='대화 기록'], [data-slot='card']",
          ),
        )
          .filter((element) => !element.closest("form"))
          .map((element) => element.getBoundingClientRect())
          .filter(
            (box) =>
              box.width > 0 &&
              box.height > 0 &&
              box.top >= chatCard.top &&
              box.bottom <= composer.top + 1,
          );
        if (contentElements.length === 0) return false;
        const lastContent = contentElements.reduce(
          (latest, box) => (box.bottom > latest.bottom ? box : latest),
          contentElements[0],
        );
        return lastContent.bottom <= composer.top + 1;
      }),
    )
    .toBe(true);
}

async function assertMobileNavClearsRouteContent(page: Page) {
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const bottomNav = document
          .querySelector("nav[aria-label='모바일 주요 페이지']")
          ?.getBoundingClientRect();
        const main = document.querySelector("main")?.getBoundingClientRect();
        if (bottomNav === undefined || main === undefined) return false;
        return main.bottom <= bottomNav.top;
      }),
    )
    .toBe(true);
}

async function assertSheetLayerAboveMobileChrome(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const dialog = document
          .querySelector("[role='dialog']")
          ?.getBoundingClientRect();
        const dialogElement = document.querySelector("[role='dialog']");
        if (dialog === undefined || dialogElement === null) return false;
        const dialogZ = Number.parseInt(
          window.getComputedStyle(dialogElement).zIndex,
          10,
        );
        const x = Math.min(
          window.innerWidth - 1,
          Math.max(1, dialog.left + dialog.width / 2),
        );
        const y = Math.min(
          window.innerHeight - 1,
          Math.max(1, dialog.top + Math.min(dialog.height - 1, 48)),
        );
        const topElement = document.elementFromPoint(x, y);
        return (
          dialogZ >= 60 &&
          topElement !== null &&
          dialogElement.contains(topElement)
        );
      }),
    )
    .toBe(true);
}

async function assertMetadataReadable(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const metadataElements = Array.from(
          document.querySelectorAll(
            "dt, dd, [aria-label^='출처:'], [aria-label^='마감 상태:']",
          ),
        );
        return metadataElements.every(
          (element) =>
            Number.parseFloat(window.getComputedStyle(element).fontSize) >= 14,
        );
      }),
    )
    .toBe(true);
}

test("responsive route sweep has no overflow and keeps metadata readable", async ({
  page,
}, testInfo) => {
  await mockBaseRoutes(page, { preferenceResponse: populatedPreferenceState });

  const routes = [
    { path: "/", slug: "home", heading: "커리어 상담" },
    { path: "/consultation", slug: "consultation", heading: "커리어 상담" },
    { path: "/references", slug: "references", heading: "참고한 정보" },
    { path: "/settings", slug: "settings", heading: "설정" },
    { path: "/source/example", slug: "source-example", heading: "출처 상세" },
  ] as const;

  await page.context().addInitScript((referencesJson) => {
    window.sessionStorage.setItem(
      "erica-career-chat:session-references",
      referencesJson,
    );
  }, JSON.stringify(sessionReferencesFixture));

  for (const route of routes) {
    await page.goto(route.path);
    await expect(
      page.getByRole("heading", { name: route.heading }).first(),
    ).toBeVisible();
    await assertSingleMainLandmark(page);
    await assertNoHorizontalOverflow(page);
    if (route.path === "/consultation") {
      await assertConsultationEmptyStateReadable(page);
      await assertComposerDoesNotOverlapContent(page);
      if (testInfo.project.name === "mobile")
        await assertMobileComposerClearsBottomNav(page);
    }
    if (testInfo.project.name === "mobile")
      await assertMobileNavClearsRouteContent(page);
    if (route.path === "/references" || route.path === "/source/example")
      await assertMetadataReadable(page);
    await captureEvidence(
      page,
      `task-15-${testInfo.project.name}-${route.slug}.png`,
    );
  }
});

test("desktop route states keep Korean-first copy, metadata, and safe links visible", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only route coverage");
  await mockBaseRoutes(page, { preferenceResponse: populatedPreferenceState });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "커리어 상담" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "커리어 상담 시작하기" }),
  ).toBeVisible();
  await expect(
    page.getByText("답변에 참고한 정보와 출처를 함께 보여드려요."),
  ).toBeVisible();
  await expect(
    page.getByText("공식 한양대학교 인증 서비스가 아님"),
  ).toBeVisible();
  await captureEvidence(page, `task-4-${testInfo.project.name}-home.png`);

  await page.goto("/consultation");
  await expect(
    page.getByRole("heading", { name: "커리어 상담" }),
  ).toBeVisible();
  await expect(page.getByLabel("안전 안내")).toBeVisible();
  await expect(page.getByText("현재 세션에만 저장")).toBeVisible();
  await expect(
    page.getByText("전공 컴퓨터공학 · 직무 백엔드 개발자"),
  ).toBeVisible();
  await page.getByRole("button", { name: "상담 조건 열기" }).click();
  await expect(
    page.getByRole("heading", { name: "입력한 조건" }),
  ).toBeVisible();
  await askQuestion(page, "채용 공고 알려줘");
  await expect(page.getByText("채용 공고입니다 [1]")).toBeVisible();
  await assertComposerDoesNotOverlapContent(page);
  await expect(
    page.getByRole("heading", { name: "답변에 참고한 정보" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "1번 출처 보기" }),
  ).toBeVisible();
  await openSourceRail(page);
  const rail = page.getByRole("article", { name: "채용 공고 출처 카드" });
  await expect(rail).toBeVisible();
  await expect(rail.getByText("출처", { exact: true })).toBeVisible();
  await expect(rail.getByLabel("출처: ERICA 취업게시판")).toBeVisible();
  await expect(rail.getByText("게시일", { exact: true })).toBeVisible();
  await expect(rail.getByText("2026-05-01", { exact: true })).toBeVisible();
  await expect(rail.getByText("확인일", { exact: true })).toBeVisible();
  await expect(rail.getByText("2026-05-03", { exact: true })).toBeVisible();
  await expect(rail.getByText("페이지", { exact: true })).toBeVisible();
  await expect(rail.getByText("12", { exact: true })).toBeVisible();
  await expect(rail.getByLabel("마감 상태: 모집중")).toBeVisible();
  await expect(
    rail.getByRole("link", { name: "채용 공고 원문 보기 새 창으로 열기" }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    rail.getByRole("link", { name: "채용 공고 원문 보기 새 창으로 열기" }),
  ).toHaveAttribute("rel", /noopener/);
  await captureEvidence(page, "task-7-chat-citation.png");
  await captureEvidence(
    page,
    `task-4-${testInfo.project.name}-consultation-source-rail.png`,
  );
  await assertNoInternalIds(page);

  await page.context().addInitScript((referencesJson) => {
    window.sessionStorage.setItem(
      "erica-career-chat:session-references",
      referencesJson,
    );
  }, JSON.stringify(sessionReferencesFixture));

  await page.goto("/references");
  await expect(
    page.getByRole("heading", { name: "참고한 정보" }),
  ).toBeVisible();
  await expect(
    page.getByText("이번 상담에서 답변에 참고된 출처와 공고만 모았어요."),
  ).toBeVisible();
  const referenceCard = page.getByRole("article", {
    name: "나노디그리 설명회 참고한 정보",
  });
  await expect(referenceCard).toBeVisible();
  await expect(
    page.getByRole("article", { name: "가나다 채용 상담 참고한 정보" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "ERICA 현장실습 모집 참고한 정보" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("출처: 한양대학교 ERICA 커리어개발센터").first(),
  ).toBeVisible();
  await expect(page.getByLabel("출처: ERICA 취업게시판").first()).toBeVisible();
  await expect(
    referenceCard.getByText("게시일", { exact: true }),
  ).toBeVisible();
  await expect(
    referenceCard.getByText("확인일", { exact: true }),
  ).toBeVisible();
  await expect(
    referenceCard.getByText("2회 참고", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "나노디그리 설명회 원문 열기 새 창으로 열기",
    }),
  ).toHaveAttribute("target", "_blank");
  await captureEvidence(page, `task-4-${testInfo.project.name}-references.png`);
  await assertNoInternalIds(page);

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "설정" })).toBeVisible();
  await expect(
    page.getByText("상담 조건과 저장 범위를 관리할 수 있어요."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "입력한 조건" }),
  ).toBeVisible();
  await expect(page.getByLabel("전공")).toHaveValue("컴퓨터공학");
  await expect(page.getByLabel("희망 직무")).toHaveValue("백엔드 개발자");
  await expect(
    page.getByText("현재 세션에만 저장 · 입력한 조건"),
  ).toBeVisible();
  await page.getByRole("button", { name: "선택 조건 더보기" }).click();
  await expect(
    page.getByText("선택 메모는 현재 세션 전용이며 영구 저장하지 않습니다."),
  ).toBeVisible();
  await captureEvidence(page, `task-4-${testInfo.project.name}-settings.png`);
  await assertNoInternalIds(page);

  await page.goto("/source/example");
  await expect(page.getByRole("heading", { name: "출처 상세" })).toBeVisible();
  await expect(page.getByText("원문 출처를 확인하세요.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "선택한 정보" }),
  ).toBeVisible();
  await expect(page.getByText("원문에서 확인")).toBeVisible();
  await expect(
    page.getByText("상담 답변의 출처 카드에서 연결된 원문"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "커리어 상담으로 돌아가기" }),
  ).toHaveAttribute("href", "/consultation");
  await captureEvidence(
    page,
    `task-4-${testInfo.project.name}-source-detail.png`,
  );
  await assertNoInternalIds(page);
});

test("desktop consultation happy path opens scoped citation", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "desktop-only consultation coverage",
  );
  await mockBaseRoutes(page, { preferenceResponse: populatedPreferenceState });

  await page.goto("/consultation");
  await expect(
    page.getByRole("heading", { name: "커리어 상담" }),
  ).toBeVisible();
  await askQuestion(page, "채용 공고 알려줘");
  await expect(page.getByText("채용 공고입니다 [1]")).toBeVisible();
  await assertComposerDoesNotOverlapContent(page);
  await expect(
    page.getByRole("heading", { name: "답변에 참고한 정보" }),
  ).toBeVisible();
  await openSourceRail(page);
  const sourceCard = page.getByRole("article", { name: "채용 공고 출처 카드" });
  await expect(sourceCard).toBeVisible();
  await expect(sourceCard.getByLabel("출처: ERICA 취업게시판")).toBeVisible();
  await expect(sourceCard.getByText("확인일", { exact: true })).toBeVisible();
  await expect(
    sourceCard.getByText("2026-05-03", { exact: true }),
  ).toBeVisible();
  await captureEvidence(page, "task-7-chat-citation.png");
  await assertNoInternalIds(page);
});

test("mid-width consultation source trigger opens readable source sheet", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "desktop project owns the 1024-1279px source breakpoint coverage",
  );
  await page.setViewportSize({ width: 1200, height: 900 });
  await mockBaseRoutes(page, { preferenceResponse: populatedPreferenceState });

  await page.goto("/consultation");
  await expect(
    page.getByRole("heading", { name: "커리어 상담" }),
  ).toBeVisible();
  await askQuestion(page, "채용 공고 알려줘");
  await expect(page.getByText("채용 공고입니다 [1]")).toBeVisible();
  await page.getByRole("button", { name: "1번 출처 보기" }).click();

  const dialog = page.getByRole("dialog", { name: "답변 출처" });
  await expect(dialog).toBeVisible();
  const sourceCard = dialog.getByRole("article", {
    name: "채용 공고 출처 카드",
  });
  await expect(sourceCard).toBeVisible();
  await expect(sourceCard.getByLabel("출처: ERICA 취업게시판")).toBeVisible();
  await expect(sourceCard.getByText("확인일", { exact: true })).toBeVisible();
  await expect(
    sourceCard.getByText("2026-05-03", { exact: true }),
  ).toBeVisible();
  await captureEvidence(page, "task-responsive-midwidth-source-sheet.png");
  await assertNoInternalIds(page);
});

test("desktop refusal keeps citations hidden and references empty", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "desktop-only refusal coverage",
  );
  await mockBaseRoutes(page, {
    chatResponse: refusalChatResponse,
    recommendationResponse: emptyRecommendationResponse,
    preferenceResponse: emptyPreferenceState,
  });

  await page.goto("/consultation");
  await askQuestion(page, "근거 없는 질문");
  await expect(page.getByText("확인된 근거가 부족합니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: /출처 보기/u })).toHaveCount(0);
  await captureEvidence(
    page,
    `task-4-${testInfo.project.name}-consultation-refusal.png`,
  );
  await assertNoInternalIds(page);

  await page.goto("/references");
  await expect(
    page.getByRole("heading", { name: "아직 참고한 정보가 없습니다" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "커리어 상담에서 질문하면 이 탭에서 답변에 참고한 출처와 공고를 확인할 수 있어요.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "커리어 상담 시작하기" }),
  ).toHaveAttribute("href", "/consultation");
  await captureEvidence(
    page,
    `task-4-${testInfo.project.name}-references-empty.png`,
  );
  await assertNoInternalIds(page);
});

test("mobile source sheet stays accessible and closes from the keyboard", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "mobile-only source sheet coverage",
  );
  await mockBaseRoutes(page, { preferenceResponse: populatedPreferenceState });

  await page.goto("/consultation");
  await expect(page.getByLabel("안전 안내")).toBeVisible();
  await askQuestion(page, "채용 공고 알려줘");
  await openSourceRail(page);
  const dialog = page.getByRole("dialog", { name: "답변 출처" });
  await expect(dialog).toBeVisible();
  await assertSheetLayerAboveMobileChrome(page);
  await expect(dialog.getByRole("button", { name: "닫기" })).toBeVisible();
  await captureEvidence(
    page,
    `task-4-${testInfo.project.name}-consultation-sheet-open.png`,
  );
  await dialog.getByRole("button", { name: "닫기" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "1번 출처 보기" }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await captureEvidence(
    page,
    `task-4-${testInfo.project.name}-consultation-sheet-closed.png`,
  );
  await assertNoInternalIds(page);
});
