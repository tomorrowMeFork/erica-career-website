import { existsSync } from "node:fs";
import { join } from "node:path";

export const KNOWLEDGE_BASE_ROOT_DIR = "data/knowledge-base";

export const DEFAULT_KNOWLEDGE_BASE_DATASET_NAMES = [
  "ibus-employment-board",
  "fixture-cdp-pdf",
] as const;

export const CDP_AUTHENTICATED_SOURCES_DATASET_NAME = "cdp-authenticated-sources";
export const CDP_AUTHENTICATED_SPLIT_DATASET_NAMES = [
  "cdp-authenticated-sources/일반채용공고",
  "cdp-authenticated-sources/채용상담및설명회",
] as const;
export const EWIL_AUTHENTICATED_SOURCES_ROOT_NAME = "ewil-authenticated-sources";
export const EWIL_AUTHENTICATED_SPLIT_DATASET_NAMES = [
  "ewil-authenticated-sources/공지사항",
  "ewil-authenticated-sources/현장실습후기",
] as const;

export type KnowledgeBaseDatasetState = "active" | "disabled" | "legacy_fallback" | "blocked";

export type ResolvedKnowledgeBaseDataset = {
  id: string;
  directory: string;
  state: KnowledgeBaseDatasetState;
  reason: string;
};

export type ResolveKnowledgeBaseDatasetsInput = {
  rootDir?: string;
};

export function resolveKnowledgeBaseDatasets(input: ResolveKnowledgeBaseDatasetsInput = {}): ResolvedKnowledgeBaseDataset[] {
  const rootDir = input.rootDir ?? KNOWLEDGE_BASE_ROOT_DIR;
  const resolved: ResolvedKnowledgeBaseDataset[] = DEFAULT_KNOWLEDGE_BASE_DATASET_NAMES.map((name) => ({
    id: name,
    directory: datasetPath(rootDir, name),
    state: "active",
    reason: "default knowledge-base dataset",
  }));

  const cdpSplitDatasets = CDP_AUTHENTICATED_SPLIT_DATASET_NAMES.map((name) => {
    const directory = datasetPath(rootDir, name);
    return { name, directory, hasChunks: hasChunksJsonl(directory) };
  });
  const hasAnyCdpSplitDataset = cdpSplitDatasets.some((dataset) => dataset.hasChunks);
  for (const dataset of cdpSplitDatasets) {
    resolved.push({
      id: dataset.name,
      directory: dataset.directory,
      state: dataset.hasChunks ? "active" : "disabled",
      reason: dataset.hasChunks ? "split CDP authenticated dataset is present" : "split CDP authenticated dataset is absent",
    });
  }

  const cdpAuthenticatedDirectory = datasetPath(rootDir, CDP_AUTHENTICATED_SOURCES_DATASET_NAME);
  const hasLegacyCdpRoot = hasChunksJsonl(cdpAuthenticatedDirectory);
  resolved.push({
    id: CDP_AUTHENTICATED_SOURCES_DATASET_NAME,
    directory: cdpAuthenticatedDirectory,
    state: !hasAnyCdpSplitDataset && hasLegacyCdpRoot ? "legacy_fallback" : "disabled",
    reason: hasAnyCdpSplitDataset
      ? "split CDP authenticated datasets take precedence over the legacy root output"
      : hasLegacyCdpRoot
        ? "legacy CDP authenticated root output is present and split outputs are absent"
        : "legacy CDP authenticated root output is absent",
  });

  const splitDatasets = EWIL_AUTHENTICATED_SPLIT_DATASET_NAMES.map((name) => {
    const directory = datasetPath(rootDir, name);
    return { name, directory, hasChunks: hasChunksJsonl(directory) };
  });
  const hasAnySplitDataset = splitDatasets.some((dataset) => dataset.hasChunks);
  for (const dataset of splitDatasets) {
    resolved.push({
      id: dataset.name,
      directory: dataset.directory,
      state: dataset.hasChunks ? "active" : "disabled",
      reason: dataset.hasChunks ? "split E-WIL authenticated dataset is present" : "split E-WIL authenticated dataset is absent",
    });
  }

  const legacyEwilRootDirectory = datasetPath(rootDir, EWIL_AUTHENTICATED_SOURCES_ROOT_NAME);
  const hasLegacyEwilRoot = hasChunksJsonl(legacyEwilRootDirectory);
  resolved.push({
    id: EWIL_AUTHENTICATED_SOURCES_ROOT_NAME,
    directory: legacyEwilRootDirectory,
    state: !hasAnySplitDataset && hasLegacyEwilRoot ? "legacy_fallback" : "disabled",
    reason: hasAnySplitDataset
      ? "split E-WIL authenticated datasets take precedence over the legacy root output"
      : hasLegacyEwilRoot
        ? "legacy E-WIL authenticated root output is present and split outputs are absent"
        : "legacy E-WIL authenticated root output is absent",
  });

  return resolved;
}

export function loadableKnowledgeBaseDirectories(datasets: readonly ResolvedKnowledgeBaseDataset[]): string[] {
  return datasets.filter((dataset) => dataset.state === "active" || dataset.state === "legacy_fallback").map((dataset) => dataset.directory);
}

function datasetPath(rootDir: string, datasetName: string): string {
  return join(rootDir, datasetName);
}

function hasChunksJsonl(directory: string): boolean {
  return existsSync(join(directory, "chunks.jsonl"));
}
