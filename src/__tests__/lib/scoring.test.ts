import {
  calculateOverallScore,
  calculateCategoryScore,
  calculateConfidence,
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
