import "dotenv/config";
import { chromium, type Page } from "playwright";

export const SEED_SCOPE_HOSTS = ["cdp.hanyang.ac.kr"] as const;

const SEED_SCOPE_URL = "https://cdp.hanyang.ac.kr/";
const MAIN_DISCOVERY_URL = "https://cdp.hanyang.ac.kr/Main/default.aspx";
const CATEGORY_HINTS = ["취업정보", "채용정보", "recruit", "job"] as const;

type CandidateLink = {
  url: string;
  text: string;
  reason: string;
};

type DiscoveryOutput = {
  mode: "dry-run" | "one-shot";
  seed_scope_url: string;
  observed_url?: string;
  seed_scope_hosts: readonly string[];
  scheduled_crawling_enabled: false;
  forbidden_scheduling_status: "not_configured";
  credentials_present?: boolean;
  status?:
    | "ok"
    | "login_required_credentials_present"
    | "missing_env_credentials"
    | "no_candidates_observed"
    | "navigation_rejected_off_host";
  candidates?: CandidateLink[];
};

type RuntimeConfig = {
  credentialsPresent: boolean;
  headless: boolean;
};

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function assertSeedScope(url: string): void {
  const parsed = new URL(url);
  if (!SEED_SCOPE_HOSTS.includes(parsed.host as (typeof SEED_SCOPE_HOSTS)[number])) {
    const output: DiscoveryOutput = {
      mode: "one-shot",
      seed_scope_url: SEED_SCOPE_URL,
      seed_scope_hosts: SEED_SCOPE_HOSTS,
      scheduled_crawling_enabled: false,
      forbidden_scheduling_status: "not_configured",
      status: "navigation_rejected_off_host",
    };
    console.log(JSON.stringify(output, null, 2));
    throw new Error(`Rejected off-host navigation target: ${parsed.host}`);
  }
}

function isSeedScopeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SEED_SCOPE_HOSTS.includes(parsed.host as (typeof SEED_SCOPE_HOSTS)[number]);
  } catch {
    return false;
  }
}

function printDryRun(): void {
  const config = readRuntimeConfig();
  const output: DiscoveryOutput = {
    mode: "dry-run",
    seed_scope_url: SEED_SCOPE_URL,
    seed_scope_hosts: SEED_SCOPE_HOSTS,
    scheduled_crawling_enabled: false,
    forbidden_scheduling_status: "not_configured",
    credentials_present: config.credentialsPresent,
    status: "ok",
    candidates: [],
  };

  console.log(JSON.stringify(output, null, 2));
}

function readRuntimeConfig(): RuntimeConfig {
  const credentialsPresent = Boolean(process.env.CDP_USERNAME && process.env.CDP_PASSWORD);
  const headless = process.env.PLAYWRIGHT_HEADLESS?.toLowerCase() !== "false";
  return { credentialsPresent, headless };
}

async function loginAppearsRequired(page: Page): Promise<boolean> {
  const hasPasswordInput = await page.locator('input[type="password"]').count();
  return hasPasswordInput > 0;
}

async function extractCandidateLinks(page: Page): Promise<CandidateLink[]> {
  return page.$$eval(
    "a[href]",
    (anchors, context) => {
      const seedUrl = context.seedUrl;
      const allowedHosts = context.allowedHosts;
      const hints = context.hints;
      const candidates = new Map<string, CandidateLink>();

      for (const anchor of anchors) {
        const href = anchor.getAttribute("href");
        if (!href) {
          continue;
        }

        const text = (anchor.textContent ?? "").replace(/\s+/g, " ").trim();
        let resolved: URL;
        try {
          resolved = new URL(href, seedUrl);
        } catch {
          continue;
        }

        if (!allowedHosts.includes(resolved.host)) {
          continue;
        }

        const haystack = `${text} ${resolved.href}`.toLowerCase();
        const matchedHints = hints.filter((hint) => haystack.includes(hint.toLowerCase()));
        if (matchedHints.length === 0) {
          continue;
        }

        const url = resolved.href;
        candidates.set(url, {
          url,
          text,
          reason: `matched_category_hint:${matchedHints.join(",")}`,
        });
      }

      return [...candidates.values()];
    },
    {
      seedUrl: SEED_SCOPE_URL,
      allowedHosts: [...SEED_SCOPE_HOSTS] as string[],
      hints: [...CATEGORY_HINTS],
    },
  );
}

async function navigateToObservableCdpSurface(page: Page): Promise<void> {
  await page.goto(SEED_SCOPE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  assertSeedScope(page.url());
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

  const bodyTextLength = await page.locator("body").innerText({ timeout: 3_000 }).then((text) => text.trim().length).catch(() => 0);
  if (bodyTextLength > 0) {
    return;
  }

  await page.goto(MAIN_DISCOVERY_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  assertSeedScope(page.url());
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function runOneShotDiscovery(): Promise<void> {
  assertSeedScope(SEED_SCOPE_URL);
  const config = readRuntimeConfig();

  const browser = await chromium.launch({ headless: config.headless });
  try {
    const page = await browser.newPage();
    await page.route("**/*", (route) => {
      if (isSeedScopeUrl(route.request().url())) {
        return route.continue();
      }

      return route.abort();
    });
    await navigateToObservableCdpSurface(page);

    if (await loginAppearsRequired(page)) {
      const output: DiscoveryOutput = {
        mode: "one-shot",
        seed_scope_url: SEED_SCOPE_URL,
        observed_url: page.url(),
        seed_scope_hosts: SEED_SCOPE_HOSTS,
        scheduled_crawling_enabled: false,
        forbidden_scheduling_status: "not_configured",
        credentials_present: config.credentialsPresent,
        status: config.credentialsPresent ? "login_required_credentials_present" : "missing_env_credentials",
        candidates: [],
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    const candidates = await extractCandidateLinks(page);
    const output: DiscoveryOutput = {
      mode: "one-shot",
      seed_scope_url: SEED_SCOPE_URL,
      observed_url: page.url(),
      seed_scope_hosts: SEED_SCOPE_HOSTS,
      scheduled_crawling_enabled: false,
      forbidden_scheduling_status: "not_configured",
      credentials_present: config.credentialsPresent,
      status: candidates.length > 0 ? "ok" : "no_candidates_observed",
      candidates,
    };
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await browser.close();
  }
}

if (isDryRun()) {
  printDryRun();
} else {
  runOneShotDiscovery().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`cdp_seed_scope_discovery_failed: ${message}`);
    process.exitCode = 1;
  });
}
