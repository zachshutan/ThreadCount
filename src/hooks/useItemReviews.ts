import { useState, useEffect, useCallback } from "react";
import { getReviewsForItem, type Review } from "../services/reviewService";

export function useItemReviews(itemId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(() => {
    if (!itemId) return;
    setLoading(true);
    getReviewsForItem(itemId).then((result) => {
      if (result.error) {
        console.error("[useItemReviews] failed to load reviews:", result.error.message);
      }
      if (result.data) setReviews(result.data);
      setLoading(false);
    });
  }, [itemId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  return { reviews, loading, refresh: loadReviews };
}
