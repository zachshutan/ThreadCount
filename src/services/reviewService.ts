import { supabase } from "../lib/supabase";

export type Review = {
  id: string;
  user_id: string;
  item_id: string;
  body: string;
  fit_rating: number;
  quality_rating: number;
  created_at: string;
  profiles: { username: string } | null;
};

export async function getReviewsForItem(itemId: string): Promise<Review[]> {
  const { data } = await supabase
    .from("reviews")
    .select("*, profiles(username)")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  return data ?? [];
}
