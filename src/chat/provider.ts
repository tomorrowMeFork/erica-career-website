export type ChatModelMessage = {
  role: "system" | "developer" | "user" | "assistant";
  content: string;
};

export type ChatModelRequest = {
  messages: ChatModelMessage[];
  temperature?: number;
  max_tokens?: number;
};

export type ChatModelResponse = {
  content: string;
  model: string;
  raw?: unknown;
};

export interface ChatModelProvider {
  complete(request: ChatModelRequest): Promise<ChatModelResponse>;
  getSafeConfig(): {
    provider: "openai-compatible";
    base_url: string;
    model: string;
    temperature?: number;
    max_tokens?: number;
  };
}

export class MockChatModelProvider implements ChatModelProvider {
  readonly requests: ChatModelRequest[] = [];

  constructor(private readonly response: ChatModelResponse) {}

  async complete(request: ChatModelRequest): Promise<ChatModelResponse> {
    this.requests.push(request);
    return this.response;
  }

  getSafeConfig(): ReturnType<ChatModelProvider["getSafeConfig"]> {
    return { provider: "openai-compatible", base_url: "mock://openai-compatible", model: this.response.model };
  }
}
