import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export type VerifyPhase6SafetyResult = { ok: boolean; failures: string[] };

const requiredChecks = [
  {
    file: "components/safety/disclaimer-notice.tsx",
    pattern: /(?=[\s\S]*참고용 안내)(?=[\s\S]*공식 출처 페이지에서 확인)(?=[\s\S]*공식 한양대학교 인증 서비스가 아님)(?=[\s\S]*취업 결과를 보장하지 않)/u,
    label: "Korean informational disclaimer",
  },
  {
    file: "components/dashboard/student-dashboard.tsx",
    pattern: /import \{ DisclaimerNotice \} from "\.\.\/safety\/disclaimer-notice\.js";[\s\S]*<DisclaimerNotice \/>/u,
    label: "dashboard disclaimer mount",
  },
  {
    file: "package.json",
    pattern: /"verify:phase6-safety"\s*:\s*"tsx scripts\/verify-phase6-safety\.ts"/u,
    label: "phase6 safety npm script",
  },
  {
    file: "components/citations/source-card.tsx",
    pattern: /공식 페이지 열기|noopener noreferrer/u,
    label: "safe official source links",
  },
];

const prohibited = [
  { pattern: /공식\s*한양(?:대학교)?\s*(?:인증|승인|제휴)\s*서비스(?:입니다|임|다)/u, label: "official endorsement claim" },
  { pattern: /(?:취업|합격|채용)\s*(?:결과를\s*)?(?:반드시\s*)?보장(?:합니다|함|된다|됩니다)/u, label: "guaranteed outcome claim" },
  { pattern: /process\.env\.[A-Z0-9_]+/u, label: "environment value reference" },
  { pattern: /(?:api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_-]{12,}["']/iu, label: "secret-like literal" },
  { pattern: /\bSSO\b|싱글\s*사인온/u, label: "SSO scope token" },
  { pattern: /production crawling|프로덕션\s*크롤/u, label: "production crawling scope token" },
  { pattern: /saved jobs|저장한\s*공고|deadline reminders|마감\s*알림|resume tooling|resume tool|이력서\s*(?:작성|첨삭|도구)/iu, label: "deferred career-tool scope token" },
  { pattern: /private\/?auth(?:enticated)? crawling|authenticated\/?private pages|비공개\s*페이지|인증\s*페이지\s*크롤/u, label: "private authenticated crawling scope token" },
];

export function verifyPhase6Safety(rootDir = process.cwd()): VerifyPhase6SafetyResult {
  const failures: string[] = [];

  for (const check of requiredChecks) {
    const text = readSource(rootDir, check.file);
    if (text === undefined || !check.pattern.test(stripComments(text))) failures.push(`missing ${check.label} in ${check.file}`);
  }

  const sweepFiles = [
    "package.json",
    ...collectSourceFiles(rootDir, "app"),
    ...collectSourceFiles(rootDir, "components"),
    ...collectSourceFiles(rootDir, "lib"),
  ];

  for (const file of sweepFiles) {
    if (file.endsWith("verify-phase6-safety.ts") || file.endsWith("verify-phase6-safety.test.ts")) continue;
    const text = readSource(rootDir, file);
    if (text === undefined) continue;
    const source = stripComments(text);
    for (const item of prohibited) {
      if (item.pattern.test(source)) failures.push(`prohibited Phase 6 safety token ${item.label} in ${file}`);
    }
  }

  return { ok: failures.length === 0, failures };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = verifyPhase6Safety(process.argv[2] ?? process.cwd());
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, checked: "phase6-safety" }));
  }
}

function readSource(rootDir: string, file: string): string | undefined {
  const path = join(rootDir, file);
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

function collectSourceFiles(rootDir: string, directory: string): string[] {
  const root = join(rootDir, directory);
  if (!existsSync(root)) return [];
  const result: string[] = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) visit(full);
      else if (/\.(ts|tsx|css|json|md)$/u.test(entry)) result.push(full.slice(rootDir.length + 1));
    }
  };
  visit(root);
  return result;
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*\/\/.*$/gmu, "")
    .replace(/^\s*#.*$/gmu, "");
}
