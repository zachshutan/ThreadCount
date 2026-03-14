import { createScoreRow, incrementScore } from "../../services/scoreService";
import { supabase } from "../../lib/supabase";
import {
  calculateOverallScore,
  calculateCategoryScore,
  calculateConfidence,
} from "../../lib/scoring";

jest.mock("../../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as jest.Mock;

describe("createScoreRow", () => {
  it("upserts a scores row with defaults (no-op if row already exists)", async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    await createScoreRow({
      closetEntryId: "entry-1",
      itemId: "item-1",
      userId: "user-1",
      category: "footwear",
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        closet_entry_id: "entry-1",
        item_id: "item-1",
        user_id: "user-1",
        category: "footwear",
        overall_score: 5.0,
        category_score: 5.0,
        wins: 0,
        losses: 0,
        confidence: "low",
      }),
      { onConflict: "closet_entry_id", ignoreDuplicates: true }
    );
  });
});

describe("incrementScore — winner", () => {
  it("increments wins and recalculates scores for same_category", async () => {
    const existingScore = {
      id: "score-1",
      wins: 3,
      losses: 1,
      category_wins: 2,
      category_losses: 1,
    };

    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: existingScore, error: null }),
        }),
      }),
      update: updateMock,
    });

    await incrementScore({
      closetEntryId: "entry-1",
      outcome: "win",
      comparisonType: "same_category",
    });

    const newWins = 4;
    const newLosses = 1;
    const newCatWins = 3;
    const newCatLosses = 1;
    const expectedOverall = calculateOverallScore(newWins, newLosses);
    const expectedCategory = calculateCategoryScore(newCatWins, newCatLosses);
    const expectedConfidence = calculateConfidence(newWins + newLosses);

    const updateArg = updateMock.mock.calls[0][0];
    expect(updateArg.wins).toBe(newWins);
    expect(updateArg.overall_score).toBeCloseTo(expectedOverall);
    expect(updateArg.category_score).toBeCloseTo(expectedCategory);
    expect(updateArg.confidence).toBe(expectedConfidence);
  });
});
