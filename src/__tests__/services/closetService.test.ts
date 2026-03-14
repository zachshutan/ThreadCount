import {
  getCloset,
  addToCloset,
  upgradeToOwned,
} from "../../services/closetService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

const mockFrom = supabase.from as jest.Mock;

const mockEntry = {
  id: "entry-1",
  user_id: "user-1",
  item_id: "item-1",
  entry_type: "owned",
  color: "black",
  created_at: "2026-01-01",
};

describe("getCloset", () => {
  it("fetches closet entries for a user", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [mockEntry], error: null }),
        }),
      }),
    });

    const result = await getCloset("user-1");
    expect(supabase.from).toHaveBeenCalledWith("closet_entries");
    expect(result.data).toHaveLength(1);
  });
});

describe("addToCloset", () => {
  it("inserts a new closet entry", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockEntry, error: null }),
        }),
      }),
    });

    const result = await addToCloset({
      userId: "user-1",
      itemId: "item-1",
      entryType: "owned",
      color: "black",
    });
    expect(result.error).toBeNull();
    expect(result.data?.entry_type).toBe("owned");
  });

  it("returns error when insert fails", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Duplicate entry" },
          }),
        }),
      }),
    });

    const result = await addToCloset({
      userId: "user-1",
      itemId: "item-1",
      entryType: "owned",
      color: "black",
    });
    expect(result.error).not.toBeNull();
  });
});

describe("upgradeToOwned", () => {
  it("updates entry_type to owned and applies selected color", async () => {
    const updatedEntry = { ...mockEntry, entry_type: "owned", color: "navy" };
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: updatedEntry, error: null }),
        }),
      }),
    });
    mockFrom.mockReturnValue({ update: updateMock });

    const result = await upgradeToOwned("entry-1", "navy");
    expect(result.error).toBeNull();
    expect(result.data?.entry_type).toBe("owned");
    expect(result.data?.color).toBe("navy");
    expect(updateMock).toHaveBeenCalledWith({ entry_type: "owned", color: "navy" });
  });
});
