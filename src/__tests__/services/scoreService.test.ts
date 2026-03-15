import { createScoreRow, incrementScore, setCategoryRank, recalculateCategoryScores, fetchRankedPeers } from "../../services/scoreService";
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

describe("setCategoryRank", () => {
  it("updates category_rank for the given closet entry", async () => {
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockFrom.mockReturnValue({ update: updateMock });

    await setCategoryRank({ closetEntryId: "entry-1", rank: 2 });

    expect(updateMock).toHaveBeenCalledWith({ category_rank: 2 });
    expect(eqMock).toHaveBeenCalledWith("closet_entry_id", "entry-1");
  });
});

describe("recalculateCategoryScores", () => {
  it("recalculates overall_score for all ranked items using rank formula", async () => {
    const rankedItems = [
      { id: "score-1", category_rank: 1 },
      { id: "score-2", category_rank: 2 },
      { id: "score-3", category_rank: 3 },
    ];

    // Build the select chain: .select().eq().eq().not().order() → data
    const orderMock = jest.fn().mockResolvedValue({ data: rankedItems, error: null });
    const notMock = jest.fn().mockReturnValue({ order: orderMock });
    const eq2Mock = jest.fn().mockReturnValue({ not: notMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });

    // Build the update chain: .update().eq() → success
    const eqUpdateMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: eqUpdateMock });

    mockFrom.mockReturnValue({ select: selectMock, update: updateMock });

    await recalculateCategoryScores({ userId: "user-1", category: "top" });

    // 3 items total:
    // rank 1 → 10 - (0/2)*9 = 10.0
    // rank 2 → 10 - (1/2)*9 = 5.5
    // rank 3 → 10 - (2/2)*9 = 1.0
    expect(updateMock).toHaveBeenCalledTimes(3);

    const updateArgs = updateMock.mock.calls.map((call) => call[0]);
    expect(updateArgs[0].overall_score).toBeCloseTo(10.0);
    expect(updateArgs[1].overall_score).toBeCloseTo(5.5);
    expect(updateArgs[2].overall_score).toBeCloseTo(1.0);
  });

  it("does nothing when no ranked items exist", async () => {
    const orderMock = jest.fn().mockResolvedValue({ data: [], error: null });
    const notMock = jest.fn().mockReturnValue({ order: orderMock });
    const eq2Mock = jest.fn().mockReturnValue({ not: notMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
    const updateMock = jest.fn();

    mockFrom.mockReturnValue({ select: selectMock, update: updateMock });

    await recalculateCategoryScores({ userId: "user-1", category: "top" });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("single ranked item gets a score of 10.0", async () => {
    const rankedItems = [{ id: "score-1", category_rank: 1 }];

    const orderMock = jest.fn().mockResolvedValue({ data: rankedItems, error: null });
    const notMock = jest.fn().mockReturnValue({ order: orderMock });
    const eq2Mock = jest.fn().mockReturnValue({ not: notMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });

    const eqUpdateMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: eqUpdateMock });

    mockFrom.mockReturnValue({ select: selectMock, update: updateMock });

    await recalculateCategoryScores({ userId: "user-1", category: "footwear" });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0].overall_score).toBeCloseTo(10.0);
  });
});

describe("fetchRankedPeers", () => {
  it("returns ranked peers ordered by category_rank", async () => {
    const rows = [
      { closet_entry_id: "entry-1", category_rank: 1, closet_entries: { items: { model_name: "Nike Air Max" } } },
      { closet_entry_id: "entry-2", category_rank: 2, closet_entries: { items: { model_name: "Adidas Stan Smith" } } },
    ];

    const orderMock = jest.fn().mockResolvedValue({ data: rows, error: null });
    const notMock = jest.fn().mockReturnValue({ order: orderMock });
    const eq2Mock = jest.fn().mockReturnValue({ not: notMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
    mockFrom.mockReturnValue({ select: selectMock });

    const result = await fetchRankedPeers("user-1", "footwear");

    expect(supabase.from).toHaveBeenCalledWith("scores");
    expect(selectMock).toHaveBeenCalled();
    expect(eq1Mock).toHaveBeenCalledWith("user_id", "user-1");
    expect(eq2Mock).toHaveBeenCalledWith("category", "footwear");
    expect(notMock).toHaveBeenCalledWith("category_rank", "is", null);
    expect(orderMock).toHaveBeenCalledWith("category_rank", { ascending: true });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "entry-1", modelName: "Nike Air Max", imageUrl: null });
    expect(result[1]).toEqual({ id: "entry-2", modelName: "Adidas Stan Smith", imageUrl: null });
  });

  it("returns empty array when no ranked peers exist", async () => {
    const orderMock = jest.fn().mockResolvedValue({ data: [], error: null });
    const notMock = jest.fn().mockReturnValue({ order: orderMock });
    const eq2Mock = jest.fn().mockReturnValue({ not: notMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
    mockFrom.mockReturnValue({ select: selectMock });

    const result = await fetchRankedPeers("user-1", "top");

    expect(result).toEqual([]);
  });

  it("returns empty array on query error", async () => {
    const orderMock = jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } });
    const notMock = jest.fn().mockReturnValue({ order: orderMock });
    const eq2Mock = jest.fn().mockReturnValue({ not: notMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
    mockFrom.mockReturnValue({ select: selectMock });

    const result = await fetchRankedPeers("user-1", "top");

    expect(result).toEqual([]);
  });
});
