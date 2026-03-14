import { supabase } from "../lib/supabase";

export type Review = {
  id: string;
  user_id: string;
  item_id: string;
  body: string;
  fit_rating: number;
  quality_rating: number;
  created_at: string;
  profiles?: { username: string } | null;
};

type QueryResult<T> = { data: T | null; error: { message: string } | null };

export async function submitReview(params: {
  itemId: string;
  body: string;
  fitRating: number;
  qualityRating: number;
}): Promise<QueryResult<Review>> {
  const { data, error } = await supabase.functions.invoke("check-review-gate", {
    body: {
      item_id: params.itemId,
      body: params.body,
      fit_rating: params.fitRating,
      quality_rating: params.qualityRating,
    },
  });

  return { data: data ?? null, error: error ?? null };
}

export async function getReviewsForItem(
  itemId: string
): Promise<QueryResult<Review[]>> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles(username)")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  return { data, error };
}
