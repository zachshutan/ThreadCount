import { recordComparison } from "../../services/comparisonService";
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
