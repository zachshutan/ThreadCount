export type QueueEntry = {
  id: string;         // closet_entry_id
  itemId: string;
  modelName: string;
  category: "top" | "bottom" | "footwear";
  imageUrl: string | null;
};

export type ComparisonPair = {
  a: QueueEntry;
  b: QueueEntry;
  type: "same_category" | "cross_category";
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getSameCategoryPairs(entries: QueueEntry[]): ComparisonPair[] {
  const byCategory = new Map<string, QueueEntry[]>();
  for (const entry of entries) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }

  const pairs: ComparisonPair[] = [];
  for (const [, group] of byCategory) {
    const shuffled = shuffle(group);
    // All unique C(n,2) pairs within this category
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        pairs.push({ a: shuffled[i], b: shuffled[j], type: "same_category" });
      }
    }
  }
  return shuffle(pairs);
}

function getCrossCategoryPairs(entries: QueueEntry[]): ComparisonPair[] {
  const categories = [...new Set(entries.map((e) => e.category))];
  if (categories.length < 2) return [];

  const pairs: ComparisonPair[] = [];
  const shuffled = shuffle(entries);
  for (let i = 0; i + 1 < shuffled.length; i++) {
    if (shuffled[i].category !== shuffled[i + 1].category) {
      pairs.push({ a: shuffled[i], b: shuffled[i + 1], type: "cross_category" });
    }
  }
  return pairs;
}

/**
 * Builds an in-memory comparison queue for a session.
 * Same-category pairs are the default; every 5th pair is cross-category if available.
 * Falls back to cross-category if no same-category pairs can be formed.
 */
export function buildQueue(entries: QueueEntry[]): ComparisonPair[] {
  if (entries.length < 2) return [];

  const sameCat = getSameCategoryPairs(entries);
  const crossCat = getCrossCategoryPairs(entries);

  if (sameCat.length === 0) return crossCat;

  const result: ComparisonPair[] = [];
  let sameCatIdx = 0;
  let crossIdx = 0;
  let outputIdx = 0;

  // Iterate over same-category pairs; inject one cross-category at every 5th output position
  while (sameCatIdx < sameCat.length) {
    if ((outputIdx + 1) % 5 === 0 && crossIdx < crossCat.length) {
      result.push(crossCat[crossIdx++]);
    } else {
      result.push(sameCat[sameCatIdx++]);
    }
    outputIdx++;
  }

  return result;
}
