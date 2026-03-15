import { search, searchProfiles } from "../../services/searchService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as jest.Mock;

describe("search", () => {
  beforeEach(() => jest.clearAllMocks());

  it("queries brands and items with ilike and returns both", async () => {
    const brandSelect = jest.fn().mockReturnValue({
      ilike: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "brand-1", name: "Nike", slug: "nike", logo_url: null }],
            error: null,
          }),
        }),
      }),
    });

    const itemSelect = jest.fn().mockReturnValue({
      ilike: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "item-1",
                  model_name: "Air Force 1",
                  category: "footwear",
                  brand_id: "brand-1",
                  brands: { name: "Nike", slug: "nike" },
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const profileSelect = jest.fn().mockReturnValue({
      ilike: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: [{ id: "user-1", username: "nikefan" }],
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "brands") return { select: brandSelect };
      if (table === "items") return { select: itemSelect };
      if (table === "profiles") return { select: profileSelect };
      return {};
    });

    const result = await search("nike");
    expect(result.brands).toHaveLength(1);
    expect(result.items).toHaveLength(1);
    expect(result.profiles).toHaveLength(1);
    expect(result.brands[0].name).toBe("Nike");
    expect(result.items[0].model_name).toBe("Air Force 1");
    expect(result.profiles[0].username).toBe("nikefan");
  });

  it("returns empty arrays when query is blank", async () => {
    const result = await search("  ");
    expect(result.brands).toHaveLength(0);
    expect(result.items).toHaveLength(0);
    expect(result.profiles).toHaveLength(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("searchProfiles", () => {
  beforeEach(() => jest.clearAllMocks());

  it("queries profiles with ilike and returns matches", async () => {
    const profileSelect = jest.fn().mockReturnValue({
      ilike: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: [{ id: "user-1", username: "nikefan" }],
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return { select: profileSelect };
      return {};
    });

    const result = await searchProfiles("nike");
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe("nikefan");
  });

  it("returns empty array when query is blank", async () => {
    const result = await searchProfiles("   ");
    expect(result).toHaveLength(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
