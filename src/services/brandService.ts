import { supabase } from "../lib/supabase";

export type Brand = {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
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
    .select("id, name, logo_url, slug", { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to);

  return { data, error, count: count ?? 0 };
}
