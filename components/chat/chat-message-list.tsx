import type { ChatCitation, ChatResponse } from "../../src/chat/chat-contract.js";
import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { AssistantAnswer } from "./assistant-answer.js";
import { UserMessage } from "./user-message.js";

export type DashboardMessage = { id: string; role: "user"; query: string } | { id: string; role: "assistant"; response: ChatResponse; status: "complete" | "loading"; recommendations?: RecommendationItem[] };

export function ChatMessageList({ messages, onOpenCitation }: { messages: DashboardMessage[]; onOpenCitation: (citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => void }) {
  if (messages.length === 0) return (
    <div className="empty-chat card-surface">
      <p className="panel-kicker">Korean-first academic career service</p>
      <h2>무엇을 도와드릴까요?</h2>
      <p>채용 공고, 마감일, 취업 프로그램을 한국어로 질문하면 확인된 출처와 수집일을 함께 보여드려요.</p>
      <section className="empty-chat__examples" aria-label="예시 질문">
        <h3>예시 질문</h3>
        <ul>
          <li>컴퓨터학부 학생이 이번 달 확인할 만한 인턴 정보가 있나요?</li>
          <li>ERICA 학생 대상 취업 프로그램 중 아직 모집 중인 게 있나요?</li>
          <li>최근 수집된 채용 정보 중 IT 직무 관련은 어떤 게 있나요?</li>
        </ul>
      </section>
      <p className="empty-chat__limits">근거가 부족하거나 오래된 정보만 있으면 답변을 제한합니다.</p>
    </div>
  );
  return <section className="message-list" aria-label="대화 기록">{messages.map((message) => message.role === "user" ? <UserMessage key={message.id} query={message.query} /> : <AssistantAnswer key={message.id} response={message.response} recommendations={message.recommendations} onOpenCitation={onOpenCitation} />)}</section>;
}
