import { z } from "zod";

export const SourceRecordSchema = z.object({
	source_id: z.string().min(1),
	canonical_url: z.string().url(),
	source_name: z.string().min(1),
	source_type: z.enum([
		"root",
		"category_discovery",
		"board",
		"pdf",
		"document_viewer",
	]),
	content_type: z.enum(["html", "pdf", "viewer", "unknown"]),
	category: z.string().min(1),
	approval_scope: z.literal("seed_urls_only"),
	approval_basis: z.enum(["user_assertion", "official_document", "pending"]),
	approval_status: z.enum([
		"pending_review",
		"approved_for_manual_discovery",
		"blocked",
	]),
	auth_required: z.boolean(),
	auth_mode: z.enum([
		"none",
		"env_credentials",
		"user_manual_login_nonpersistent",
		"unknown",
	]),
	review_status: z.enum(["pending", "reviewed", "blocked"]),
	allowed_collection_method: z.enum([
		"none_until_review",
		"manual_discovery_only",
		"approved_bounded_browser_discovery",
		"approved_manual_download",
		"approved_user_manual_login_session",
	]),
	checklist_reference: z.string().min(1),
	robots_status: z.enum([
		"disallow_all_raw_evidence",
		"allow_empty_disallow",
		"not_checked",
		"unreachable",
		"requires_manual_review",
	]),
	tos_status: z.enum([
		"not_found",
		"found_allows",
		"found_restricts",
		"not_reviewed",
		"requires_manual_review",
		"user_exception_applies",
	]),
	rate_limit_posture: z.literal("moderate_1_2s_low_concurrency"),
	refresh_cadence: z.string().min(1),
	owner_label: z.string().min(1),
	last_checked_at: z.string().datetime(),
	scheduled_crawling_enabled: z.literal(false),
	notes: z.string(),
	next_action: z.string().min(1),
});

export const SourceRegistrySchema = z
	.object({
		sources: z.array(SourceRecordSchema),
	})
	.superRefine((registry, context) => {
		const seenSourceIds = new Map<string, number>();

		registry.sources.forEach((source, index) => {
			const firstIndex = seenSourceIds.get(source.source_id);
			if (firstIndex !== undefined) {
				context.addIssue({
					code: "custom",
					message: `Duplicate source_id: ${source.source_id}`,
					path: ["sources", index, "source_id"],
				});
				context.addIssue({
					code: "custom",
					message: `Duplicate source_id: ${source.source_id}`,
					path: ["sources", firstIndex, "source_id"],
				});
				return;
			}

			seenSourceIds.set(source.source_id, index);
		});
	});

export type SourceRecord = z.infer<typeof SourceRecordSchema>;
export type SourceRegistry = z.infer<typeof SourceRegistrySchema>;
