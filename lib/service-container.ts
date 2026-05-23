import { ChatService } from "../src/chat/chat-service.js";
import { createOpenAiCompatibleChatProviderFromEnv } from "../src/chat/openai-compatible-provider.js";
import type { ReloadableKnowledgeBaseRetrieverOptions } from "../src/knowledge-base/reloadable-retriever-service.js";
import { ReloadableKnowledgeBaseRetriever } from "../src/knowledge-base/reloadable-retriever-service.js";
import { PreferenceService } from "../src/personalization/preference-service.js";
import { InMemoryPreferenceStore } from "../src/personalization/preference-store.js";
import { RecommendationService } from "../src/recommendations/recommendation-service.js";

type ChatLike = Pick<ChatService, "ask">;
type RecommendationLike = Pick<RecommendationService, "recommend">;
type PreferenceLike = Pick<PreferenceService, "readState" | "setPreferences" | "updatePreferences" | "clearPreferences">;

let chatOverride: ChatLike | undefined;
let recommendationOverride: RecommendationLike | undefined;
let preferenceOverride: PreferenceLike | undefined;
let chatService: ChatService | undefined;
let recommendationService: RecommendationService | undefined;
let preferenceService: PreferenceService | undefined;
let knowledgeBaseRetrieverService: ReloadableKnowledgeBaseRetriever | undefined;
let knowledgeBaseRetrieverOptionsForTest: ReloadableKnowledgeBaseRetrieverOptions | undefined;

export function getKnowledgeBaseRetrieverService(): ReloadableKnowledgeBaseRetriever {
  knowledgeBaseRetrieverService ??= new ReloadableKnowledgeBaseRetriever(knowledgeBaseRetrieverOptionsForTest);
  return knowledgeBaseRetrieverService;
}

export function getPreferenceService(): PreferenceLike {
  if (preferenceOverride !== undefined) return preferenceOverride;
  preferenceService ??= new PreferenceService(new InMemoryPreferenceStore());
  return preferenceService;
}

export function getChatService(): ChatLike {
  if (chatOverride !== undefined) return chatOverride;
  chatService ??= new ChatService({
    retriever: getKnowledgeBaseRetrieverService(),
    provider: createOpenAiCompatibleChatProviderFromEnv(process.env),
    preferenceService: getPreferenceService(),
    auditLogPath: "data/audit/phase5-chat.jsonl",
  });
  return chatService;
}

export function getRecommendationService(): RecommendationLike {
  if (recommendationOverride !== undefined) return recommendationOverride;
  recommendationService ??= new RecommendationService({
    retriever: getKnowledgeBaseRetrieverService(),
    preferenceService: getPreferenceService() as PreferenceService,
  });
  return recommendationService;
}

export function overrideServicesForTest(overrides: {
  chat?: ChatLike;
  recommendation?: RecommendationLike;
  preference?: PreferenceLike;
}) {
  chatOverride = overrides.chat;
  recommendationOverride = overrides.recommendation;
  preferenceOverride = overrides.preference;
}

export function resetServiceContainerForTest() {
  chatOverride = undefined;
  recommendationOverride = undefined;
  preferenceOverride = undefined;
  chatService = undefined;
  recommendationService = undefined;
  preferenceService = undefined;
  knowledgeBaseRetrieverService = undefined;
  knowledgeBaseRetrieverOptionsForTest = undefined;
}

export function overrideKnowledgeBaseRetrieverForTest(options: ReloadableKnowledgeBaseRetrieverOptions) {
  knowledgeBaseRetrieverOptionsForTest = options;
  knowledgeBaseRetrieverService = undefined;
  chatService = undefined;
  recommendationService = undefined;
}
