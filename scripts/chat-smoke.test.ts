import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import type { ChatModelProvider } from "../src/chat/provider.js";
import {
  createSmokeProvider,
  getSmokeProviderOptions,
  parseSmokeTimeoutMs,
  redactSecretLikeText,
} from "./chat-smoke-config.js";

describe("chat smoke configuration", () => {
  it("loads dotenv before smoke helpers in the CLI entrypoint by source inspection", async () => {
    const source = await readFile(new URL("./chat-smoke.ts", import.meta.url), "utf8");
    const dotenvIndex = source.indexOf('import "dotenv/config";');
    const helperIndex = source.indexOf('from "./chat-smoke-config.js"');

    expect(dotenvIndex).toBe(0);
    expect(helperIndex).toBeGreaterThan(dotenvIndex);
  });

  it("uses a 90 second default smoke timeout", () => {
    expect(parseSmokeTimeoutMs(undefined)).toBe(90_000);
    expect(getSmokeProviderOptions({}).timeout_ms).toBe(90_000);
  });

  it("accepts a positive integer timeout override", () => {
    expect(parseSmokeTimeoutMs("120000")).toBe(120_000);
    expect(getSmokeProviderOptions({ OPENAI_COMPAT_TIMEOUT_MS: "45000" })).toEqual({ timeout_ms: 45_000 });
  });

  it("rejects invalid timeout overrides without echoing supplied values", () => {
    const invalidValues = ["0", "-1", "30000.5", "not-a-number", "secret-test-key-with-invalid-timeout"];

    for (const invalidValue of invalidValues) {
      expect(() => parseSmokeTimeoutMs(invalidValue)).toThrow(/OPENAI_COMPAT_TIMEOUT_MS/u);
      try {
        parseSmokeTimeoutMs(invalidValue);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).not.toContain(invalidValue);
      }
    }
  });

  it("forwards the parsed timeout to provider construction through an injected factory", () => {
    const env = {
      OPENAI_COMPAT_BASE_URL: "https://llm.example.test/v1",
      OPENAI_COMPAT_API_KEY: "secret-test-key",
      OPENAI_COMPAT_MODEL: "career-chat-test-model",
    };
    const calls: Array<{ env: Record<string, string | undefined>; options: { timeout_ms: number } }> = [];
    const provider: ChatModelProvider = {
      complete: () => Promise.resolve({ content: "테스트", model: "career-chat-test-model" }),
      getSafeConfig: () => ({ provider: "openai-compatible", base_url: "https://llm.example.test", model: "career-chat-test-model" }),
    };

    const result = createSmokeProvider(env, {
      providerFactory: (receivedEnv, options) => {
        calls.push({ env: receivedEnv, options });
        return provider;
      },
    });

    expect(result).toBe(provider);
    expect(calls).toEqual([{ env, options: { timeout_ms: 90_000 } }]);
  });

  it("forwards configured timeout overrides to provider construction", () => {
    const env = {
      OPENAI_COMPAT_BASE_URL: "https://llm.example.test/v1",
      OPENAI_COMPAT_API_KEY: "secret-test-key",
      OPENAI_COMPAT_MODEL: "career-chat-test-model",
      OPENAI_COMPAT_TIMEOUT_MS: "123456",
    };
    let forwardedTimeout: number | undefined;
    const provider: ChatModelProvider = {
      complete: () => Promise.resolve({ content: "테스트", model: "career-chat-test-model" }),
      getSafeConfig: () => ({ provider: "openai-compatible", base_url: "https://llm.example.test", model: "career-chat-test-model" }),
    };

    createSmokeProvider(env, {
      providerFactory: (_receivedEnv, options) => {
        forwardedTimeout = options.timeout_ms;
        return provider;
      },
    });

    expect(forwardedTimeout).toBe(123_456);
  });

  it("redacts bearer tokens, OpenAI-compatible API keys, and long secret-like strings", () => {
    const longSecret = "sk_test_abcdefghijklmnopqrstuvwxyz1234567890";
    const redacted = redactSecretLikeText(
      `missing OPENAI_COMPAT_BASE_URL but saw Authorization: Bearer ${longSecret} and OPENAI_COMPAT_API_KEY=secret-test-key-plus-abcdefghijklmnopqrstuvwxyz`,
    );

    expect(redacted).toContain("OPENAI_COMPAT_BASE_URL");
    expect(redacted).toContain("Authorization: Bearer [redacted]");
    expect(redacted).toContain("OPENAI_COMPAT_API_KEY=[redacted]");
    expect(redacted).not.toContain(longSecret);
    expect(redacted).not.toContain("secret-test-key-plus-abcdefghijklmnopqrstuvwxyz");
  });
});
