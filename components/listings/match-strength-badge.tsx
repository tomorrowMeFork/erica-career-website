import type { MatchStrength } from "../../src/recommendations/recommendation-contract.js";
import { getMatchStrengthLabel } from "../../lib/deadline-labels.js";

export function MatchStrengthBadge({ strength }: { strength: MatchStrength }) {
  return <span className="badge badge--accent">{getMatchStrengthLabel(strength)}</span>;
}
