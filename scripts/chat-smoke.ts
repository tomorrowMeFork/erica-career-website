import { ChatService } from "../src/chat/chat-service.js";
import { createOpenAiCompatibleChatProviderFromEnv } from "../src/chat/openai-compatible-provider.js";
import { loadKnowledgeBaseChunks } from "../src/knowledge-base/jsonl-loader.js";
import { Bm25Retriever } from "../src/retrieval/bm25-retriever.js";

const defaultQuery = "ERICA 현장실습 모집 공고 알려줘";

async function runCli(): Promise<void> {
  const query = process.argv.slice(2).join(" ").trim() || defaultQuery;
  const chunks = loadKnowledgeBaseChunks();
  const retriever = new Bm25Retriever(chunks);
  const provider = createOpenAiCompatibleChatProviderFromEnv();
  const service = new ChatService({
    retriever,
    provider,
    auditLogPath: "data/audit/phase3-chat.jsonl",
  });

  const response = await service.ask({ query });
  console.log(
    JSON.stringify(
      {
        answer: response.answer,
        citations: response.citations,
        refusal_tier: response.refusal_tier,
        confidence: response.confidence,
        trace_id: response.trace_id,
      },
      null,
      2,
    ),
  );
}

function redactSecretLikeText(value: string): string {
  return value
    .replace(/Authorization\s*:\s*Bearer\s+[^\s,;]+/giu, "Authorization: Bearer [redacted]")
    .replace(/OPENAI_COMPAT_API_KEY\s*=\s*[^\s,;]+/gu, "OPENAI_COMPAT_API_KEY=[redacted]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/gu, "[redacted]");
}

runCli().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`chat_smoke_failed: ${redactSecretLikeText(message)}`);
  process.exitCode = 1;
});
