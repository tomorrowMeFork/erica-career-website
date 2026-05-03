import { z } from "zod";

const Sha256HexSchema = z.string().regex(/^[a-f0-9]{64}$/, "Expected a lowercase SHA-256 hex digest");
const OfficialUrlSchema = z.url().refine(
  (value) => {
    try {
      const parsedUrl = new URL(value);
      return parsedUrl.protocol === "https:";
    } catch (_error) {
      return false;
    }
  },
  { message: "Official source URLs must use https" },
);
const SourceTextTrustSchema = z.literal("untrusted_source_text");

export const DeadlineStatusSchema = z.enum(["active", "expired", "unknown"]);

export const CitationAnchorSchema = z
  .object({
    url: OfficialUrlSchema,
    label: z.string().min(1),
    page_number: z.number().int().positive().optional(),
  })
  .superRefine((anchor, context) => {
    if (anchor.url.includes("#page=") && anchor.page_number === undefined) {
      context.addIssue({
        code: "custom",
        message: "PDF citation anchors with #page= require a positive page_number",
        path: ["page_number"],
      });
    }
  });

const CitationAnchorsSchema = z.array(CitationAnchorSchema).min(1);

export const NormalizedRecordSchema = z.object({
  record_id: z.string().min(1),
  source_id: z.string().min(1),
  source_name: z.string().min(1),
  source_url: OfficialUrlSchema,
  canonical_url: OfficialUrlSchema,
  title: z.string().min(1),
  category: z.string().min(1),
  fetched_at: z.iso.datetime(),
  posted_at: z.iso.datetime().nullable(),
  deadline_status: DeadlineStatusSchema,
  deadline_raw_text: z.string(),
  raw_text: z.string().min(1),
  cleaned_text: z.string(),
  content_hash: Sha256HexSchema,
  citation_anchors: CitationAnchorsSchema,
  source_text_trust: SourceTextTrustSchema,
});

export const KnowledgeChunkSchema = z.object({
  chunk_id: z.string().min(1),
  record_id: z.string().min(1),
  source_id: z.string().min(1),
  source_name: z.string().min(1),
  source_url: OfficialUrlSchema,
  canonical_url: OfficialUrlSchema,
  title: z.string().min(1),
  category: z.string().min(1),
  fetched_at: z.iso.datetime(),
  posted_at: z.iso.datetime().nullable(),
  deadline_status: DeadlineStatusSchema,
  deadline_raw_text: z.string(),
  content_hash: Sha256HexSchema,
  citation_anchors: CitationAnchorsSchema,
  source_text_trust: SourceTextTrustSchema,
  chunk_ordinal: z.number().int().nonnegative(),
  text: z.string().min(1),
});

export const IngestionRunManifestSchema = z
  .object({
    run_id: z.string().min(1),
    generated_at: z.iso.datetime(),
    source_ids: z.array(z.string().min(1)),
    records: z.array(NormalizedRecordSchema),
    chunks: z.array(KnowledgeChunkSchema),
  })
  .superRefine((manifest, context) => {
    const seenRecordIds = new Map<string, number>();
    const seenChunkIds = new Map<string, number>();

    manifest.records.forEach((record, index) => {
      const firstIndex = seenRecordIds.get(record.record_id);
      if (firstIndex !== undefined) {
        context.addIssue({
          code: "custom",
          message: `Duplicate record_id: ${record.record_id}`,
          path: ["records", index, "record_id"],
        });
        context.addIssue({
          code: "custom",
          message: `Duplicate record_id: ${record.record_id}`,
          path: ["records", firstIndex, "record_id"],
        });
        return;
      }

      seenRecordIds.set(record.record_id, index);
    });

    manifest.chunks.forEach((chunk, index) => {
      const firstIndex = seenChunkIds.get(chunk.chunk_id);
      if (firstIndex !== undefined) {
        context.addIssue({
          code: "custom",
          message: `Duplicate chunk_id: ${chunk.chunk_id}`,
          path: ["chunks", index, "chunk_id"],
        });
        context.addIssue({
          code: "custom",
          message: `Duplicate chunk_id: ${chunk.chunk_id}`,
          path: ["chunks", firstIndex, "chunk_id"],
        });
        return;
      }

      seenChunkIds.set(chunk.chunk_id, index);
    });
  });

export type DeadlineStatus = z.infer<typeof DeadlineStatusSchema>;
export type CitationAnchor = z.infer<typeof CitationAnchorSchema>;
export type NormalizedRecord = z.infer<typeof NormalizedRecordSchema>;
export type KnowledgeChunk = z.infer<typeof KnowledgeChunkSchema>;
export type IngestionRunManifest = z.infer<typeof IngestionRunManifestSchema>;
