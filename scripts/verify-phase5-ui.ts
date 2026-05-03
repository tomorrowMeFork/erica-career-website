import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export type VerifyPhase5Result = { ok: boolean; failures: string[] };

const requiredChecks = [
  { file: "app/layout.tsx", pattern: /lang="ko"/u, label: "html lang=ko" },
  { file: "app/globals.css", pattern: /oklch\(0\.99 0\.004 250\)[\s\S]*oklch\(0\.48 0\.13 252\)[\s\S]*1440px[\s\S]*280px[\s\S]*360px[\s\S]*400px[\s\S]*Pretendard[\s\S]*Noto Sans KR[\s\S]*Apple SD Gothic Neo/u, label: "design tokens" },
  { file: "components/dashboard/student-dashboard.tsx", pattern: /무엇을 도와드릴까요\?|현재 세션에만 저장|fetchRecommendations|clearPreferences/u, label: "dashboard copy and helper wiring" },
  { file: "components/chat/chat-composer.tsx", pattern: /질문 보내기/u, label: "chat CTA" },
  { file: "components/citations/source-card.tsx", pattern: /공식 페이지 열기|noopener noreferrer/u, label: "source safe links" },
  { file: "lib/deadline-labels.ts", pattern: /모집중|마감됨|마감일 확인 필요|답변 근거 부족|확인 필요/u, label: "semantic Korean labels" },
];

const prohibited = [/EventSource/u, /server-side chat history/u, /saved jobs/u, /reminders/u, /resume/u, /SSO/u, /production crawling/u, /application submission/u];

export function verifyPhase5Ui(rootDir = process.cwd()): VerifyPhase5Result {
  const failures: string[] = [];
  for (const check of requiredChecks) {
    const text = readSource(rootDir, check.file);
    if (text === undefined || !check.pattern.test(text)) failures.push(`missing ${check.label} in ${check.file}`);
  }
  for (const file of ["app/layout.tsx", "app/globals.css", ...collectSourceFiles(rootDir, "components"), ...collectSourceFiles(rootDir, "lib")]) {
    const text = readSource(rootDir, file);
    if (text === undefined) continue;
    for (const pattern of prohibited) if (pattern.test(text)) failures.push(`prohibited Phase 5 scope token ${pattern.source} in ${file}`);
  }
  return { ok: failures.length === 0, failures };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = verifyPhase5Ui(process.argv[2] ?? process.cwd());
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, checked: "phase5-ui" }));
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
      else if (/\.(ts|tsx|css)$/u.test(entry)) result.push(full.slice(rootDir.length + 1));
    }
  };
  visit(root);
  return result;
}
