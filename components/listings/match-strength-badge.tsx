import type { MatchStrength } from "../../src/recommendations/recommendation-contract.js";
import { getMatchStrengthLabel } from "../../lib/deadline-labels.js";
import { Badge } from "../ui/badge.js";

export function MatchStrengthBadge({ strength }: { strength: MatchStrength }) {
  return (
    <Badge variant="outline" aria-label={`추천 유형: ${getMatchStrengthLabel(strength)}`} className="border-accent/50 bg-accent/15 text-accent-foreground">
      {getMatchStrengthLabel(strength)}
    </Badge>
  );
}
