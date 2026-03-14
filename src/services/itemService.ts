import { supabase } from "../lib/supabase";
import type { Brand } from "./brandService";

export type Item = {
  id: string;
  model_name: string;
  category: "top" | "bottom" | "footwear";
  is_active: boolean;
  subtype_id: string;
  brand_id: string;
  subtypes: { name: string } | null;
  brands: Pick<Brand, "name" | "slug"> | null;
};

export type ItemWithScores = Item & {
  avg_overall_score: number | null;
  avg_category_score: number | null;
  scorer_count: number;
};

type QueryResult<T> = { data: T | null; error: { message: string } | null };

export async function getItemsByBrand(brandId: string): Promise<QueryResult<Item[]>> {
  const { data, error } = await supabase
    .from("items")
    .select("*, subtypes(name), brands(name, slug)")
    .eq("brand_id", brandId)
    .eq("is_active", true);

  return { data, error };
}

export async function getItemById(itemId: string): Promise<QueryResult<Item>> {
  const { data, error } = await supabase
    .from("items")
    .select("*, subtypes(name), brands(name, slug)")
    .eq("id", itemId)
    .single();

  return { data, error };
}

export async function getItemAggregateScores(
  itemId: string
): Promise<{ avg_overall: number | null; avg_category: number | null; scorer_count: number }> {
  const { data, error } = await supabase
    .from("scores")
    .select("overall_score, category_score")
    .eq("item_id", itemId);

  if (error || !data || data.length < 3) {
    return { avg_overall: null, avg_category: null, scorer_count: data?.length ?? 0 };
  }

  const avg_overall = data.reduce((sum, r) => sum + Number(r.overall_score), 0) / data.length;
  const avg_category = data.reduce((sum, r) => sum + Number(r.category_score), 0) / data.length;

  return { avg_overall, avg_category, scorer_count: data.length };
}

export async function searchItems(
  query: string
): Promise<{ brands: Brand[]; items: Item[] }> {
  if (!query.trim()) return { brands: [], items: [] };

  const q = `%${query.trim()}%`;

  const [brandsResult, itemsResult] = await Promise.all([
    supabase.from("brands").select("id, name, logo_url, slug").ilike("name", q).limit(20),
    supabase
      .from("items")
      .select("*, subtypes(name), brands(name, slug)")
      .ilike("model_name", q)
      .eq("is_active", true)
      .limit(20),
  ]);

  return {
    brands: brandsResult.data ?? [],
    items: itemsResult.data ?? [],
  };
}
