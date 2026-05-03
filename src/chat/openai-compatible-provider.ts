import type { ChatModelProvider, ChatModelRequest, ChatModelResponse } from "./provider.js";

export type OpenAiCompatibleChatProviderOptions = {
  base_url: string;
  api_key: string;
  model: string;
  fetch_impl?: typeof fetch;
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
  timeout_ms?: number;
};

type OpenAiCompatibleEnv = Record<string, string | undefined>;

type OpenAiCompatibleError = {
  message?: string;
  type?: string;
};

type OpenAiCompatibleResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

const defaultTimeoutMs = 30_000;

export class OpenAiCompatibleChatProvider implements ChatModelProvider {
  private readonly baseUrl: URL;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;
  private readonly temperature: number | undefined;
  private readonly maxTokens: number | undefined;
  private readonly signal: AbortSignal | undefined;
  private readonly timeoutMs: number | undefined;

  constructor(options: OpenAiCompatibleChatProviderOptions) {
    this.baseUrl = parseHttpsBaseUrl(options.base_url);
    this.apiKey = assertNonEmpty(options.api_key, "OPENAI_COMPAT_API_KEY");
    this.model = assertNonEmpty(options.model, "OPENAI_COMPAT_MODEL");
    this.fetchImpl = options.fetch_impl ?? fetch;
    this.temperature = options.temperature;
    this.maxTokens = options.max_tokens;
    this.signal = options.signal;
    this.timeoutMs = options.timeout_ms ?? defaultTimeoutMs;
  }

  async complete(request: ChatModelRequest): Promise<ChatModelResponse> {
    const endpoint = new URL("chat/completions", ensureTrailingSlash(this.baseUrl.href));
    const body = buildRequestBody({
      model: this.model,
      request,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    });

    const response = await this.fetchImpl(endpoint.href, {
      method: "POST",
      credentials: "omit",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: composeSignal(this.signal, this.timeoutMs),
    });

    const payload = await readJsonPayload(response);
    if (!response.ok) {
      throw new Error(buildProviderErrorMessage(response.status, this.baseUrl.host, payload));
    }

    return {
      content: extractAssistantContent(payload),
      model: this.model,
      raw: payload,
    };
  }

  getSafeConfig(): ReturnType<ChatModelProvider["getSafeConfig"]> {
    return {
      provider: "openai-compatible",
      base_url: `${this.baseUrl.protocol}//${this.baseUrl.host}`,
      model: this.model,
      ...(this.temperature !== undefined ? { temperature: this.temperature } : {}),
      ...(this.maxTokens !== undefined ? { max_tokens: this.maxTokens } : {}),
    };
  }
}

export function createOpenAiCompatibleChatProviderFromEnv(
  env: OpenAiCompatibleEnv = process.env,
  options: Omit<OpenAiCompatibleChatProviderOptions, "base_url" | "api_key" | "model"> = {},
): OpenAiCompatibleChatProvider {
  return new OpenAiCompatibleChatProvider({
    base_url: assertNonEmpty(env.OPENAI_COMPAT_BASE_URL, "OPENAI_COMPAT_BASE_URL"),
    api_key: assertNonEmpty(env.OPENAI_COMPAT_API_KEY, "OPENAI_COMPAT_API_KEY"),
    model: assertNonEmpty(env.OPENAI_COMPAT_MODEL, "OPENAI_COMPAT_MODEL"),
    ...options,
  });
}

function buildRequestBody(input: {
  model: string;
  request: ChatModelRequest;
  temperature?: number;
  max_tokens?: number;
}): { model: string; messages: ChatModelRequest["messages"]; temperature?: number; max_tokens?: number } {
  const temperature = input.request.temperature ?? input.temperature;
  const maxTokens = input.request.max_tokens ?? input.max_tokens;
  return {
    model: input.model,
    messages: input.request.messages,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
  };
}

async function readJsonPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim().length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
}

function extractAssistantContent(payload: unknown): string {
  if (!isOpenAiCompatibleResponse(payload)) {
    throw new Error("OpenAI-compatible provider response missing choices[0].message.content");
  }
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenAI-compatible provider response missing choices[0].message.content");
  }
  return content;
}

function buildProviderErrorMessage(status: number, host: string, payload: unknown): string {
  const providerError = extractProviderError(payload);
  const detail = providerError
    ? `${providerError.type ?? "provider_error"}: ${providerError.message ?? "unknown provider error"}`
    : "provider_error: unknown provider error";
  return `OpenAI-compatible chat provider failed with HTTP ${status} from ${host}: ${detail}`;
}

function extractProviderError(payload: unknown): OpenAiCompatibleError | undefined {
  if (payload !== null && typeof payload === "object" && "error" in payload) {
    const errorValue = payload.error;
    if (errorValue !== null && typeof errorValue === "object") {
      const maybeMessage = "message" in errorValue ? errorValue.message : undefined;
      const maybeType = "type" in errorValue ? errorValue.type : undefined;
      return {
        ...(typeof maybeMessage === "string" ? { message: maybeMessage } : {}),
        ...(typeof maybeType === "string" ? { type: maybeType } : {}),
      };
    }
  }
  return undefined;
}

function isOpenAiCompatibleResponse(payload: unknown): payload is OpenAiCompatibleResponse {
  return payload !== null && typeof payload === "object" && "choices" in payload && Array.isArray(payload.choices);
}

function parseHttpsBaseUrl(value: string): URL {
  const parsedUrl = new URL(assertNonEmpty(value, "OPENAI_COMPAT_BASE_URL"));
  if (parsedUrl.protocol !== "https:") {
    throw new Error("OPENAI_COMPAT_BASE_URL must use HTTPS");
  }
  return parsedUrl;
}

function assertNonEmpty(value: string | undefined, name: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for OpenAI-compatible chat provider configuration`);
  }
  return value.trim();
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function composeSignal(signal: AbortSignal | undefined, timeoutMs: number | undefined): AbortSignal | undefined {
  const signals: AbortSignal[] = [];
  if (signal) {
    signals.push(signal);
  }
  if (timeoutMs !== undefined) {
    signals.push(createTimeoutSignal(timeoutMs));
  }
  if (signals.length === 0) {
    return undefined;
  }
  if (signals.length === 1) {
    return signals[0];
  }
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(signals);
  }
  return fallbackAnySignal(signals);
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("timeout_ms must be a positive integer");
  }
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  globalThis.setTimeout(() => controller.abort(new Error("OpenAI-compatible provider timeout elapsed")), timeoutMs);
  return controller.signal;
}

function fallbackAnySignal(signals: readonly AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const abort = (signal: AbortSignal) => {
    if (!controller.signal.aborted) {
      controller.abort(signal.reason);
    }
  };

  for (const signal of signals) {
    if (signal.aborted) {
      abort(signal);
      break;
    }
    signal.addEventListener("abort", () => abort(signal), { once: true });
  }

  return controller.signal;
}
