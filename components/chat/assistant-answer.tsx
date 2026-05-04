import type { ChatCitation, ChatResponse } from "../../src/chat/chat-contract.js";
import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { CitationTrigger } from "../citations/citation-trigger.js";
import { InlineCitationMarker } from "../citations/inline-citation-marker.js";
import { AnswerAttachedEvidence } from "./answer-attached-evidence.js";
import { RefusalNoticeCard } from "./refusal-notice-card.js";

export function AssistantAnswer({ response, recommendations = [], onOpenCitation }: { response: ChatResponse; recommendations?: RecommendationItem[]; onOpenCitation: (citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => void }) {
  return (
    <article className="assistant-answer card-surface">
      <RefusalNoticeCard refusalTier={response.refusal_tier} />
      <div className="assistant-answer__body">{renderAnswer(response.answer, response.citations, onOpenCitation)}</div>
      <CitationTrigger count={response.citations.length} onOpen={(opener) => {
        const firstCitation = response.citations[0];
        if (firstCitation !== undefined) onOpenCitation(firstCitation, response.citations, opener);
      }} />
      <div className="answer-meta"><span>출처 기반 답변</span><span>공식 출처 확인 필요</span></div>
      <AnswerAttachedEvidence items={recommendations} />
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
