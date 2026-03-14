import { supabase } from "../lib/supabase";

export type FeedEvent = {
  event_type: "closet_add" | "comparison" | "review";
  event_id: string;
  user_id: string;
  username: string;
  created_at: string;
  item_id: string | null;
  item_name: string | null;
  brand_name: string | null;
  category: string | null;
  overall_score: number | null;
  review_body: string | null;
  fit_rating: number | null;
  quality_rating: number | null;
};

export type FeedCursor = { ts: string; id: string };

type FeedResult = {
  data: FeedEvent[] | null;
  error: { message: string } | null;
  nextCursor: FeedCursor | null;
};

const PAGE_SIZE = 20;

export async function getFeed(params: {
  friendsOnly?: boolean;
  cursor?: FeedCursor;
}): Promise<FeedResult> {
  const { friendsOnly = false, cursor } = params;

  const { data, error } = await supabase.rpc("get_feed", {
    p_friends_only: friendsOnly,
    p_cursor_ts: cursor?.ts ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: PAGE_SIZE,
  });

  if (error || !data) {
    return { data: null, error: error ?? { message: "Unknown error" }, nextCursor: null };
  }

  const events = data as FeedEvent[];
  const nextCursor =
    events.length === PAGE_SIZE
      ? { ts: events[events.length - 1].created_at, id: events[events.length - 1].event_id }
      : null;

  return { data: events, error: null, nextCursor };
}
