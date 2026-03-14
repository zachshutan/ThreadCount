import { supabase } from "../lib/supabase";
import type { Brand } from "./brandService";
import type { Item } from "./itemService";

export type SearchResults = {
  brands: Brand[];
  items: Item[];
};

export async function search(query: string): Promise<SearchResults> {
  if (!query.trim()) return { brands: [], items: [] };

  const pattern = `%${query.trim()}%`;

  const [brandsResult, itemsResult] = await Promise.all([
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
  ]);

  return {
    brands: brandsResult.data ?? [],
    items: itemsResult.data ?? [],
  };
}
