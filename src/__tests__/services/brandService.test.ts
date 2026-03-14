import { getBrands } from "../../services/brandService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn(),
  },
}));

const mockFrom = supabase.from as jest.Mock;

describe("getBrands", () => {
  beforeEach(() => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: [
              { id: "1", name: "Nike", logo_url: null, slug: "nike" },
              { id: "2", name: "Adidas", logo_url: null, slug: "adidas" },
            ],
            error: null,
            count: 2,
          }),
        }),
      }),
    });
  });

  it("fetches brands with pagination", async () => {
    const result = await getBrands({ page: 0, pageSize: 20 });
    expect(supabase.from).toHaveBeenCalledWith("brands");
    expect(result.data).toHaveLength(2);
    expect(result.error).toBeNull();
  });

  it("returns error when query fails", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Connection failed" },
            count: null,
          }),
        }),
      }),
    });

    const result = await getBrands({ page: 0, pageSize: 20 });
    expect(result.error).not.toBeNull();
  });
});
