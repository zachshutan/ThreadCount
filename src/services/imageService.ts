import { supabase } from "../lib/supabase";

export type ItemImage = {
  id: string;
  url: string;
  sort_order: number;
};

export async function getItemImages(itemId: string): Promise<ItemImage[]> {
  const { data } = await supabase
    .from("images")
    .select("id, url, sort_order")
    .eq("item_id", itemId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return data ?? [];
}
