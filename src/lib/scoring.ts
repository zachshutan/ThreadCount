export type ConfidenceLevel = "low" | "medium" | "high";

/**
 * Calculates a display score (1.0–10.0) from an exact rank position.
 * rank 1 = best = 10.0, rank totalInCategory = worst = 1.0.
 * When only one item exists in the category, it always receives 10.0.
 *
 * Formula: 10 - ((rank - 1) / max(totalInCategory - 1, 1)) * 9
 */
export function calculateScoreFromRank(rank: number, totalInCategory: number): number {
  return 10 - ((rank - 1) / Math.max(totalInCategory - 1, 1)) * 9;
}

/**
 * Calculates overall score (0–10) from wins and losses.
 * Returns 5.0 if no comparisons have been made (avoids division by zero).
 */
export function calculateOverallScore(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 5.0;
  return (wins / total) * 10;
}

/**
 * Calculates category score (0–10) from category-scoped wins and losses.
 * Returns 5.0 if no category comparisons have been made.
 */
export function calculateCategoryScore(
  categoryWins: number,
  categoryLosses: number
): number {
  const total = categoryWins + categoryLosses;
  if (total === 0) return 5.0;
  return (categoryWins / total) * 10;
}

/**
 * Returns confidence level based on total comparison count.
 * low: 0–4, medium: 5–15, high: 16+
 */
export function calculateConfidence(totalComparisons: number): ConfidenceLevel {
  if (totalComparisons <= 4) return "low";
  if (totalComparisons <= 15) return "medium";
  return "high";
}
