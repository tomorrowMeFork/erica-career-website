import { runReleaseReadinessEvaluation } from "./evaluate-release-readiness.js";
import { getFreshnessStatus, listLocalKnowledgeBaseDirs, type ReleaseEvaluationStatus } from "../src/operations/freshness-status.js";

const directories = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const warnings: string[] = [];
const releaseEvaluation = await evaluateReleaseReadiness(warnings);
const status = getFreshnessStatus({
  directories: directories.length > 0 ? directories : listLocalKnowledgeBaseDirs(process.cwd()),
  releaseEvaluation,
  warnings,
});

console.log(JSON.stringify(status, null, 2));

async function evaluateReleaseReadiness(warnings: string[]): Promise<ReleaseEvaluationStatus> {
  try {
    const result = await runReleaseReadinessEvaluation({ env: {}, writeOutput: false });
    return { status: result.ok ? "passed" : "failed", checked_at: new Date().toISOString() };
  } catch (_error) {
    warnings.push("release readiness evaluation could not be completed deterministically");
    return { status: "unknown", checked_at: null };
  }
}
