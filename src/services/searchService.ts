import { supabase } from "../lib/supabase";
import type { Brand } from "./brandService";
import type { Item } from "./itemService";

export type ProfileResult = { id: string; username: string };

export type SearchResults = {
  brands: Brand[];
  items: Item[];
  profiles: ProfileResult[];
};

export async function searchProfiles(
  query: string
): Promise<ProfileResult[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", `%${query}%`)
    .limit(10);
  if (error || !data) return [];
  return data;
}

export async function search(query: string): Promise<SearchResults> {
  if (!query.trim()) return { brands: [], items: [], profiles: [] };

  const pattern = `%${query.trim()}%`;

  const [brandsResult, itemsResult, profilesResult] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, slug, logo_url")
      .ilike("name", pattern)
      .order("name")
      .limit(20),

    supabase
      .from("items")
      .select("id, model_name, category, brand_id, subtype_id, is_active, brands(name, slug)")
      .ilike("model_name", pattern)
      .eq("is_active", true)
      .order("model_name")
      .limit(20),

    supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", pattern)
      .limit(10),
  ]);

  return {
    brands: brandsResult.data ?? [],
    items: itemsResult.data ?? [],
    profiles: profilesResult.data ?? [],
  };
}
