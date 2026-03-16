import { supabase } from "../lib/supabase";

type SimpleResult = { error: { message: string } | null };

export async function followUser(
  followerId: string,
  followingId: string
): Promise<SimpleResult> {
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: followerId, following_id: followingId });
  return { error };
}

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<SimpleResult> {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  return { error };
}

export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return data !== null;
}

export async function getPublicCloset(userId: string) {
  const { data, error } = await supabase
    .from("closet_entries")
    .select("*, items(id, model_name, category, brands(name), subtypes(name)), scores(overall_score, category_score, category_rank, confidence)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("id", userId)
    .single();
  return { data, error };
}

export async function getFollowerCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);
  return count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);
  return count ?? 0;
}

export type FollowUser = { id: string; username: string; avatar_url: string | null };

export async function getFollowers(userId: string): Promise<FollowUser[]> {
  const { data } = await supabase
    .from("follows")
    .select("profiles!follower_id(id, username, avatar_url)")
    .eq("following_id", userId);
  return (data ?? []).map((row: any) => row.profiles).filter(Boolean);
}

export async function getFollowing(userId: string): Promise<FollowUser[]> {
  const { data } = await supabase
    .from("follows")
    .select("profiles!following_id(id, username, avatar_url)")
    .eq("follower_id", userId);
  return (data ?? []).map((row: any) => row.profiles).filter(Boolean);
}

export async function updateUsername(
  userId: string,
  newUsername: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, username: newUsername }, { onConflict: "id" });
  return { error: error?.message ?? null };
}
