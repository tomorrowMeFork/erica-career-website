import type { RecommendationItem } from "../../src/recommendations/recommendation-contract.js";
import { getMatchStrengthLabel } from "../../lib/deadline-labels.js";

export function AnswerAttachedRecommendations({ items }: { items: RecommendationItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="attached-recommendations" aria-label="관련 추천 공고">
      {items.map((item) => (
        <article key={item.recommendation_id} className="recommendation-card card-surface">
          <h4>{item.title}</h4>
          <span>{getMatchStrengthLabel(item.match_strength)} · 점수 {item.score.toFixed(2)}</span>
          <ul>{(item.match_reasons ?? []).slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul>
          <p>{item.citations.map((citation) => `[${citation.citation_id}]`).join(" ")}</p>
        </article>
      ))}
    </section>
  );
}
