import { describe, expect, it } from "vitest";

import { createOpenAiCompatibleChatProviderFromEnv } from "./openai-compatible-provider.js";

describe("OpenAI-compatible chat provider", () => {
  it("sends OpenAI-compatible chat completions with injected fetch and env model", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "안녕하세요. 근거를 확인했습니다. [1]" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const provider = createOpenAiCompatibleChatProviderFromEnv(
      {
        OPENAI_COMPAT_BASE_URL: "https://llm.example.test/v1/",
        OPENAI_COMPAT_API_KEY: "secret-test-key",
        OPENAI_COMPAT_MODEL: "career-chat-test-model",
      },
      { fetch_impl: fetchImpl, temperature: 0.2, max_tokens: 512 },
    );

    const response = await provider.complete({
      messages: [{ role: "user", content: "ERICA 상담예약은 어디서 확인해?" }],
    });

    expect(response).toMatchObject({ content: "안녕하세요. 근거를 확인했습니다. [1]", model: "career-chat-test-model" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://llm.example.test/v1/chat/completions");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.credentials).toBe("omit");
    expect(new Headers(calls[0]?.init.headers).get("content-type")).toBe("application/json");
    expect(new Headers(calls[0]?.init.headers).get("authorization")).toBe("Bearer secret-test-key");

    const body = JSON.parse(String(calls[0]?.init.body)) as {
      model: string;
      messages: unknown[];
      temperature?: number;
      max_tokens?: number;
    };
    expect(body).toMatchObject({ model: "career-chat-test-model", temperature: 0.2, max_tokens: 512 });
    expect(body.messages).toEqual([{ role: "user", content: "ERICA 상담예약은 어디서 확인해?" }]);
  });

  it("redacts secret-test-key from safe config and provider error text", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ error: { message: "quota exceeded", type: "rate_limit_error" } }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });

    const provider = createOpenAiCompatibleChatProviderFromEnv(
      {
        OPENAI_COMPAT_BASE_URL: "https://llm.example.test/openai",
        OPENAI_COMPAT_API_KEY: "secret-test-key",
        OPENAI_COMPAT_MODEL: "career-chat-test-model",
      },
      { fetch_impl: fetchImpl },
    );

    expect(JSON.stringify(provider.getSafeConfig())).not.toContain("secret-test-key");

    await expect(provider.complete({ messages: [{ role: "user", content: "테스트" }] })).rejects.toThrow(
      /429.*llm\.example\.test.*rate_limit_error.*quota exceeded/u,
    );
    await provider.complete({ messages: [{ role: "user", content: "테스트" }] }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain("secret-test-key");
    });
  });
});
