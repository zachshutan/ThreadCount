import { useState, useCallback } from "react";
import { search, searchBySubtype, type SearchResults } from "../services/searchService";

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

  const runSubtypeSearch = useCallback(async (subtypeName: string, label: string) => {
    setQuery(label);
    setLoading(true);
    const items = await searchBySubtype(subtypeName);
    setResults({ brands: [], items, profiles: [] });
    setLoading(false);
  }, []);

  return { query, results, loading, runSearch, runSubtypeSearch };
}
