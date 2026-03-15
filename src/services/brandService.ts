import { supabase } from "../lib/supabase";

export type Brand = {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
  website_url?: string | null;
  description?: string | null;
  item_count?: number;
};

type PaginationOptions = { page: number; pageSize: number };
type QueryResult<T> = { data: T | null; error: { message: string } | null; count: number };

export async function getBrands(
  { page, pageSize }: PaginationOptions
): Promise<QueryResult<Brand[]>> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("brands")
    .select("id, name, logo_url, slug, website_url, items(count)", { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to);

  const mapped = (data as any[] | null)?.map((b) => ({
    ...b,
    item_count: Array.isArray(b.items) ? (b.items[0]?.count ?? 0) : 0,
    items: undefined,
  })) ?? null;

  return { data: mapped, error, count: count ?? 0 };
}

type SingleResult<T> = { data: T | null; error: { message: string } | null };

export async function getBrandById(brandId: string): Promise<SingleResult<Brand>> {
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, logo_url, slug, website_url, description")
    .eq("id", brandId)
    .single();

  return { data, error };
}
