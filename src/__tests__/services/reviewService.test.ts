import { submitReview, getReviewsForItem } from "../../services/reviewService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: {
    functions: { invoke: jest.fn() },
    from: jest.fn(),
  },
}));

const mockInvoke = supabase.functions.invoke as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe("submitReview", () => {
  beforeEach(() => jest.clearAllMocks());

  it("invokes the check-review-gate Edge Function with review data", async () => {
    mockInvoke.mockResolvedValue({
      data: { id: "review-1", item_id: "item-1" },
      error: null,
    });

    const result = await submitReview({
      itemId: "item-1",
      body: "Great shoe.",
      fitRating: 4,
      qualityRating: 5,
    });

    expect(mockInvoke).toHaveBeenCalledWith("check-review-gate", {
      body: {
        item_id: "item-1",
        body: "Great shoe.",
        fit_rating: 4,
        quality_rating: 5,
      },
    });
    expect(result.error).toBeNull();
    expect(result.data?.id).toBe("review-1");
  });

  it("returns error when gate rejects (insufficient_items)", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "insufficient_items" },
    });

    const result = await submitReview({
      itemId: "item-1",
      body: "Great shoe.",
      fitRating: 4,
      qualityRating: 5,
    });

    expect(result.error?.message).toBe("insufficient_items");
  });
});

describe("getReviewsForItem", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches reviews with reviewer username", async () => {
    const mockReviews = [
      {
        id: "review-1",
        user_id: "user-1",
        item_id: "item-1",
        body: "Great shoe.",
        fit_rating: 4,
        quality_rating: 5,
        created_at: "2026-01-01T00:00:00Z",
        profiles: { username: "sneakerhead99" },
      },
    ];

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockReviews, error: null }),
        }),
      }),
    });

    const result = await getReviewsForItem("item-1");
    expect(result.data).toHaveLength(1);
    expect(result.data![0].profiles?.username).toBe("sneakerhead99");
  });
});
