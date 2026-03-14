import { getItemsByBrand, getItemById, getItemAggregateScores, searchItems } from "../../services/itemService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as jest.Mock;

const mockItem = {
  id: "item-1",
  model_name: "Air Force 1",
  category: "footwear",
  is_active: true,
  subtype_id: "sub-1",
  brand_id: "brand-1",
  subtypes: { name: "Sneaker" },
  brands: { name: "Nike", slug: "nike" },
};

describe("getItemsByBrand", () => {
  it("fetches active items for a brand", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [mockItem], error: null }),
        }),
      }),
    });

    const result = await getItemsByBrand("brand-1");
    expect(supabase.from).toHaveBeenCalledWith("items");
    expect(result.data).toHaveLength(1);
  });
});

describe("getItemById", () => {
  it("fetches a single item with brand and subtype", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockItem, error: null }),
        }),
      }),
    });

    const result = await getItemById("item-1");
    expect(result.data?.id).toBe("item-1");
  });
});

describe("searchItems", () => {
  it("returns empty array for blank query", async () => {
    const result = await searchItems("");
    expect(result.brands).toEqual([]);
    expect(result.items).toEqual([]);
  });
});
