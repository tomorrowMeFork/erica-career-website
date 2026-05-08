import { describe, expect, it, vi } from "vitest";
import type { IngestionAccessDecision } from "./access-gate.js";
import { fetchApprovedBytes, fetchApprovedText } from "./fetch-client.js";

const ibusUrl = "https://ibus.hanyang.ac.kr/front/recruit/r-1";
const ibusDetailUrl =
	"https://ibus.hanyang.ac.kr/front/recruit/r-1/view?id=6468";
const cdpPdfUrl =
	"https://cdp.hanyang.ac.kr/office/%EB%A7%A4%EB%89%B4%EC%96%BC_%ED%95%99%EC%83%9D.pdf";

const ibusDecision: IngestionAccessDecision = {
	source_id: "ibus-employment-board",
	status: "allowed",
	collection_method: "public_html",
	reasons: [],
	observed_url: ibusUrl,
	auth_boundary: "public",
	response_type: "html",
};

const cdpPdfDecision: IngestionAccessDecision = {
	source_id: "cdp-student-guide-pdf",
	status: "allowed",
	collection_method: "manual_pdf_download",
	reasons: [],
	observed_url: cdpPdfUrl,
	auth_boundary: "public",
	response_type: "pdf",
};

const ibusApprovalEvidence = [
	"ibus-employment-board",
	"approved_bounded_browser_discovery",
	ibusUrl,
].join("\n");
const cdpPdfApprovalEvidence = [
	"cdp-student-guide-pdf",
	"approved_manual_download",
	cdpPdfUrl,
].join("\n");

function fetchMockReturning(response: Response): typeof fetch {
	return vi.fn<typeof fetch>(() => Promise.resolve(response));
}

describe("fetchApprovedText", () => {
	it("rejects an off-host URL before fetch is called", async () => {
		const fetchImpl = fetchMockReturning(
			new Response("unused", { headers: { "content-type": "text/html" } }),
		);

		await expect(
			fetchApprovedText(
				ibusDecision,
				"https://evil.example/front/recruit/r-1",
				{
					approval_evidence_text: ibusApprovalEvidence,
					fetch_impl: fetchImpl,
				},
			),
		).rejects.toThrow("off-scope URL before network");

		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("rejects a blocked decision before fetch is called", async () => {
		const fetchImpl = fetchMockReturning(
			new Response("unused", { headers: { "content-type": "text/html" } }),
		);

		await expect(
			fetchApprovedText(
				{ ...ibusDecision, status: "blocked", reasons: ["held"] },
				ibusUrl,
				{
					approval_evidence_text: ibusApprovalEvidence,
					fetch_impl: fetchImpl,
				},
			),
		).rejects.toThrow("source decision for ibus-employment-board is blocked");

		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("rejects missing approval evidence before fetch is called", async () => {
		const fetchImpl = fetchMockReturning(
			new Response("unused", { headers: { "content-type": "text/html" } }),
		);

		await expect(
			fetchApprovedText(ibusDecision, ibusUrl, {
				approval_evidence_text:
					"cdp-student-guide-pdf approved_manual_download",
				fetch_impl: fetchImpl,
			}),
		).rejects.toThrow("approval evidence does not name ibus-employment-board");

		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("fetches an approved synthetic ibus HTML URL exactly once", async () => {
		const fetchImpl = fetchMockReturning(
			new Response("<html>취업정보</html>", {
				headers: { "content-type": "text/html; charset=utf-8" },
			}),
		);

		const text = await fetchApprovedText(ibusDecision, ibusDetailUrl, {
			approval_evidence_text: ibusApprovalEvidence,
			fetch_impl: fetchImpl,
			timeout_ms: 1_000,
		});

		expect(text).toContain("취업정보");
		expect(fetchImpl).toHaveBeenCalledOnce();
	});

	it("stops on HTML content-type mismatch", async () => {
		const fetchImpl = fetchMockReturning(
			new Response("{}", { headers: { "content-type": "application/json" } }),
		);

		await expect(
			fetchApprovedText(ibusDecision, ibusUrl, {
				approval_evidence_text: ibusApprovalEvidence,
				fetch_impl: fetchImpl,
			}),
		).rejects.toThrow("content-type mismatch");
	});

	it("keeps same-host body reads inside the concurrency limiter", async () => {
		let releaseFirstBody!: () => void;
		const bodyReadOrder: string[] = [];
		const responses = [
			new Response("", { headers: { "content-type": "text/html" } }),
			new Response("", { headers: { "content-type": "text/html" } }),
		];
		vi.spyOn(responses[0], "text").mockImplementation(async () => {
			bodyReadOrder.push("first");
			await new Promise<void>((resolve) => {
				releaseFirstBody = resolve;
			});
			return "first";
		});
		vi.spyOn(responses[1], "text").mockImplementation(async () => {
			bodyReadOrder.push("second");
			return "second";
		});
		const fetchImpl = vi.fn<typeof fetch>(() =>
			Promise.resolve(responses.shift() ?? new Response("unexpected")),
		);

		const firstFetch = fetchApprovedText(ibusDecision, ibusUrl, {
			approval_evidence_text: ibusApprovalEvidence,
			fetch_impl: fetchImpl,
		});
		await vi.waitFor(() => expect(bodyReadOrder).toEqual(["first"]));

		const secondFetch = fetchApprovedText(ibusDecision, ibusDetailUrl, {
			approval_evidence_text: ibusApprovalEvidence,
			fetch_impl: fetchImpl,
		});
		await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
		expect(fetchImpl).toHaveBeenCalledOnce();

		releaseFirstBody();

		await expect(firstFetch).resolves.toBe("first");
		await expect(secondFetch).resolves.toBe("second");
		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(bodyReadOrder).toEqual(["first", "second"]);
	});
});

describe("fetchApprovedBytes", () => {
	it("fetches an approved synthetic CDP PDF decision exactly once", async () => {
		const pdfBytes = new Uint8Array([37, 80, 68, 70]);
		const fetchImpl = fetchMockReturning(
			new Response(pdfBytes, {
				headers: { "content-type": "application/pdf" },
			}),
		);

		const bytes = await fetchApprovedBytes(cdpPdfDecision, cdpPdfUrl, {
			approval_evidence_text: cdpPdfApprovalEvidence,
			fetch_impl: fetchImpl,
		});

		expect(Array.from(bytes)).toEqual(Array.from(pdfBytes));
		expect(fetchImpl).toHaveBeenCalledOnce();
	});

	it("rejects a manual PDF download on an off-scope path before fetch", async () => {
		const fetchImpl = fetchMockReturning(
			new Response(new Uint8Array([1]), {
				headers: { "content-type": "application/pdf" },
			}),
		);

		await expect(
			fetchApprovedBytes(
				cdpPdfDecision,
				"https://cdp.hanyang.ac.kr/office/other.pdf",
				{
					approval_evidence_text: cdpPdfApprovalEvidence,
					fetch_impl: fetchImpl,
				},
			),
		).rejects.toThrow("off-scope URL before network");

		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("stops on throttling-like statuses", async () => {
		const fetchImpl = fetchMockReturning(
			new Response("slow down", {
				status: 429,
				headers: { "content-type": "application/pdf" },
			}),
		);

		await expect(
			fetchApprovedBytes(cdpPdfDecision, cdpPdfUrl, {
				approval_evidence_text: cdpPdfApprovalEvidence,
				fetch_impl: fetchImpl,
			}),
		).rejects.toThrow("throttling-like status 429");
	});
});
