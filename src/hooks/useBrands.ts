import { useState, useEffect, useCallback } from "react";
import { getBrands, type Brand } from "../services/brandService";

const PAGE_SIZE = 20;

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPage(pageNum: number, append: boolean) {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    const result = await getBrands({ page: pageNum, pageSize: PAGE_SIZE });

    if (result.error) {
      setError(result.error.message);
    } else {
      const newBrands = result.data ?? [];
      setBrands(prev => (append ? [...prev, ...newBrands] : newBrands));
      setHasMore(newBrands.length === PAGE_SIZE);
    }

    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => { loadPage(0, false); }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage, true);
  }, [loadingMore, hasMore, page]);

  return { brands, loading, loadingMore, hasMore, loadMore, error };
}
