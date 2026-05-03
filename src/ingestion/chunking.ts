import { createHash } from "node:crypto";
import { KnowledgeChunkSchema, NormalizedRecordSchema, type KnowledgeChunk, type NormalizedRecord } from "./normalized-record.js";

export type ChunkNormalizedRecordOptions = {
  max_characters?: number;
};

type RecordIdInput = Pick<
  NormalizedRecord,
  "source_id" | "canonical_url" | "title" | "posted_at" | "content_hash"
>;

const DEFAULT_MAX_CHARACTERS = 1_200;

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function buildRecordId(recordInput: RecordIdInput): string {
  return sha256(
    [
      recordInput.source_id,
      recordInput.canonical_url,
      recordInput.title,
      recordInput.posted_at ?? "",
      recordInput.content_hash,
    ].join("\u001f"),
  );
}

export function chunkNormalizedRecord(
  recordInput: NormalizedRecord,
  options: ChunkNormalizedRecordOptions = {},
): KnowledgeChunk[] {
  const record = NormalizedRecordSchema.parse(recordInput);
  const cleanedText = record.cleaned_text.trim();

  if (cleanedText.length === 0) {
    return [];
  }

  const maxCharacters = options.max_characters ?? DEFAULT_MAX_CHARACTERS;
  if (!Number.isInteger(maxCharacters) || maxCharacters <= 0) {
    throw new Error("max_characters must be a positive integer");
  }

  const primaryAnchorUrl = record.citation_anchors[0]?.url ?? record.canonical_url;
  const chunkTexts = splitIntoParagraphChunks(cleanedText, maxCharacters);

  return chunkTexts.map((text, ordinal) => {
    const chunkId = sha256([record.source_id, record.content_hash, primaryAnchorUrl, String(ordinal)].join("\u001f"));
    return KnowledgeChunkSchema.parse({
      chunk_id: chunkId,
      record_id: record.record_id,
      source_id: record.source_id,
      source_name: record.source_name,
      source_url: record.source_url,
      canonical_url: record.canonical_url,
      title: record.title,
      category: record.category,
      fetched_at: record.fetched_at,
      posted_at: record.posted_at,
      deadline_status: record.deadline_status,
      deadline_raw_text: record.deadline_raw_text,
      content_hash: record.content_hash,
      citation_anchors: record.citation_anchors,
      source_text_trust: record.source_text_trust,
      chunk_ordinal: ordinal,
      text,
    });
  });
}

function splitIntoParagraphChunks(text: string, maxCharacters: number): string[] {
  const paragraphs = text
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxCharacters) {
      if (current.length > 0) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...splitLongParagraph(paragraph, maxCharacters));
      continue;
    }

    const candidate = current.length > 0 ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxCharacters) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      chunks.push(current);
    }
    current = paragraph;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function splitLongParagraph(paragraph: string, maxCharacters: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const sentence of paragraph.split(/(?<=[.!?。！？])\s+/u)) {
    if (sentence.length > maxCharacters) {
      if (current.length > 0) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...splitByLength(sentence, maxCharacters));
      continue;
    }

    const candidate = current.length > 0 ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxCharacters) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      chunks.push(current);
    }
    current = sentence;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function splitByLength(value: string, maxCharacters: number): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < value.length; start += maxCharacters) {
    chunks.push(value.slice(start, start + maxCharacters));
  }
  return chunks;
}
