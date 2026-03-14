import { useState, useEffect } from "react";
import { getItemsByBrand, type Item } from "../services/itemService";

export function useItems(brandId: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getItemsByBrand(brandId).then(result => {
      if (result.error) setError(result.error.message);
      else setItems(result.data ?? []);
      setLoading(false);
    });
  }, [brandId]);

  return { items, loading, error };
}
