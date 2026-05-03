import type { ChatCitation, ChatResponse } from "../../src/chat/chat-contract.js";
import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { CitationTrigger } from "../citations/citation-trigger.js";
import { InlineCitationMarker } from "../citations/inline-citation-marker.js";
import { AnswerAttachedRecommendations } from "./answer-attached-recommendations.js";
import { RefusalNoticeCard } from "./refusal-notice-card.js";

export function AssistantAnswer({ response, recommendations = [], onOpenCitation }: { response: ChatResponse; recommendations?: RecommendationItem[]; onOpenCitation: (citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => void }) {
  return (
    <article className="assistant-answer card-surface">
      <RefusalNoticeCard refusalTier={response.refusal_tier} />
      <div>{renderAnswer(response.answer, response.citations, onOpenCitation)}</div>
      <CitationTrigger count={response.citations.length} onOpen={(opener) => {
        const firstCitation = response.citations[0];
        if (firstCitation !== undefined) onOpenCitation(firstCitation, response.citations, opener);
      }} />
      <p>신뢰도 {Math.round(response.confidence * 100)}%</p>
      <details><summary>응답 추적 ID 보기</summary><code>응답 추적 ID {response.trace_id}</code></details>
      <AnswerAttachedRecommendations items={recommendations} />
    </article>
  );
}

function renderAnswer(answer: string, citations: ChatCitation[], onOpenCitation: (citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => void) {
  const parts = answer.split(/(\[\d+\])/gu);
  return parts.map((part, index) => {
    const match = /^\[(\d+)\]$/u.exec(part);
    if (match === null) return <span key={`${part}-${index}`}>{part.split("\n").map((line, lineIndex) => <span key={`${line}-${lineIndex}`}>{line}{lineIndex < part.split("\n").length - 1 ? <br /> : null}</span>)}</span>;
    const citationId = Number(match[1]);
    const citation = citations.find((candidate) => candidate.citation_id === citationId);
    if (citation === undefined) return <span key={part}>{part}</span>;
    return <InlineCitationMarker key={`${part}-${index}`} citation={citation} scopedCitations={citations} onOpen={onOpenCitation} />;
  });
}
