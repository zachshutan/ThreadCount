import { getFeed } from "../../services/feedService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: { rpc: jest.fn() },
}));

const mockRpc = supabase.rpc as jest.Mock;

const mockEvent = {
  event_type: "closet_add",
  event_id: "entry-1",
  user_id: "user-1",
  username: "sneakerhead99",
  created_at: "2026-01-01T00:00:00Z",
  item_id: "item-1",
  item_name: "Air Force 1",
  brand_name: "Nike",
  category: "footwear",
  overall_score: null,
  review_body: null,
  fit_rating: null,
  quality_rating: null,
};

describe("getFeed", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls get_feed RPC with friends_only=false by default", async () => {
    mockRpc.mockResolvedValue({ data: [mockEvent], error: null });

    const result = await getFeed({});
    expect(mockRpc).toHaveBeenCalledWith("get_feed", {
      p_friends_only: false,
      p_cursor_ts: null,
      p_cursor_id: null,
      p_limit: 20,
    });
    expect(result.data).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it("passes cursor params when provided", async () => {
    mockRpc.mockResolvedValue({ data: [mockEvent], error: null });

    await getFeed({
      friendsOnly: true,
      cursor: { ts: "2026-01-02T00:00:00Z", id: "entry-5" },
    });

    expect(mockRpc).toHaveBeenCalledWith("get_feed", {
      p_friends_only: true,
      p_cursor_ts: "2026-01-02T00:00:00Z",
      p_cursor_id: "entry-5",
      p_limit: 20,
    });
  });

  it("returns nextCursor when a full page is returned", async () => {
    const events = Array.from({ length: 20 }, (_, i) => ({
      ...mockEvent,
      event_id: `entry-${i}`,
      created_at: `2026-01-0${Math.floor(i / 9) + 1}T00:00:00Z`,
    }));
    mockRpc.mockResolvedValue({ data: events, error: null });

    const result = await getFeed({});
    expect(result.nextCursor).not.toBeNull();
    expect(result.nextCursor?.id).toBe("entry-19");
  });

  it("returns error when RPC fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC error" } });

    const result = await getFeed({});
    expect(result.error).not.toBeNull();
  });
});
