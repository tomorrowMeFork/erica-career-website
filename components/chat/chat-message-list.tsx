import type { ChatCitation, ChatResponse } from "../../src/chat/chat-contract.js";
import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { EmptyState } from "../common/empty-state.js";
import { LoadingState } from "../common/loading-state.js";
import { Button } from "../ui/button.js";
import { AssistantAnswer } from "./assistant-answer.js";
import { UserMessage } from "./user-message.js";

export type DashboardMessage = { id: string; role: "user"; query: string } | { id: string; role: "assistant"; response: ChatResponse; status: "complete" | "loading"; recommendations?: RecommendationItem[] };

const exampleQuestions = ["이번 주 마감 공고 알려줘", "컴퓨터공학 전공에게 맞는 활동은?", "이 공고 지원해도 될까?", "대외활동/인턴 중 뭐가 더 좋을까?"];

export function ChatMessageList({ messages, onOpenCitation, onSelectExample }: { messages: DashboardMessage[]; onOpenCitation: (citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => void; onSelectExample?: (question: string) => void }) {
  if (messages.length === 0) return (
    <EmptyState
      title="어떤 점이 궁금하신가요?"
      body="공고 선택, 활동 비교, 지원 가능성처럼 지금 고민 중인 내용을 편하게 적어보세요."
      className="mx-auto max-w-3xl"
    >
      <div className="grid gap-3" aria-label="예시 질문">
        <div className="grid gap-1">
          <h3 className="text-sm font-medium text-foreground">예시 질문</h3>
          <p className="mx-auto max-w-xl text-sm leading-6 break-keep text-muted-foreground">답변 아래에서 참고한 공고와 원문을 확인할 수 있어요.</p>
        </div>
        <ul className="flex flex-wrap justify-center gap-2">
          {exampleQuestions.map((question) => (
            <li key={question}>
              <Button type="button" variant="outline" size="sm" className="h-auto min-h-9 rounded-full border-primary/20 bg-background/80 px-3 py-2 whitespace-normal break-keep text-primary hover:bg-secondary" onClick={() => onSelectExample?.(question)}>
                {question}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </EmptyState>
  );
  return <section className="grid min-w-0 content-start gap-4" aria-label="대화 기록">{messages.map((message) => message.role === "user" ? <UserMessage key={message.id} query={message.query} /> : message.status === "loading" ? <LoadingState key={message.id} /> : <AssistantAnswer key={message.id} response={message.response} recommendations={message.recommendations} onOpenCitation={onOpenCitation} />)}</section>;
}
