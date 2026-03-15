import { useState, useCallback } from "react";
import { search, type SearchResults } from "../services/searchService";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ brands: [], items: [], profiles: [] });
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults({ brands: [], items: [], profiles: [] });
      return;
    }
    setLoading(true);
    const res = await search(q);
    setResults(res);
    setLoading(false);
  }, []);

  return { query, results, loading, runSearch };
}
