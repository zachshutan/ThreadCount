import { useState, useEffect } from "react";
import { getReviewsForItem, type Review } from "../services/reviewService";

export function useItemReviews(itemId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;
    getReviewsForItem(itemId).then((result) => {
      if (result.data) setReviews(result.data);
      setLoading(false);
    });
  }, [itemId]);

  return { reviews, loading };
}
