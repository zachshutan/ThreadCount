import { supabase } from "../lib/supabase";
import { incrementScore } from "./scoreService";

type ComparisonResult = { error: { message: string } | null };

export async function recordComparison(params: {
  userId: string;
  winnerEntryId: string;
  loserEntryId: string;
  comparisonType: "same_category" | "cross_category";
}): Promise<ComparisonResult> {
  const { error } = await supabase.from("comparisons").insert({
    user_id: params.userId,
    winner_entry_id: params.winnerEntryId,
    loser_entry_id: params.loserEntryId,
    comparison_type: params.comparisonType,
  });

  if (error) return { error };

  // Increment scores for both entries (fire-and-forget — don't await serially)
  await Promise.all([
    incrementScore({
      closetEntryId: params.winnerEntryId,
      outcome: "win",
      comparisonType: params.comparisonType,
    }),
    incrementScore({
      closetEntryId: params.loserEntryId,
      outcome: "loss",
      comparisonType: params.comparisonType,
    }),
  ]);

  return { error: null };
}

export async function recordRankingComparison(params: {
  userId: string;
  winnerEntryId: string;
  loserEntryId: string;
}): Promise<ComparisonResult> {
  const { error } = await supabase.from("comparisons").insert({
    user_id: params.userId,
    winner_entry_id: params.winnerEntryId,
    loser_entry_id: params.loserEntryId,
    comparison_type: "ranking",
  });

  return { error: error ?? null };
}
