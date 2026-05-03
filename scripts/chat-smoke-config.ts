import type { ChatModelProvider } from "../src/chat/provider.js";
import { createOpenAiCompatibleChatProviderFromEnv } from "../src/chat/openai-compatible-provider.js";

const defaultSmokeTimeoutMs = 90_000;

type SmokeEnv = Record<string, string | undefined>;
type SmokeProviderOptions = { timeout_ms: number };
type SmokeProviderFactory = (env: SmokeEnv, options: SmokeProviderOptions) => ChatModelProvider;

export function parseSmokeTimeoutMs(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) {
    return defaultSmokeTimeoutMs;
  }

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/u.test(trimmed)) {
    throw new Error("OPENAI_COMPAT_TIMEOUT_MS must be a positive integer in milliseconds");
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("OPENAI_COMPAT_TIMEOUT_MS must be a safe positive integer in milliseconds");
  }

  return parsed;
}

export function getSmokeProviderOptions(env: SmokeEnv): SmokeProviderOptions {
  return { timeout_ms: parseSmokeTimeoutMs(env.OPENAI_COMPAT_TIMEOUT_MS) };
}

export function createSmokeProvider(
  env: SmokeEnv,
  deps: { providerFactory?: SmokeProviderFactory } = {},
): ChatModelProvider {
  const providerFactory: SmokeProviderFactory = deps.providerFactory ?? createOpenAiCompatibleChatProviderFromEnv;
  return providerFactory(env, getSmokeProviderOptions(env));
}

export function redactSecretLikeText(value: string): string {
  return value
    .replace(/Authorization\s*:\s*Bearer\s+[^\s,;]+/giu, "Authorization: Bearer [redacted]")
    .replace(/OPENAI_COMPAT_API_KEY\s*=\s*[^\s,;]+/gu, "OPENAI_COMPAT_API_KEY=[redacted]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/gu, "[redacted]");
}
