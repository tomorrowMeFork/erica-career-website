import { Children, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

import type { ChatCitation, ChatResponse } from "../../src/chat/chat-contract.js";
import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { CitationTrigger } from "../citations/citation-trigger.js";
import { InlineCitationMarker } from "../citations/inline-citation-marker.js";
import { Badge } from "../ui/badge.js";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card.js";
import { AnswerAttachedEvidence } from "./answer-attached-evidence.js";
import { RefusalNoticeCard } from "./refusal-notice-card.js";

export function AssistantAnswer({ response, recommendations = [], onOpenCitation }: { response: ChatResponse; recommendations?: RecommendationItem[]; onOpenCitation: (citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => void }) {
  return (
    <article aria-label="출처 기반 답변">
      <Card className="erica-surface-strong gap-4 overflow-hidden border-primary/15 py-0">
        <CardHeader className="gap-3 border-b border-primary/10 bg-[linear-gradient(90deg,color-mix(in_oklch,var(--hanyang-blue),transparent_91%),color-mix(in_oklch,var(--hanyang-retro-mint),transparent_88%))] px-5 py-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary">출처 기반 답변</Badge>
            <Badge variant="outline" className="border-[var(--hanyang-gold)]/45 bg-[var(--hanyang-gold)]/10 text-[var(--hanyang-gold)]">공식 출처 확인 필요</Badge>
          </div>
          <CitationTrigger count={response.citations.length} onOpen={(opener) => {
            const firstCitation = response.citations[0];
            if (firstCitation !== undefined) onOpenCitation(firstCitation, response.citations, opener);
          }} />
        </CardHeader>
        <CardContent className="grid gap-4 px-5 pb-6 pt-0 sm:px-6 sm:pb-6">
          <RefusalNoticeCard refusalTier={response.refusal_tier} />
          <div className="grid gap-3 text-base leading-7 text-foreground [&_code]:rounded-[var(--radius-xs)] [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em] [&_em]:text-foreground [&_h2]:border-l-4 [&_h2]:border-primary [&_h2]:pl-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:text-base [&_h3]:font-semibold [&_h4]:text-base [&_h4]:font-semibold [&_li+li]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:m-0 [&_strong]:font-semibold [&_strong]:text-primary [&_ul]:list-disc [&_ul]:pl-5" data-testid="answer-body">
            <ReactMarkdown components={createMarkdownComponents(response.citations, onOpenCitation)} skipHtml>{stripUnsafeHtml(response.answer)}</ReactMarkdown>
          </div>
        </CardContent>
        {recommendations.length > 0 ? (
          <CardFooter className="grid gap-4 border-t px-5 py-5">
            <AnswerAttachedEvidence items={recommendations} />
          </CardFooter>
        ) : null}
      </Card>
    </article>
  );
}

function stripUnsafeHtml(answer: string): string {
  return answer.replace(/<(script|style|iframe)\b[^>]*>[\s\S]*?<\/\1>/giu, "");
}

function createMarkdownComponents(citations: ChatCitation[], onOpenCitation: (citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => void): Components {
  const renderChildren = (children: ReactNode) => renderCitationText(children, citations, onOpenCitation);
  return {
    a: ({ children }) => <span>{renderChildren(children)}</span>,
    em: ({ children }) => <em>{renderChildren(children)}</em>,
    h1: ({ children }) => <h2>{renderChildren(children)}</h2>,
    h2: ({ children }) => <h2>{renderChildren(children)}</h2>,
    h3: ({ children }) => <h3>{renderChildren(children)}</h3>,
    h4: ({ children }) => <h4>{renderChildren(children)}</h4>,
    h5: ({ children }) => <h4>{renderChildren(children)}</h4>,
    h6: ({ children }) => <h4>{renderChildren(children)}</h4>,
    img: () => null,
    li: ({ children }) => <li>{renderChildren(children)}</li>,
    p: ({ children }) => <p>{renderChildren(children)}</p>,
    strong: ({ children }) => <strong>{renderChildren(children)}</strong>,
  };
}

function renderCitationText(children: ReactNode, citations: ChatCitation[], onOpenCitation: (citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => void): ReactNode {
  if (typeof children === "string") return renderCitationString(children, citations, onOpenCitation);
  if (Array.isArray(children)) return Children.map(children, (child) => renderCitationText(child, citations, onOpenCitation));
  return children;
}

function renderCitationString(text: string, citations: ChatCitation[], onOpenCitation: (citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => void): ReactNode[] {
  const nodes: ReactNode[] = [];
  let textCursor = 0;
  for (const match of text.matchAll(/\[(\d+)\]/gu)) {
    if (match.index > textCursor) nodes.push(text.slice(textCursor, match.index));
    const citationId = Number(match[1]);
    const citation = citations.find((candidate) => candidate.citation_id === citationId);
    nodes.push(citation === undefined ? match[0] : <InlineCitationMarker key={`${citationId}-${match.index}`} citation={citation} scopedCitations={citations} onOpen={onOpenCitation} />);
    textCursor = match.index + match[0].length;
  }
  if (textCursor < text.length) nodes.push(text.slice(textCursor));
  return nodes.length === 0 ? [text] : nodes;
}
