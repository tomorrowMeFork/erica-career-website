import type { ChatResponse } from "../../src/chat/chat-contract.js";
import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { AssistantAnswer } from "./assistant-answer.js";
import { UserMessage } from "./user-message.js";

export type DashboardMessage = { id: string; role: "user"; query: string } | { id: string; role: "assistant"; response: ChatResponse; status: "complete" | "loading"; recommendations?: RecommendationItem[] };

export function ChatMessageList({ messages, onOpenCitation }: { messages: DashboardMessage[]; onOpenCitation: (citationId: number, opener?: HTMLElement) => void }) {
  if (messages.length === 0) return <div className="empty-chat card-surface"><h2>무엇을 도와드릴까요?</h2><p>채용 공고, 마감일, 취업 프로그램을 한국어로 질문하면 확인된 출처를 함께 보여드려요.</p></div>;
  return <section className="message-list" aria-label="대화 기록">{messages.map((message) => message.role === "user" ? <UserMessage key={message.id} query={message.query} /> : <AssistantAnswer key={message.id} response={message.response} recommendations={message.recommendations} onOpenCitation={onOpenCitation} />)}</section>;
}
