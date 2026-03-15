import {
  calculateOverallScore,
  calculateCategoryScore,
  calculateConfidence,
  calculateScoreFromRank,
} from "../../lib/scoring";

describe("calculateOverallScore", () => {
  it("returns 5.0 when no comparisons have been made", () => {
    expect(calculateOverallScore(0, 0)).toBe(5.0);
  });

  it("returns 10.0 when all comparisons are wins", () => {
    expect(calculateOverallScore(10, 0)).toBe(10.0);
  });

  it("returns 0.0 when all comparisons are losses", () => {
    expect(calculateOverallScore(0, 10)).toBe(0.0);
  });

  it("returns 5.0 when wins equal losses", () => {
    expect(calculateOverallScore(5, 5)).toBe(5.0);
  });

  it("returns 8.0 for 4 wins and 1 loss", () => {
    expect(calculateOverallScore(4, 1)).toBe(8.0);
  });
});

describe("calculateCategoryScore", () => {
  it("returns 5.0 when no category comparisons made", () => {
    expect(calculateCategoryScore(0, 0)).toBe(5.0);
  });

  it("returns 10.0 when all category comparisons are wins", () => {
    expect(calculateCategoryScore(3, 0)).toBe(10.0);
  });

  it("returns correct value for mixed results", () => {
    expect(calculateCategoryScore(3, 1)).toBe(7.5);
  });
});

describe("calculateConfidence", () => {
  it("returns low for 0 comparisons", () => {
    expect(calculateConfidence(0)).toBe("low");
  });

  it("returns low for 4 comparisons", () => {
    expect(calculateConfidence(4)).toBe("low");
  });

  it("returns medium for 5 comparisons", () => {
    expect(calculateConfidence(5)).toBe("medium");
  });

  it("returns medium for 15 comparisons", () => {
    expect(calculateConfidence(15)).toBe("medium");
  });

  it("returns high for 16 comparisons", () => {
    expect(calculateConfidence(16)).toBe("high");
  });

  it("returns high for 100 comparisons", () => {
    expect(calculateConfidence(100)).toBe("high");
  });
});

describe("calculateScoreFromRank", () => {
  it("rank 1 of 1 → 10.0 (only item in category)", () => {
    expect(calculateScoreFromRank(1, 1)).toBe(10.0);
  });

  it("rank 1 of N → always 10.0 (top-ranked item)", () => {
    expect(calculateScoreFromRank(1, 5)).toBe(10.0);
    expect(calculateScoreFromRank(1, 100)).toBe(10.0);
  });

  it("rank N of N → 1.0 (last-ranked item)", () => {
    expect(calculateScoreFromRank(5, 5)).toBe(1.0);
    expect(calculateScoreFromRank(2, 2)).toBe(1.0);
  });

  it("rank 3 of 5 → 5.5 (middle item)", () => {
    // score = 10 - ((3-1)/(5-1))*9 = 10 - (2/4)*9 = 10 - 4.5 = 5.5
    expect(calculateScoreFromRank(3, 5)).toBe(5.5);
  });

  it("rank 2 of 5 → 7.75", () => {
    // score = 10 - ((2-1)/(5-1))*9 = 10 - (1/4)*9 = 10 - 2.25 = 7.75
    expect(calculateScoreFromRank(2, 5)).toBe(7.75);
  });

  it("rank 4 of 5 → 3.25", () => {
    // score = 10 - ((4-1)/(5-1))*9 = 10 - (3/4)*9 = 10 - 6.75 = 3.25
    expect(calculateScoreFromRank(4, 5)).toBe(3.25);
  });

  it("rank 1 of 2 → 10.0, rank 2 of 2 → 1.0", () => {
    expect(calculateScoreFromRank(1, 2)).toBe(10.0);
    expect(calculateScoreFromRank(2, 2)).toBe(1.0);
  });

  it("score is always in range 1.0 to 10.0", () => {
    for (let total = 1; total <= 10; total++) {
      for (let rank = 1; rank <= total; rank++) {
        const score = calculateScoreFromRank(rank, total);
        expect(score).toBeGreaterThanOrEqual(1.0);
        expect(score).toBeLessThanOrEqual(10.0);
      }
    }
  });
});
