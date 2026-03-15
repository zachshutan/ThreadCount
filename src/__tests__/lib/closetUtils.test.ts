import { groupOwnedBySubtype } from "../../lib/closetUtils";
import type { ClosetEntry } from "../../services/closetService";

function makeEntry(overrides: Partial<ClosetEntry> & { id: string }): ClosetEntry {
  return {
    user_id: "user-1",
    item_id: "item-1",
    entry_type: "owned",
    color: "black",
    created_at: "2026-01-01",
    ...overrides,
  } as ClosetEntry;
}

describe("groupOwnedBySubtype", () => {
  it("groups entries by their subtype name", () => {
    const entries: ClosetEntry[] = [
      makeEntry({ id: "e1", items: { id: "i1", model_name: "Air Force 1", category: "footwear", brands: { name: "Nike" }, subtypes: { name: "Sneaker" } }, scores: [{ category_rank: 1, overall_score: 10 }] }),
      makeEntry({ id: "e2", items: { id: "i2", model_name: "Old Skool", category: "footwear", brands: { name: "Vans" }, subtypes: { name: "Sneaker" } }, scores: [{ category_rank: 2, overall_score: 5.5 }] }),
      makeEntry({ id: "e3", items: { id: "i3", model_name: "Chelsea Boot", category: "footwear", brands: { name: "Dr. Martens" }, subtypes: { name: "Boot" } }, scores: [{ category_rank: 3, overall_score: 1 }] }),
    ];

    const result = groupOwnedBySubtype(entries);

    expect(result).toHaveLength(2);
    // Alphabetical order: Boot before Sneaker
    expect(result[0].subtypeName).toBe("Boot");
    expect(result[0].data).toHaveLength(1);
    expect(result[1].subtypeName).toBe("Sneaker");
    expect(result[1].data).toHaveLength(2);
  });

  it("sorts entries within each group by category_rank ascending (ranked first, unranked last)", () => {
    const entries: ClosetEntry[] = [
      makeEntry({ id: "e1", items: { id: "i1", model_name: "Item A", category: "top", brands: null, subtypes: { name: "T-Shirt" } }, scores: [{ category_rank: 2, overall_score: 7 }] }),
      makeEntry({ id: "e2", items: { id: "i2", model_name: "Item B", category: "top", brands: null, subtypes: { name: "T-Shirt" } }, scores: null }),
      makeEntry({ id: "e3", items: { id: "i3", model_name: "Item C", category: "top", brands: null, subtypes: { name: "T-Shirt" } }, scores: [{ category_rank: 1, overall_score: 10 }] }),
    ];

    const result = groupOwnedBySubtype(entries);

    expect(result).toHaveLength(1);
    const section = result[0];
    expect(section.data[0].id).toBe("e3"); // rank 1 first
    expect(section.data[1].id).toBe("e1"); // rank 2 second
    expect(section.data[2].id).toBe("e2"); // unranked last
  });

  it("uses 'Other' as fallback when subtype is missing", () => {
    const entries: ClosetEntry[] = [
      makeEntry({ id: "e1", items: { id: "i1", model_name: "Item A", category: "top", brands: null, subtypes: null }, scores: null }),
    ];

    const result = groupOwnedBySubtype(entries);

    expect(result).toHaveLength(1);
    expect(result[0].subtypeName).toBe("Other");
  });

  it("excludes wishlist (interested) entries", () => {
    const entries: ClosetEntry[] = [
      makeEntry({ id: "e1", entry_type: "owned", items: { id: "i1", model_name: "Item A", category: "top", brands: null, subtypes: { name: "T-Shirt" } }, scores: null }),
      makeEntry({ id: "e2", entry_type: "interested", items: { id: "i2", model_name: "Item B", category: "top", brands: null, subtypes: { name: "T-Shirt" } }, scores: null }),
    ];

    const result = groupOwnedBySubtype(entries);

    expect(result).toHaveLength(1);
    expect(result[0].data).toHaveLength(1);
    expect(result[0].data[0].id).toBe("e1");
  });

  it("returns empty array when no owned entries exist", () => {
    expect(groupOwnedBySubtype([])).toEqual([]);
  });

  it("sections are in alphabetical order by subtype name", () => {
    const entries: ClosetEntry[] = [
      makeEntry({ id: "e1", items: { id: "i1", model_name: "X", category: "top", brands: null, subtypes: { name: "Sweater" } }, scores: null }),
      makeEntry({ id: "e2", items: { id: "i2", model_name: "Y", category: "top", brands: null, subtypes: { name: "Hoodie" } }, scores: null }),
      makeEntry({ id: "e3", items: { id: "i3", model_name: "Z", category: "top", brands: null, subtypes: { name: "Jacket" } }, scores: null }),
    ];

    const result = groupOwnedBySubtype(entries);
    const names = result.map((s) => s.subtypeName);
    expect(names).toEqual(["Hoodie", "Jacket", "Sweater"]);
  });
});
