import pLimit from "p-limit";
import type { IngestionAccessDecision, IngestionCollectionMethod } from "./access-gate.js";

export type ApprovedFetchOptions = {
  approval_evidence_text: string;
  signal?: AbortSignal;
  timeout_ms?: number;
  fetch_impl?: typeof fetch;
};

type ResponseKind = "html" | "pdf";

const approvedMethodMarkers: Readonly<Record<IngestionCollectionMethod, string>> = {
  public_html: "approved_bounded_browser_discovery",
  manual_pdf_download: "approved_manual_download",
  structure_observation_only: "manual_discovery_only",
};

const hostLimiters = new Map<string, ReturnType<typeof pLimit>>();
const throttlingStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function fetchApprovedText(
  decision: IngestionAccessDecision,
  url: string,
  options: ApprovedFetchOptions,
): Promise<string> {
  return fetchApproved(decision, url, options, "html", (response) => response.text());
}

export async function fetchApprovedBytes(
  decision: IngestionAccessDecision,
  url: string,
  options: ApprovedFetchOptions,
): Promise<Uint8Array> {
  return fetchApproved(decision, url, options, "pdf", async (response) => new Uint8Array(await response.arrayBuffer()));
}

async function fetchApproved<T>(
  decision: IngestionAccessDecision,
  url: string,
  options: ApprovedFetchOptions,
  expectedKind: ResponseKind,
  consume: (response: Response) => Promise<T>,
): Promise<T> {
  const targetUrl = assertFetchAllowed(decision, url, options.approval_evidence_text, expectedKind);
  const limiter = limiterForHost(targetUrl.host);

  return limiter(async () => {
    const fetchImpl = options.fetch_impl ?? fetch;
    const response = await fetchImpl(targetUrl.href, {
      method: "GET",
      credentials: "omit",
      redirect: "error",
      headers: headersFor(expectedKind),
      signal: composeSignal(options.signal, options.timeout_ms),
    });

    if (throttlingStatuses.has(response.status)) {
      throw new Error(`Approved fetch stopped on throttling-like status ${response.status} for ${targetUrl.href}`);
    }

    if (!response.ok) {
      throw new Error(`Approved fetch stopped on non-2xx status ${response.status} for ${targetUrl.href}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentTypeMatches(contentType, expectedKind)) {
      throw new Error(`Approved fetch content-type mismatch for ${targetUrl.href}: ${contentType || "missing"}`);
    }

    return consume(response);
  });
}

function assertFetchAllowed(
  decision: IngestionAccessDecision,
  url: string,
  approvalEvidenceText: string,
  expectedKind: ResponseKind,
): URL {
  const targetUrl = parseHttpsUrl(url, "target URL");
  const observedUrl = parseHttpsUrl(decision.observed_url, "approved observed URL");
  const requiredDecisionMethod: IngestionCollectionMethod = expectedKind === "html" ? "public_html" : "manual_pdf_download";
  const requiredResponseType = expectedKind === "html" ? "html" : "pdf";

  if (decision.status !== "allowed") {
    throw new Error(`Approved fetch blocked: source decision for ${decision.source_id} is ${decision.status}`);
  }

  if (decision.collection_method !== requiredDecisionMethod || decision.response_type !== requiredResponseType) {
    throw new Error(
      `Approved fetch blocked: ${decision.source_id} decision is ${decision.collection_method}/${decision.response_type}, not ${requiredDecisionMethod}/${requiredResponseType}`,
    );
  }

  if (!approvalEvidenceText.includes(decision.source_id)) {
    throw new Error(`Approved fetch blocked: approval evidence does not name ${decision.source_id}`);
  }

  const methodMarker = approvedMethodMarkers[requiredDecisionMethod];
  if (!approvalEvidenceText.includes(methodMarker)) {
    throw new Error(`Approved fetch blocked: approval evidence does not include ${methodMarker}`);
  }

  if (!approvalEvidenceText.includes(observedUrl.href)) {
    throw new Error(`Approved fetch blocked: approval evidence does not include approved URL ${observedUrl.href}`);
  }

  if (!isWithinObservedScope(targetUrl, observedUrl)) {
    throw new Error(`Approved fetch rejected off-scope URL before network: ${targetUrl.href}`);
  }

  return targetUrl;
}

function parseHttpsUrl(value: string, label: string): URL {
  const parsedUrl = new URL(value);
  if (parsedUrl.protocol !== "https:") {
    throw new Error(`Approved fetch requires HTTPS ${label}: ${value}`);
  }
  return parsedUrl;
}

function isWithinObservedScope(targetUrl: URL, observedUrl: URL): boolean {
  if (targetUrl.host !== observedUrl.host) {
    return false;
  }

  if (targetUrl.pathname === observedUrl.pathname) {
    return true;
  }

  const observedPrefix = observedUrl.pathname.endsWith("/") ? observedUrl.pathname : `${observedUrl.pathname}/`;
  return targetUrl.pathname.startsWith(observedPrefix);
}

function limiterForHost(host: string): ReturnType<typeof pLimit> {
  const existing = hostLimiters.get(host);
  if (existing) {
    return existing;
  }

  const limiter = pLimit(1);
  hostLimiters.set(host, limiter);
  return limiter;
}

function headersFor(expectedKind: ResponseKind): Headers {
  const headers = new Headers();
  headers.set("User-Agent", "ERICA-Career-Chat-Capstone-Prototype/1.0 bounded-manual-sample");
  headers.set("Accept", expectedKind === "html" ? "text/html,application/xhtml+xml" : "application/pdf");
  return headers;
}

function composeSignal(signal: AbortSignal | undefined, timeoutMs: number | undefined): AbortSignal | undefined {
  const signals: AbortSignal[] = [];
  if (signal) {
    signals.push(signal);
  }
  if (timeoutMs !== undefined) {
    signals.push(createTimeoutSignal(timeoutMs));
  }
  if (signals.length === 0) {
    return undefined;
  }
  if (signals.length === 1) {
    return signals[0];
  }
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(signals);
  }
  return fallbackAnySignal(signals);
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("timeout_ms must be a positive integer");
  }
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();
  globalThis.setTimeout(() => controller.abort(new Error("Approved fetch timeout elapsed")), timeoutMs);
  return controller.signal;
}

function fallbackAnySignal(signals: readonly AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const abort = (signal: AbortSignal) => {
    if (!controller.signal.aborted) {
      controller.abort(signal.reason);
    }
  };

  for (const signal of signals) {
    if (signal.aborted) {
      abort(signal);
      break;
    }
    signal.addEventListener("abort", () => abort(signal), { once: true });
  }

  return controller.signal;
}

function contentTypeMatches(contentType: string, expectedKind: ResponseKind): boolean {
  const normalized = contentType.toLowerCase();
  if (expectedKind === "html") {
    return normalized.includes("text/html") || normalized.includes("application/xhtml+xml");
  }
  return normalized.includes("application/pdf");
}
