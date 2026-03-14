import { followUser, unfollowUser, isFollowing } from "../../services/followService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

const mockFrom = supabase.from as jest.Mock;

const mockCurrentUserId = "user-me";
const mockTargetUserId = "user-them";

beforeEach(() => {
  jest.clearAllMocks();
  (supabase.auth.getUser as jest.Mock).mockResolvedValue({
    data: { user: { id: mockCurrentUserId } },
    error: null,
  });
});

describe("followUser", () => {
  it("inserts a follows row", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    const result = await followUser(mockCurrentUserId, mockTargetUserId);
    expect(insertMock).toHaveBeenCalledWith({
      follower_id: mockCurrentUserId,
      following_id: mockTargetUserId,
    });
    expect(result.error).toBeNull();
  });
});

describe("unfollowUser", () => {
  it("deletes the follows row", async () => {
    const deleteMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockFrom.mockReturnValue({ delete: deleteMock });

    const result = await unfollowUser(mockCurrentUserId, mockTargetUserId);
    expect(deleteMock).toHaveBeenCalled();
    expect(result.error).toBeNull();
  });
});

describe("isFollowing", () => {
  it("returns true when a follows row exists", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: "follow-1" }, error: null }),
          }),
        }),
      }),
    });

    const result = await isFollowing(mockCurrentUserId, mockTargetUserId);
    expect(result).toBe(true);
  });

  it("returns false when no follows row exists", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    const result = await isFollowing(mockCurrentUserId, mockTargetUserId);
    expect(result).toBe(false);
  });
});
