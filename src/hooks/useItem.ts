import { useState, useEffect } from "react";
import { getItemById, getItemAggregateScores, type Item } from "../services/itemService";

type AggregateScores = {
  avg_overall: number | null;
  avg_category: number | null;
  scorer_count: number;
};

export function useItem(itemId: string) {
  const [item, setItem] = useState<Item | null>(null);
  const [scores, setScores] = useState<AggregateScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getItemById(itemId), getItemAggregateScores(itemId)]).then(
      ([itemResult, scoresResult]) => {
        if (itemResult.error) setError(itemResult.error.message);
        else {
          setItem(itemResult.data);
          setScores(scoresResult);
        }
        setLoading(false);
      }
    );
  }, [itemId]);

  return { item, scores, loading, error };
}
