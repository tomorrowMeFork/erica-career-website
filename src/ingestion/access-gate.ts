import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { SourceRegistrySchema, type SourceRecord, type SourceRegistry } from "../source-governance/source-registry.schema.js";

export type IngestionCollectionMethod = "public_html" | "manual_pdf_download" | "structure_observation_only";

export type IngestionAccessDecision = {
  source_id: string;
  status: "allowed" | "blocked";
  collection_method: IngestionCollectionMethod;
  reasons: string[];
  observed_url: string;
  auth_boundary: "public" | "login_required" | "blocked" | "unknown";
  response_type: "html" | "pdf" | "viewer" | "unknown";
};

type IngestionAccessSource = Omit<SourceRecord, "scheduled_crawling_enabled"> & {
  scheduled_crawling_enabled: boolean;
};

const observationOnlySourceTypes: ReadonlySet<SourceRecord["source_type"]> = new Set([
  "category_discovery",
  "document_viewer",
]);

function methodForSource(source: IngestionAccessSource, requestedMethod: IngestionCollectionMethod): IngestionCollectionMethod {
  if (observationOnlySourceTypes.has(source.source_type) && source.review_status !== "reviewed") {
    return "structure_observation_only";
  }

  return requestedMethod;
}

function requiredRegistryMethod(requestedMethod: IngestionCollectionMethod): SourceRecord["allowed_collection_method"] {
  if (requestedMethod === "manual_pdf_download") {
    return "approved_manual_download";
  }

  if (requestedMethod === "structure_observation_only") {
    return "manual_discovery_only";
  }

  return "approved_bounded_browser_discovery";
}

function authBoundaryFor(source: IngestionAccessSource): IngestionAccessDecision["auth_boundary"] {
  if (source.review_status === "blocked" || source.approval_status === "blocked") {
    return "blocked";
  }

  if (source.auth_required || source.auth_mode === "env_credentials") {
    return "login_required";
  }

  if (source.auth_mode === "unknown") {
    return "unknown";
  }

  return "public";
}

function responseTypeFor(source: IngestionAccessSource): IngestionAccessDecision["response_type"] {
  return source.content_type;
}

export function loadSourceRegistryForIngestion(registryPath: string): SourceRegistry {
  const fileText = readFileSync(registryPath, "utf8");
  const parsedYaml = parse(fileText);
  const validationResult = SourceRegistrySchema.safeParse(parsedYaml);

  if (!validationResult.success) {
    const issueSummary = validationResult.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Source registry validation failed for ${registryPath}: ${issueSummary}`);
  }

  return validationResult.data;
}

export function evaluateIngestionAccess(
  source: IngestionAccessSource,
  requestedMethod: IngestionCollectionMethod,
): IngestionAccessDecision {
  const reasons: string[] = [];
  const requiredMethod = requiredRegistryMethod(requestedMethod);
  const collectionMethod = methodForSource(source, requestedMethod);

  if (source.review_status !== "reviewed") {
    reasons.push(`source not reviewed: review_status is ${source.review_status}`);
  }

  if (source.review_status === "blocked" || source.approval_status === "blocked") {
    reasons.push("source is blocked by registry review status");
  }

  if (source.allowed_collection_method !== requiredMethod) {
    reasons.push(
      `unapproved collection method: ${source.allowed_collection_method} does not allow requested ${requestedMethod}`,
    );
  }

  if (source.allowed_collection_method === "none_until_review") {
    reasons.push("collection method is none_until_review until human access review is complete");
  }

  if (source.scheduled_crawling_enabled !== false) {
    reasons.push("scheduled_crawling_enabled must remain false for ingestion access");
  }

  if (requestedMethod === "public_html" && source.content_type !== "html") {
    reasons.push(`requested method mismatch: public_html cannot collect ${source.content_type}`);
  }

  if (requestedMethod === "manual_pdf_download" && source.content_type !== "pdf") {
    reasons.push(`requested method mismatch: manual_pdf_download cannot collect ${source.content_type}`);
  }

  if (requestedMethod === "structure_observation_only" && !observationOnlySourceTypes.has(source.source_type)) {
    reasons.push(`requested method mismatch: structure observation is not the parser method for ${source.source_type}`);
  }

  if (observationOnlySourceTypes.has(source.source_type) && source.review_status !== "reviewed") {
    reasons.push("CDP category/book viewer remains structure-observation-only until explicit approval evidence exists");
  }

  return {
    source_id: source.source_id,
    status: reasons.length === 0 ? "allowed" : "blocked",
    collection_method: collectionMethod,
    reasons,
    observed_url: source.canonical_url,
    auth_boundary: authBoundaryFor(source),
    response_type: responseTypeFor(source),
  };
}

export function assertCanIngestSource(
  registry: SourceRegistry,
  sourceId: string,
  requestedMethod: IngestionCollectionMethod,
): IngestionAccessDecision {
  const source = registry.sources.find((candidate) => candidate.source_id === sourceId);

  if (!source) {
    throw new Error(`Source not found in registry: ${sourceId}`);
  }

  const decision = evaluateIngestionAccess(source, requestedMethod);
  if (decision.status === "blocked") {
    throw new Error(`Ingestion blocked for ${sourceId}: ${decision.reasons.join("; ")}`);
  }

  return decision;
}
