import { useState, useEffect, useMemo } from "react";
import { buildQueue, type ComparisonPair, type QueueEntry } from "../lib/comparisonQueue";
import type { ClosetEntry } from "../services/closetService";

export function useComparisonQueue(
  ownedEntries: ClosetEntry[],
  primaryImages: Map<string, string>  // itemId → imageUrl
) {
  const queueEntries: QueueEntry[] = useMemo(() => {
    return ownedEntries
      .filter((e) => e.items)
      .map((e) => ({
        id: e.id,
        itemId: e.item_id,
        modelName: e.items!.model_name,
        category: e.items!.category as "top" | "bottom" | "footwear",
        imageUrl: primaryImages.get(e.item_id) ?? null,
      }));
  }, [ownedEntries, primaryImages]);

  // Build queue after async data loads — useState initializer runs once with empty entries
  const [queue, setQueue] = useState<ComparisonPair[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setQueue(buildQueue(queueEntries));
    setIndex(0);
  }, [queueEntries]);

  const currentPair = index < queue.length ? queue[index] : null;
  const progress = queue.length > 0 ? index / queue.length : 0;

  function advance() {
    setIndex((i) => i + 1);
  }

  return { currentPair, progress, totalPairs: queue.length, completedPairs: index, advance };
}
