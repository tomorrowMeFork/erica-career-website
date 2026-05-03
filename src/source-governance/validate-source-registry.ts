import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { SourceRegistrySchema, type SourceRegistry } from "./source-registry.schema.js";

const defaultRegistryPath = ".planning/phases/01-source-discovery-and-governance/source-registry.yaml";

export function validateSourceRegistryFile(filePath: string): SourceRegistry {
  const fileText = readFileSync(filePath, "utf8");
  const parsedYaml = parse(fileText);
  const validationResult = SourceRegistrySchema.safeParse(parsedYaml);

  if (!validationResult.success) {
    const issueSummary = validationResult.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    console.error(`Source registry validation failed for ${filePath}`);
    console.error(JSON.stringify(issueSummary, null, 2));
    process.exitCode = 1;
    throw new Error("Source registry validation failed");
  }

  return validationResult.data;
}

function runCli(): void {
  const registryPath = process.argv[2] ?? defaultRegistryPath;

  try {
    validateSourceRegistryFile(registryPath);
    console.log(`Source registry valid: ${registryPath}`);
  } catch (error) {
    if (process.exitCode !== 1) {
      const message = error instanceof Error ? error.message : "Unknown validation error";
      console.error(message);
      process.exitCode = 1;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
