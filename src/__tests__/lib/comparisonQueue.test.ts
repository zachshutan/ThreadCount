import { buildQueue, type QueueEntry } from "../../lib/comparisonQueue";

const makeEntry = (id: string, category: "top" | "bottom" | "footwear"): QueueEntry => ({
  id,
  itemId: `item-${id}`,
  modelName: `Item ${id}`,
  category,
  imageUrl: null,
});

describe("buildQueue", () => {
  it("returns empty array when fewer than 2 owned entries", () => {
    const queue = buildQueue([makeEntry("1", "footwear")]);
    expect(queue).toHaveLength(0);
  });

  it("produces same-category pairs when entries share a category", () => {
    const entries = [
      makeEntry("1", "footwear"),
      makeEntry("2", "footwear"),
      makeEntry("3", "footwear"),
    ];
    // 3 footwear entries → 3 same-category pairs (1-2, 1-3, 2-3)
    const queue = buildQueue(entries);
    expect(queue).toHaveLength(3);
    queue.forEach((p) => {
      expect(p.type).toBe("same_category");
      expect(p.a.category).toBe(p.b.category);
    });
  });

  it("injects a cross-category pair at every 5th output position", () => {
    // 4 footwear → 6 same-cat pairs; 1 top + 1 bottom → 1 cross-cat pair
    const entries = [
      makeEntry("1", "footwear"),
      makeEntry("2", "footwear"),
      makeEntry("3", "footwear"),
      makeEntry("4", "footwear"),
      makeEntry("5", "top"),
      makeEntry("6", "bottom"),
    ];
    const queue = buildQueue(entries);
    // 6 same-cat + 1 cross-cat (injected at outputIdx 4) = 7 total
    expect(queue).toHaveLength(7);
    expect(queue[4].type).toBe("cross_category");
    // All other positions should be same-category
    queue.forEach((p, i) => {
      if (i !== 4) expect(p.type).toBe("same_category");
    });
  });

  it("all same-category pairs are present (no pairs dropped)", () => {
    const entries = [
      makeEntry("1", "footwear"),
      makeEntry("2", "footwear"),
      makeEntry("3", "footwear"),
      makeEntry("4", "top"),
      makeEntry("5", "top"),
      makeEntry("6", "top"),
    ];
    const queue = buildQueue(entries);
    const sameCat = queue.filter((p) => p.type === "same_category");
    // 3 footwear → 3 pairs; 3 top → 3 pairs; total 6 same-cat
    expect(sameCat).toHaveLength(6);
  });

  it("falls back to cross-category when no same-category pairs exist", () => {
    const entries = [
      makeEntry("1", "footwear"),
      makeEntry("2", "top"),
    ];
    const queue = buildQueue(entries);
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("cross_category");
  });

  it("returns empty array when only 1 owned entry", () => {
    const queue = buildQueue([makeEntry("1", "footwear")]);
    expect(queue).toHaveLength(0);
  });
});
