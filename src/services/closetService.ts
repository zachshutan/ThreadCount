import { supabase } from "../lib/supabase";

export type ClosetEntry = {
  id: string;
  user_id: string;
  item_id: string;
  entry_type: "owned" | "interested";
  color: string | null;
  created_at: string;
  items?: {
    id: string;
    model_name: string;
    category: string;
    brands: { name: string } | null;
    subtypes: { name: string } | null;
  } | null;
  scores?: {
    category_rank: number | null;
    overall_score: number | null;
  } | null;
};

type QueryResult<T> = { data: T | null; error: { message: string } | null };

export async function getCloset(userId: string): Promise<QueryResult<ClosetEntry[]>> {
  const { data, error } = await supabase
    .from("closet_entries")
    .select("*, items(id, model_name, category, brands(name), subtypes(name)), scores(category_rank, overall_score)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function addToCloset(params: {
  userId: string;
  itemId: string;
  entryType: "owned" | "interested";
  color: string | null;
}): Promise<QueryResult<ClosetEntry>> {
  const { data, error } = await supabase
    .from("closet_entries")
    .insert({
      user_id: params.userId,
      item_id: params.itemId,
      entry_type: params.entryType,
      color: params.color,
    })
    .select()
    .single();

  return { data, error };
}

export async function upgradeToOwned(
  entryId: string,
  color: string | null
): Promise<QueryResult<ClosetEntry>> {
  const { data, error } = await supabase
    .from("closet_entries")
    .update({ entry_type: "owned", color })
    .eq("id", entryId)
    .select()
    .single();

  return { data, error };
}

export type ComparisonHistoryEntry = {
  id: string;
  outcome: "win" | "loss";
  comparisonType: "same_category" | "cross_category";
  opponentItemName: string;
  createdAt: string;
};

export async function getComparisonHistory(
  entryId: string
): Promise<ComparisonHistoryEntry[]> {
  const { data, error } = await supabase
    .from("comparisons")
    .select(
      `id, winner_entry_id, loser_entry_id, comparison_type, created_at,
       winner_entry:closet_entries!winner_entry_id(item_id, items(model_name)),
       loser_entry:closet_entries!loser_entry_id(item_id, items(model_name))`
    )
    .or(`winner_entry_id.eq.${entryId},loser_entry_id.eq.${entryId}`)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => {
    const isWinner = row.winner_entry_id === entryId;
    const opponentEntry = isWinner ? row.loser_entry : row.winner_entry;
    const opponentName = opponentEntry?.items?.model_name ?? "Unknown item";

    return {
      id: row.id,
      outcome: isWinner ? "win" : "loss",
      comparisonType: row.comparison_type,
      opponentItemName: opponentName,
      createdAt: row.created_at,
    };
  });
}

export async function getClosetEntryForItem(
  userId: string,
  itemId: string
): Promise<ClosetEntry | null> {
  const { data } = await supabase
    .from("closet_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();

  return data ?? null;
}
