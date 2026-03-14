import { supabase } from "../lib/supabase";

export type ClosetEntry = {
  id: string;
  user_id: string;
  item_id: string;
  entry_type: "owned" | "interested";
  color: string;
  created_at: string;
  items?: {
    id: string;
    model_name: string;
    category: string;
    brands: { name: string } | null;
    subtypes: { name: string } | null;
  } | null;
};

type QueryResult<T> = { data: T | null; error: { message: string } | null };

export async function getCloset(userId: string): Promise<QueryResult<ClosetEntry[]>> {
  const { data, error } = await supabase
    .from("closet_entries")
    .select("*, items(id, model_name, category, brands(name), subtypes(name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function addToCloset(params: {
  userId: string;
  itemId: string;
  entryType: "owned" | "interested";
  color: string;
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
  color: string
): Promise<QueryResult<ClosetEntry>> {
  const { data, error } = await supabase
    .from("closet_entries")
    .update({ entry_type: "owned", color })
    .eq("id", entryId)
    .select()
    .single();

  return { data, error };
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
