import { readFile } from "node:fs/promises";
import {
	assertCanIngestSource,
	type IngestionAccessDecision,
	loadSourceRegistryForIngestion,
} from "../src/ingestion/access-gate.js";
import { chunkNormalizedRecord } from "../src/ingestion/chunking.js";
import { fetchApprovedText } from "../src/ingestion/fetch-client.js";
import {
	buildIbusNormalizedRecords,
	type IbusListingEntry,
	parseIbusListingPage,
} from "../src/ingestion/html/ibus-board-parser.js";
import { writeKnowledgeBaseJsonl } from "../src/ingestion/write-jsonl-kb.js";

const registryPath =
	".planning/phases/01-source-discovery-and-governance/source-registry.yaml";
const approvalRecordPath =
	".planning/phases/02-ingestion-and-knowledge-base/pre-ingestion-approval-record.md";
const listingFixturePath = "fixtures/ingestion/ibus-listing.html";
const detailFixturePath = "fixtures/ingestion/ibus-detail.html";
const sourceId = "ibus-employment-board";
const boardUrl = "https://ibus.hanyang.ac.kr/front/recruit/r-1";
const fixtureFetchedAt = "2026-05-03T00:00:00.000Z";

const DEFAULT_COLLECT_MAX_PAGES = 1;
const DEFAULT_COLLECT_DELAY_MS = 1_200;
const MAX_COLLECT_MAX_PAGES = 5;
const MIN_COLLECT_DELAY_MS = 1_200;

type CliArgs = {
	fixture: boolean;
	output: string;
	max_pages: number;
	delay_ms: number;
};

function readEnvInt(key: string, defaultValue: number): number {
	const raw = process.env[key];
	if (!raw) {
		return defaultValue;
	}
	return parsePositiveInt(raw, key);
}

async function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCli(): Promise<void> {
	const args = normalizeBounds(parseArgs(process.argv.slice(2)));
	const registry = loadSourceRegistryForIngestion(registryPath);
	const decision = args.fixture
		? fixtureOnlyDecision()
		: assertCanIngestSource(registry, sourceId, "public_html");
	const approvalEvidenceText = args.fixture
		? fixtureOnlyApprovalEvidence()
		: await readFile(approvalRecordPath, "utf8");

	if (args.fixture && args.max_pages <= 1) {
		await runSingleSampleCollection(args, decision, approvalEvidenceText);
		return;
	}

	if (args.fixture) {
		throw new Error(
			"Bounded multi-page collection (--pages > 1) is not supported in --fixture mode",
		);
	}

	await runBoundedMultiPageCollection(args, decision, approvalEvidenceText);
}

async function runSingleSampleCollection(
	args: CliArgs,
	decision: IngestionAccessDecision,
	approvalEvidenceText: string,
): Promise<void> {
	const listingHtml = args.fixture
		? await readFile(listingFixturePath, "utf8")
		: await fetchApprovedText(decision, boardUrl, {
				approval_evidence_text: approvalEvidenceText,
				timeout_ms: 10_000,
			});
	const [selectedEntry] = parseIbusListingPage(listingHtml, boardUrl);
	if (!selectedEntry) {
		throw new Error("No ibus listing entries found for sample ingestion");
	}

	const detailHtml = args.fixture
		? await readFile(detailFixturePath, "utf8")
		: await fetchApprovedText(decision, selectedEntry.canonical_url, {
				approval_evidence_text: approvalEvidenceText,
				timeout_ms: 10_000,
			});
	const fetchedAt = args.fixture ? fixtureFetchedAt : new Date().toISOString();
	const records = buildIbusNormalizedRecords({
		listing_html: renderSingleEntryListing(selectedEntry),
		detail_html_by_url: { [selectedEntry.canonical_url]: detailHtml },
		page_url: boardUrl,
		fetched_at: new Date(fetchedAt),
		access_decision: decision,
		approval_evidence_text: approvalEvidenceText,
	});
	const chunks = records.flatMap((record) => chunkNormalizedRecord(record));

	const manifest = await writeKnowledgeBaseJsonl({
		records,
		chunks,
		outputDir: args.output,
		manifest: {
			run_id: args.fixture
				? "fixture-ibus-sample"
				: `live-ibus-r1-sample-${fetchedAt}`,
			generated_at: fetchedAt,
			source_ids: [sourceId],
		},
	});

	console.log(
		`ibus sample ingestion wrote ${manifest.record_count} records and ${manifest.chunk_count} chunks to ${args.output}`,
	);
}

async function runBoundedMultiPageCollection(
	args: CliArgs,
	decision: IngestionAccessDecision,
	approvalEvidenceText: string,
): Promise<void> {
	const allEntries: IbusListingEntry[] = [];
	const detailHtmlByUrl = new Map<string, string>();
	let collectedPages = 0;

	for (let page = 1; page <= args.max_pages; page += 1) {
		const pageUrl = page === 1 ? boardUrl : `${boardUrl}?page=${page}`;
		console.log(
			`ibus bounded collection: fetching listing page ${page}/${args.max_pages} from ${pageUrl}`,
		);

		const listingHtml = await fetchApprovedText(decision, pageUrl, {
			approval_evidence_text: approvalEvidenceText,
			timeout_ms: 15_000,
		});
		const pageEntries = parseIbusListingPage(listingHtml, pageUrl);

		if (pageEntries.length === 0) {
			console.log(
				`ibus bounded collection: no entries on page ${page}, stopping`,
			);
			break;
		}

		allEntries.push(...pageEntries);
		collectedPages += 1;

		for (const entry of pageEntries) {
			if (detailHtmlByUrl.has(entry.canonical_url)) {
				continue;
			}

			console.log(
				`ibus bounded collection: fetching detail ${entry.canonical_url}`,
			);
			await delay(args.delay_ms);
			const detailHtml = await fetchApprovedText(
				decision,
				entry.canonical_url,
				{
					approval_evidence_text: approvalEvidenceText,
					timeout_ms: 10_000,
				},
			);
			detailHtmlByUrl.set(entry.canonical_url, detailHtml);
		}

		if (page < args.max_pages) {
			await delay(args.delay_ms);
		}
	}

	if (allEntries.length === 0) {
		throw new Error(
			"ibus bounded collection: no listing entries found across all pages",
		);
	}

	const fetchedAt = new Date().toISOString();
	const listingHtmlCombined = allEntries
		.map((entry) => renderSingleEntryListingRow(entry))
		.join("");

	const records = buildIbusNormalizedRecords({
		listing_html: `<html><body><table>${listingHtmlCombined}</table></body></html>`,
		detail_html_by_url: Object.fromEntries(detailHtmlByUrl),
		page_url: boardUrl,
		fetched_at: new Date(fetchedAt),
		access_decision: decision,
		approval_evidence_text: approvalEvidenceText,
	});
	const chunks = records.flatMap((record) => chunkNormalizedRecord(record));

	const manifest = await writeKnowledgeBaseJsonl({
		records,
		chunks,
		outputDir: args.output,
		manifest: {
			run_id: `live-ibus-r1-bounded-${fetchedAt}`,
			generated_at: fetchedAt,
			source_ids: [sourceId],
		},
	});

	console.log(
		`ibus bounded collection: ${collectedPages} pages, ${manifest.record_count} records, ${manifest.chunk_count} chunks written to ${args.output}`,
	);
}

function parseArgs(argv: readonly string[]): CliArgs {
	let fixture = false;
	let output = "data/knowledge-base/fixture-ibus";
	let maxPages: number | undefined;
	let delayMs: number | undefined;

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--fixture") {
			fixture = true;
			continue;
		}
		if (arg === "--output") {
			const value = argv[index + 1];
			if (!value) {
				throw new Error("--output requires a path");
			}
			output = value;
			index += 1;
			continue;
		}
		if (arg === "--pages") {
			const value = argv[index + 1];
			if (!value) {
				throw new Error("--pages requires a number");
			}
			maxPages = parsePositiveInt(value, "--pages");
			index += 1;
			continue;
		}
		if (arg === "--delay") {
			const value = argv[index + 1];
			if (!value) {
				throw new Error("--delay requires a number");
			}
			delayMs = parsePositiveInt(value, "--delay");
			index += 1;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	return {
		fixture,
		output,
		max_pages:
			maxPages ?? readEnvInt("COLLECT_MAX_PAGES", DEFAULT_COLLECT_MAX_PAGES),
		delay_ms:
			delayMs ?? readEnvInt("COLLECT_DELAY_MS", DEFAULT_COLLECT_DELAY_MS),
	};
}

function parsePositiveInt(value: string, label: string): number {
	if (!/^\d+$/u.test(value)) {
		throw new Error(`${label} must be a positive integer, got: ${value}`);
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed <= 0) {
		throw new Error(`${label} must be a positive integer, got: ${value}`);
	}
	return parsed;
}

function normalizeBounds(args: CliArgs): CliArgs {
	if (args.max_pages > MAX_COLLECT_MAX_PAGES) {
		throw new Error(
			`--pages/COLLECT_MAX_PAGES must be <= ${MAX_COLLECT_MAX_PAGES}`,
		);
	}
	if (!args.fixture && args.delay_ms < MIN_COLLECT_DELAY_MS) {
		throw new Error(
			`--delay/COLLECT_DELAY_MS must be >= ${MIN_COLLECT_DELAY_MS} for live collection`,
		);
	}
	return args;
}

function fixtureOnlyDecision(): IngestionAccessDecision {
	return {
		source_id: sourceId,
		status: "allowed",
		collection_method: "public_html",
		reasons: [],
		observed_url: boardUrl,
		auth_boundary: "public",
		response_type: "html",
	};
}

function fixtureOnlyApprovalEvidence(): string {
	return [
		sourceId,
		"approved_bounded_browser_discovery",
		boardUrl,
		"fixture-only sanitized local sample",
	].join("\n");
}

function renderSingleEntryListing(entry: IbusListingEntry): string {
	return `<html><body><table>${renderSingleEntryListingRow(entry)}</table></body></html>`;
}

function renderSingleEntryListingRow(entry: IbusListingEntry): string {
	return `<tr><td><a href="${escapeHtml(entry.canonical_url)}">${escapeHtml(entry.title)}</a></td><td>${escapeHtml(entry.posted_raw_text)}</td><td class="hit">${entry.hit_count ?? ""}</td></tr>`;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

runCli().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`ingest_ibus_sample_failed: ${message}`);
	process.exitCode = 1;
});
