import { extractEventPeriodDeadlineRawText, resolveEffectiveDeadlineStatus } from "../ingestion/deadline-status.js";
import {
	type KnowledgeChunk,
	KnowledgeChunkSchema,
} from "../ingestion/normalized-record.js";
import {
	type BoilerplateClassification,
	classifyBoilerplate,
} from "./boilerplate-filter.js";
import { expandDomainSynonyms } from "./domain-synonyms.js";
import { extractSearchTerms, normalizeKoreanText } from "./normalize-korean.js";
import { MAX_RETRIEVE_TOP_K, type RetrievedChunk, type RetrieveFilters, type RetrieveInput, type Retriever } from "./retriever.js";

type IndexedChunk = {
	chunk: KnowledgeChunk;
	terms: Map<string, number>;
	titleTerms: Set<string>;
	categoryTerms: Set<string>;
	classification: BoilerplateClassification;
	tokenCount: number;
	ordinal: number;
};

const K1 = 1.2;
const B = 0.75;
const listingTerms = new Set([
	"채용",
	"모집",
	"공고",
	"인턴",
	"intern",
	"인턴십",
	"현장실습",
	"아르바이트",
]);
const queryFillerTerms = new Set([
	"난",
	"내",
	"뭔",
	"지금",
	"위해",
	"하면",
	"좋을",
	"좋을까",
	"하려고",
	"하려고해",
	"쪽으",
	"쪽으로",
	"으로",
	"못",
	"려줘",
	"알려",
	"알려줘",
]);

export class Bm25Retriever implements Retriever {
	private readonly indexedChunks: IndexedChunk[];
	private readonly eventDeadlineRawTextByRecordId: Map<string, string>;
	private readonly documentFrequency: Map<string, number>;
	private readonly averageDocumentLength: number;
	private readonly clock: () => Date;

	constructor(
		chunks: readonly KnowledgeChunk[],
		options: { referenceDate?: Date; clock?: () => Date } = {},
	) {
		this.clock = options.clock ?? (() => options.referenceDate ?? new Date());
		this.indexedChunks = chunks.map((chunk, ordinal) =>
			indexChunk(KnowledgeChunkSchema.parse(chunk), ordinal),
		);
		this.eventDeadlineRawTextByRecordId = buildEventDeadlineRawTextByRecordId(
			this.indexedChunks.map((indexedChunk) => indexedChunk.chunk),
		);
		this.documentFrequency = computeDocumentFrequency(this.indexedChunks);
		this.averageDocumentLength = computeAverageDocumentLength(
			this.indexedChunks,
		);
	}

	async retrieve(input: RetrieveInput): Promise<RetrievedChunk[]> {
		const topK = input.topK ?? 5;
		const boundedTopK = Math.max(0, Math.min(topK, MAX_RETRIEVE_TOP_K));
		if (boundedTopK === 0) {
			return [];
		}

		const queryTerms = buildQueryTerms(input.query);
		const referenceDate = this.clock();
		const effectiveChunks = this.indexedChunks.map((indexedChunk) => ({
			...indexedChunk,
			chunk: withEffectiveDeadlineStatus(
				indexedChunk.chunk,
				referenceDate,
				this.eventDeadlineRawTextByRecordId,
			),
		}));
		const filteredChunks = effectiveChunks.filter((indexedChunk) => matchesRetrieveFilters(indexedChunk.chunk, input.filters));
		if (queryTerms.length === 0 || filteredChunks.length === 0) {
			return [];
		}

		const scored = filteredChunks
			.map((indexedChunk) => this.scoreChunk(indexedChunk, queryTerms, referenceDate))
			.filter((result) => result.score > 0);

		const answerableResults = scored.filter(
			(result) => result.ranking_features.boilerplate_penalty < 2,
		);
		const candidateResults =
			answerableResults.length > 0 ? answerableResults : scored;
		const maxScore = Math.max(
			...candidateResults.map((result) => result.score),
			0,
		);

		return candidateResults
			.map((result) => ({
				...result,
				normalized_score:
					maxScore > 0 ? roundScore(result.score / maxScore) : 0,
			}))
			.sort(compareRetrievedChunks)
			.slice(0, boundedTopK);
	}

	private scoreChunk(
		indexedChunk: IndexedChunk,
		queryTerms: readonly string[],
		referenceDate: Date,
	): RetrievedChunk {
		const matchedTerms = queryTerms.filter((term) =>
			indexedChunk.terms.has(term),
		);
		const lexicalScore = roundScore(
			computeBm25Score(
				indexedChunk,
				matchedTerms,
				this.documentFrequency,
				this.indexedChunks.length,
				this.averageDocumentLength,
			),
		);
		const titleBoost = roundScore(
			matchedTerms.filter((term) => indexedChunk.titleTerms.has(term)).length *
				0.25,
		);
		const categoryBoost = roundScore(
			matchedTerms.filter((term) => indexedChunk.categoryTerms.has(term))
				.length * 0.15,
		);
		const freshnessBoost = roundScore(
			computeFreshnessBoost(indexedChunk.chunk, referenceDate),
		);
		const deadlinePenalty = roundScore(
			computeDeadlinePenalty(indexedChunk.chunk, queryTerms),
		);
		const boilerplatePenalty = roundScore(
			computeBoilerplatePenalty(indexedChunk.classification),
		);
		const score = roundScore(
			Math.max(
				0,
				lexicalScore +
					titleBoost +
					categoryBoost +
					freshnessBoost -
					deadlinePenalty -
					boilerplatePenalty,
			),
		);

		return {
			chunk: indexedChunk.chunk,
			score,
			normalized_score: 0,
			matched_terms: matchedTerms.sort(compareStrings),
			ranking_features: {
				lexical_score: lexicalScore,
				title_boost: titleBoost,
				category_boost: categoryBoost,
				freshness_boost: freshnessBoost,
				deadline_penalty: deadlinePenalty,
				boilerplate_penalty: boilerplatePenalty,
			},
		};
	}
}

function matchesRetrieveFilters(chunk: KnowledgeChunk, filters: RetrieveFilters | undefined): boolean {
	return (
		matchesFilterValues(filters?.collection_categories, chunk.collection_category) &&
		matchesFilterValues(filters?.source_families, chunk.source_family) &&
		matchesFilterValues(filters?.source_ids, chunk.source_id) &&
		matchesFilterValues(filters?.deadline_statuses, chunk.deadline_status)
	);
}

function withEffectiveDeadlineStatus(
	chunk: KnowledgeChunk,
	referenceDate: Date,
	eventDeadlineRawTextByRecordId: ReadonlyMap<string, string>,
): KnowledgeChunk {
	const deadlineRawText =
		chunk.source_id === "cdp-recruit-event-board"
			? eventDeadlineRawTextByRecordId.get(chunk.record_id) ?? chunk.deadline_raw_text
			: chunk.deadline_raw_text;
	const deadlineStatus = resolveEffectiveDeadlineStatus({
		deadline_raw_text: deadlineRawText,
		deadline_status: chunk.deadline_status,
		posted_at: chunk.posted_at,
		referenceDate,
	});
	return deadlineStatus === chunk.deadline_status && deadlineRawText === chunk.deadline_raw_text
		? chunk
		: { ...chunk, deadline_status: deadlineStatus, deadline_raw_text: deadlineRawText };
}

function buildEventDeadlineRawTextByRecordId(chunks: readonly KnowledgeChunk[]): Map<string, string> {
	const deadlineRawTextByRecordId = new Map<string, string>();
	for (const chunk of chunks) {
		if (chunk.source_id !== "cdp-recruit-event-board" || deadlineRawTextByRecordId.has(chunk.record_id)) {
			continue;
		}
		const deadlineRawText = extractEventPeriodDeadlineRawText(chunk.text);
		if (deadlineRawText !== undefined) {
			deadlineRawTextByRecordId.set(chunk.record_id, deadlineRawText);
		}
	}
	return deadlineRawTextByRecordId;
}

function matchesFilterValues<T extends string>(values: readonly T[] | undefined, candidate: T): boolean {
	return values === undefined || values.length === 0 || values.includes(candidate);
}

function buildQueryTerms(query: string): string[] {
	const baseTerms = extractSearchTerms(query);
	const expandedTerms = expandDomainSynonyms(baseTerms);
	const allTerms = new Set<string>();

	for (const term of [...baseTerms, ...expandedTerms]) {
		for (const extractedTerm of extractSearchTerms(term)) {
			allTerms.add(extractedTerm);
		}
		const normalizedTerm = normalizeKoreanText(term);
		if (normalizedTerm.length > 0) {
			allTerms.add(normalizedTerm);
		}
	}

	return [...allTerms]
		.filter((term) => !queryFillerTerms.has(term))
		.sort(compareStrings);
}

function indexChunk(chunk: KnowledgeChunk, ordinal: number): IndexedChunk {
	const titleTerms = new Set(extractSearchTerms(chunk.title));
	const categoryTerms = new Set(extractSearchTerms(chunk.category));
	const sourceNameTerms = extractSearchTerms(chunk.source_name);
	const textTerms = extractSearchTerms(chunk.text);
	const weightedTerms = [
		...textTerms,
		...sourceNameTerms,
		...repeatTerms([...titleTerms], 3),
		...repeatTerms([...categoryTerms], 2),
	];
	const terms = termFrequency(weightedTerms);

	return {
		chunk,
		terms,
		titleTerms,
		categoryTerms,
		classification: classifyBoilerplate(
			`${chunk.title}\n${chunk.category}\n${chunk.text}`,
		),
		tokenCount: weightedTerms.length || 1,
		ordinal,
	};
}

function computeBm25Score(
	indexedChunk: IndexedChunk,
	matchedTerms: readonly string[],
	documentFrequency: Map<string, number>,
	totalDocuments: number,
	averageDocumentLength: number,
): number {
	let score = 0;
	for (const term of matchedTerms) {
		const frequency = indexedChunk.terms.get(term) ?? 0;
		if (frequency === 0) {
			continue;
		}
		const documentCount = documentFrequency.get(term) ?? 0;
		const idf = Math.log(
			1 + (totalDocuments - documentCount + 0.5) / (documentCount + 0.5),
		);
		const denominator =
			frequency +
			K1 * (1 - B + B * (indexedChunk.tokenCount / averageDocumentLength));
		score += idf * ((frequency * (K1 + 1)) / denominator);
	}
	return score;
}

function computeDocumentFrequency(
	chunks: readonly IndexedChunk[],
): Map<string, number> {
	const frequencies = new Map<string, number>();
	for (const chunk of chunks) {
		for (const term of chunk.terms.keys()) {
			frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
		}
	}
	return frequencies;
}

function computeAverageDocumentLength(chunks: readonly IndexedChunk[]): number {
	if (chunks.length === 0) {
		return 1;
	}
	return Math.max(
		1,
		chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0) / chunks.length,
	);
}

function computeFreshnessBoost(
	chunk: KnowledgeChunk,
	referenceDate: Date,
): number {
	if (chunk.deadline_status === "active") {
		return 0.35;
	}
	const dateText = chunk.posted_at ?? chunk.fetched_at;
	const date = new Date(dateText);
	if (Number.isNaN(date.getTime())) {
		return 0;
	}
	const ageDays = Math.max(
		0,
		(referenceDate.getTime() - date.getTime()) / 86_400_000,
	);
	if (ageDays <= 30) {
		return 0.2;
	}
	if (ageDays <= 180) {
		return 0.1;
	}
	return 0;
}

function computeDeadlinePenalty(
	chunk: KnowledgeChunk,
	queryTerms: readonly string[],
): number {
	if (chunk.deadline_status !== "expired") {
		return 0;
	}
	return queryTerms.some((term) => listingTerms.has(term)) ? 0.5 : 0.15;
}

function computeBoilerplatePenalty(
	classification: BoilerplateClassification,
): number {
	if (classification.label === "boilerplate_only") {
		return 2;
	}
	if (classification.label === "mixed") {
		return 0.2;
	}
	return 0;
}

function termFrequency(terms: readonly string[]): Map<string, number> {
	const frequencies = new Map<string, number>();
	for (const term of terms) {
		frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
	}
	return frequencies;
}

function repeatTerms(terms: readonly string[], count: number): string[] {
	const repeated: string[] = [];
	for (let index = 0; index < count; index += 1) {
		repeated.push(...terms);
	}
	return repeated;
}

function compareRetrievedChunks(
	left: RetrievedChunk,
	right: RetrievedChunk,
): number {
	if (right.normalized_score !== left.normalized_score) {
		return right.normalized_score - left.normalized_score;
	}
	if (right.score !== left.score) {
		return right.score - left.score;
	}
	return left.chunk.chunk_id.localeCompare(right.chunk.chunk_id);
}

function roundScore(value: number): number {
	return Number(value.toFixed(6));
}

function compareStrings(left: string, right: string): number {
	return left.localeCompare(right, "ko");
}
