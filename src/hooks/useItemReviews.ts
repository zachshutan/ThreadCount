import { useState, useEffect } from "react";
import { getReviewsForItem, type Review } from "../services/reviewService";

export function useItemReviews(itemId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    getReviewsForItem(itemId).then(setReviews);
  }, [itemId]);

  return { reviews };
}
