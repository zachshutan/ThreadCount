import { supabase } from "../lib/supabase";
import {
  calculateOverallScore,
  calculateCategoryScore,
  calculateConfidence,
  calculateScoreFromRank,
} from "../lib/scoring";

type ScoreRow = {
  id: string;
  wins: number;
  losses: number;
  category_wins: number;
  category_losses: number;
};

export async function createScoreRow(params: {
  closetEntryId: string;
  itemId: string;
  userId: string;
  category: "top" | "bottom" | "footwear";
}): Promise<void> {
  // upsert with ignoreDuplicates: true so a downgrade→upgrade cycle
  // doesn't overwrite existing scores on the second owned promotion
  await supabase.from("scores").upsert({
    closet_entry_id: params.closetEntryId,
    item_id: params.itemId,
    user_id: params.userId,
    category: params.category,
    overall_score: 5.0,
    category_score: 5.0,
    wins: 0,
    losses: 0,
    category_wins: 0,
    category_losses: 0,
    confidence: "low",
    updated_at: new Date().toISOString(),
  }, { onConflict: "closet_entry_id", ignoreDuplicates: true });
}

export async function incrementScore(params: {
  closetEntryId: string;
  outcome: "win" | "loss";
  comparisonType: "same_category" | "cross_category";
}): Promise<void> {
  const { data: existing, error } = await supabase
    .from("scores")
    .select("id, wins, losses, category_wins, category_losses")
    .eq("closet_entry_id", params.closetEntryId)
    .single();

  if (error || !existing) return;

  const row = existing as ScoreRow;
  const isSameCategory = params.comparisonType === "same_category";
  const isWin = params.outcome === "win";

  const newWins = row.wins + (isWin ? 1 : 0);
  const newLosses = row.losses + (isWin ? 0 : 1);
  const newCategoryWins = row.category_wins + (isSameCategory && isWin ? 1 : 0);
  const newCategoryLosses = row.category_losses + (isSameCategory && !isWin ? 1 : 0);

  await supabase
    .from("scores")
    .update({
      wins: newWins,
      losses: newLosses,
      category_wins: newCategoryWins,
      category_losses: newCategoryLosses,
      overall_score: calculateOverallScore(newWins, newLosses),
      category_score: calculateCategoryScore(newCategoryWins, newCategoryLosses),
      confidence: calculateConfidence(newWins + newLosses),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
}

/**
 * Sets the exact rank position for one item within its category.
 * Call recalculateCategoryScores() after all rank positions are assigned
 * to update the visible scores for every item in the category.
 */
export async function setCategoryRank(params: {
  closetEntryId: string;
  rank: number;
}): Promise<void> {
  await supabase
    .from("scores")
    .update({ category_rank: params.rank })
    .eq("closet_entry_id", params.closetEntryId);
}

type RankedScoreRow = { id: string; category_rank: number };

/**
 * Fetches all ranked items for a user+category (those with a non-null category_rank),
 * then recomputes and saves the overall_score for each based on their rank position.
 * Call this after any rank change: new item added, item deleted, or re-ranking.
 */
export async function recalculateCategoryScores(params: {
  userId: string;
  category: "top" | "bottom" | "footwear";
}): Promise<void> {
  const { data, error } = await supabase
    .from("scores")
    .select("id, category_rank")
    .eq("user_id", params.userId)
    .eq("category", params.category)
    .not("category_rank", "is", null)
    .order("category_rank", { ascending: true });

  if (error || !data || data.length === 0) return;

  const rows = data as RankedScoreRow[];
  const total = rows.length;
  const now = new Date().toISOString();

  await Promise.all(
    rows.map((row) =>
      supabase
        .from("scores")
        .update({
          overall_score: calculateScoreFromRank(row.category_rank, total),
          updated_at: now,
        })
        .eq("id", row.id)
    )
  );
}
