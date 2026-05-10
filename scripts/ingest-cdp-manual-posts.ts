import { readFile } from "node:fs/promises";
import { chunkNormalizedRecord } from "../src/ingestion/chunking.js";
import {
	buildCdpManualPostRecords,
	CdpManualPostExportSchema,
} from "../src/ingestion/manual-cdp-posts.js";
import {
	mergeKnowledgeBaseJsonl,
	readKnowledgeBaseJsonl,
	writeKnowledgeBaseJsonl,
} from "../src/ingestion/write-jsonl-kb.js";

type CliArgs = {
	input: string;
	output: string;
};

async function runCli(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const rawInput = JSON.parse(await readFile(args.input, "utf8"));
	const exportData = CdpManualPostExportSchema.parse(rawInput);
	const records = buildCdpManualPostRecords(exportData);
	const chunks = records.flatMap((record) => chunkNormalizedRecord(record));
	const existingKnowledgeBase = await readKnowledgeBaseJsonl(args.output);
	const mergedKnowledgeBase = mergeKnowledgeBaseJsonl(existingKnowledgeBase, {
		records,
		chunks,
	});
	const manifest = await writeKnowledgeBaseJsonl({
		records: mergedKnowledgeBase.records,
		chunks: mergedKnowledgeBase.chunks,
		outputDir: args.output,
		manifest: {
			run_id: `manual-cdp-posts-${exportData.exported_at}`,
			generated_at: exportData.exported_at,
			source_ids: ["cdp-recruit-category-discovery"],
		},
	});

	console.log(
		`cdp manual post ingestion wrote ${manifest.record_count} records and ${manifest.chunk_count} chunks to ${args.output}`,
	);
}

function parseArgs(argv: readonly string[]): CliArgs {
	let input = "";
	let output = "data/knowledge-base/manual-cdp-posts";

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--input") {
			const value = argv[index + 1];
			if (!value) {
				throw new Error("--input requires a JSON file path");
			}
			input = value;
			index += 1;
			continue;
		}
		if (arg === "--output") {
			const value = argv[index + 1];
			if (!value) {
				throw new Error("--output requires a directory path");
			}
			output = value;
			index += 1;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	if (input.length === 0) {
		throw new Error(
			"Usage: npm run ingest:cdp:manual-posts -- --input <manual-export.json> [--output data/knowledge-base/manual-cdp-posts]",
		);
	}

	return { input, output };
}

runCli().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`ingest_cdp_manual_posts_failed: ${message}`);
	process.exitCode = 1;
});
