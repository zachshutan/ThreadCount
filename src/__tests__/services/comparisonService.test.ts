import { recordComparison, recordRankingComparison } from "../../services/comparisonService";
import { supabase } from "../../lib/supabase";
import * as scoreService from "../../services/scoreService";

jest.mock("../../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));
jest.mock("../../services/scoreService");

const mockFrom = supabase.from as jest.Mock;
const mockIncrementScore = scoreService.incrementScore as jest.Mock;

describe("recordComparison", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });
    mockIncrementScore.mockResolvedValue(undefined);
  });

  it("inserts a comparison row and updates scores for both entries", async () => {
    await recordComparison({
      userId: "user-1",
      winnerEntryId: "entry-win",
      loserEntryId: "entry-lose",
      comparisonType: "same_category",
    });

    expect(supabase.from).toHaveBeenCalledWith("comparisons");
    expect(mockIncrementScore).toHaveBeenCalledWith({
      closetEntryId: "entry-win",
      outcome: "win",
      comparisonType: "same_category",
    });
    expect(mockIncrementScore).toHaveBeenCalledWith({
      closetEntryId: "entry-lose",
      outcome: "loss",
      comparisonType: "same_category",
    });
  });

  it("returns error if insert fails", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: { message: "DB error" } }),
    });

    const result = await recordComparison({
      userId: "user-1",
      winnerEntryId: "entry-win",
      loserEntryId: "entry-lose",
      comparisonType: "same_category",
    });

    expect(result.error).not.toBeNull();
    expect(mockIncrementScore).not.toHaveBeenCalled();
  });
});

describe("recordRankingComparison", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });
    mockIncrementScore.mockResolvedValue(undefined);
  });

  it("inserts a comparison row with comparison_type ranking", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await recordRankingComparison({
      userId: "user-1",
      winnerEntryId: "entry-win",
      loserEntryId: "entry-lose",
    });

    expect(supabase.from).toHaveBeenCalledWith("comparisons");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        winner_entry_id: "entry-win",
        loser_entry_id: "entry-lose",
        comparison_type: "ranking",
      })
    );
  });

  it("does NOT call incrementScore (ranking model, not win/loss model)", async () => {
    await recordRankingComparison({
      userId: "user-1",
      winnerEntryId: "entry-win",
      loserEntryId: "entry-lose",
    });

    expect(mockIncrementScore).not.toHaveBeenCalled();
  });

  it("returns error if insert fails", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: { message: "DB error" } }),
    });

    const result = await recordRankingComparison({
      userId: "user-1",
      winnerEntryId: "entry-win",
      loserEntryId: "entry-lose",
    });

    expect(result.error).not.toBeNull();
  });
});
