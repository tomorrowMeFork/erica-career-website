import type { ChatCitation, ChatResponse } from "../../src/chat/chat-contract.js";
import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { AssistantAnswer } from "./assistant-answer.js";
import { UserMessage } from "./user-message.js";

export type DashboardMessage = { id: string; role: "user"; query: string } | { id: string; role: "assistant"; response: ChatResponse; status: "complete" | "loading"; recommendations?: RecommendationItem[] };

const exampleQuestions = ["이번 주 마감 공고 알려줘", "컴퓨터공학 전공에게 맞는 활동은?", "이 공고 지원해도 될까?", "대외활동/인턴 중 뭐가 더 좋을까?"];

export function ChatMessageList({ messages, onOpenCitation, onSelectExample }: { messages: DashboardMessage[]; onOpenCitation: (citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => void; onSelectExample?: (question: string) => void }) {
  if (messages.length === 0) return (
    <div className="empty-chat card-surface">
      <h2>어떤 점이 궁금하신가요?</h2>
      <p>공고 선택, 활동 비교, 지원 가능성처럼 지금 고민 중인 내용을 편하게 적어보세요.</p>
      <section className="empty-chat__examples" aria-label="예시 질문">
        <h3>예시 질문</h3>
        <ul>
          {exampleQuestions.map((question) => <li key={question}><button type="button" className="pill-control question-chip" onClick={() => onSelectExample?.(question)}>{question}</button></li>)}
        </ul>
      </section>
      <p className="empty-chat__limits">답변 아래에서 참고한 공고와 원문을 확인할 수 있어요.</p>
    </div>
  );
  return <section className="message-list" aria-label="대화 기록">{messages.map((message) => message.role === "user" ? <UserMessage key={message.id} query={message.query} /> : <AssistantAnswer key={message.id} response={message.response} recommendations={message.recommendations} onOpenCitation={onOpenCitation} />)}</section>;
}
