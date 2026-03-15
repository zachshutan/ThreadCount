import {
  createSession,
  getCurrentComparatorIndex,
  advanceBetter,
  advanceWorse,
  maxComparisons,
  type RankingSession,
  type RankedPeer,
} from "../../lib/binarySearchRanker";

// Helper to build a list of ranked peers from simple names
function peers(names: string[]): RankedPeer[] {
  return names.map((name, i) => ({ id: `id-${i}`, modelName: name, imageUrl: null }));
}

// Helper to simulate a full binary search given a sequence of "better" or "worse" answers
function simulate(
  session: RankingSession,
  answers: ("better" | "worse")[]
): RankingSession {
  let s = session;
  for (const answer of answers) {
    if (s.done) break;
    s = answer === "better" ? advanceBetter(s) : advanceWorse(s);
  }
  return s;
}

describe("createSession", () => {
  test("empty peers list → done immediately, insertionIndex 0", () => {
    const s = createSession("new-id", []);
    expect(s.done).toBe(true);
    expect(s.insertionIndex).toBe(0);
  });

  test("one peer → not done, low=0, high=0", () => {
    const s = createSession("new-id", peers(["A"]));
    expect(s.done).toBe(false);
    expect(s.low).toBe(0);
    expect(s.high).toBe(0);
  });

  test("five peers → not done, low=0, high=4", () => {
    const s = createSession("new-id", peers(["A", "B", "C", "D", "E"]));
    expect(s.done).toBe(false);
    expect(s.low).toBe(0);
    expect(s.high).toBe(4);
  });
});

describe("getCurrentComparatorIndex", () => {
  test("single peer → index 0", () => {
    const s = createSession("new-id", peers(["A"]));
    expect(getCurrentComparatorIndex(s)).toBe(0);
  });

  test("two peers → index 1 (floor((0+1)/2) = 0, wait: floor(0.5)=0)", () => {
    const s = createSession("new-id", peers(["A", "B"]));
    // low=0, high=1, mid=floor((0+1)/2)=0
    expect(getCurrentComparatorIndex(s)).toBe(0);
  });

  test("five peers → index 2 (floor((0+4)/2)=2)", () => {
    const s = createSession("new-id", peers(["A", "B", "C", "D", "E"]));
    expect(getCurrentComparatorIndex(s)).toBe(2);
  });
});

describe("advanceBetter (new item wins)", () => {
  test("1 peer: beats it → insert at 0 (top rank)", () => {
    const s = simulate(createSession("new-id", peers(["A"])), ["better"]);
    expect(s.done).toBe(true);
    expect(s.insertionIndex).toBe(0);
  });

  test("1 peer: loses → insert at 1 (after A)", () => {
    const s = simulate(createSession("new-id", peers(["A"])), ["worse"]);
    expect(s.done).toBe(true);
    expect(s.insertionIndex).toBe(1);
  });

  test("2 peers [A,B]: beats A → insert at 0 (top rank)", () => {
    // low=0,high=1 → mid=0 (A) → beats → high=-1 → done at mid=0
    const s = simulate(createSession("new-id", peers(["A", "B"])), ["better"]);
    expect(s.done).toBe(true);
    expect(s.insertionIndex).toBe(0);
  });

  test("2 peers [A,B]: loses to A, beats B → insert at 1 (between A and B)", () => {
    // mid=0 (A) → worse → low=1 → mid=1 (B) → better → high=0 < low=1 → insert at 1
    const s = simulate(createSession("new-id", peers(["A", "B"])), ["worse", "better"]);
    expect(s.done).toBe(true);
    expect(s.insertionIndex).toBe(1);
  });

  test("2 peers [A,B]: loses to both → insert at 2 (last)", () => {
    const s = simulate(createSession("new-id", peers(["A", "B"])), ["worse", "worse"]);
    expect(s.done).toBe(true);
    expect(s.insertionIndex).toBe(2);
  });

  test("5 peers [A,B,C,D,E]: beats C, beats A → insert at 0", () => {
    // mid=2(C) → better → high=1 → mid=0(A) → better → high=-1 < low=0 → insert at 0
    const s = simulate(createSession("new-id", peers(["A", "B", "C", "D", "E"])), ["better", "better"]);
    expect(s.done).toBe(true);
    expect(s.insertionIndex).toBe(0);
  });

  test("5 peers [A,B,C,D,E]: beats C, loses to A, beats B → insert at 1", () => {
    // mid=2(C) → better → high=1 → mid=0(A) → worse → low=1 → mid=1(B) → better → high=0 < low=1 → insert at 1
    const s = simulate(createSession("new-id", peers(["A", "B", "C", "D", "E"])), ["better", "worse", "better"]);
    expect(s.done).toBe(true);
    expect(s.insertionIndex).toBe(1);
  });

  test("5 peers [A,B,C,D,E]: beats C, loses to A, loses to B → insert at 2", () => {
    // mid=2(C) → better → high=1 → mid=0(A) → worse → low=1 → mid=1(B) → worse → low=2 > high=1 → insert at mid+1=2
    const s = simulate(createSession("new-id", peers(["A", "B", "C", "D", "E"])), ["better", "worse", "worse"]);
    expect(s.done).toBe(true);
    expect(s.insertionIndex).toBe(2);
  });

  test("5 peers [A,B,C,D,E]: loses to C, beats D → insert at 3", () => {
    // mid=2(C) → worse → low=3 → mid=3(D) → better → high=2 < low=3 → insert at 3
    const s = simulate(createSession("new-id", peers(["A", "B", "C", "D", "E"])), ["worse", "better"]);
    expect(s.done).toBe(true);
    expect(s.insertionIndex).toBe(3);
  });

  test("5 peers [A,B,C,D,E]: loses to C, loses to D, beats E → insert at 4", () => {
    // mid=2(C) → worse → low=3 → mid=3(D) → worse → low=4 → mid=4(E) → better → high=3 < low=4 → insert at 4
    const s = simulate(createSession("new-id", peers(["A", "B", "C", "D", "E"])), ["worse", "worse", "better"]);
    expect(s.done).toBe(true);
    expect(s.insertionIndex).toBe(4);
  });

  test("5 peers [A,B,C,D,E]: loses to all → insert at 5 (last)", () => {
    // mid=2(C) → worse → low=3 → mid=3(D) → worse → low=4 → mid=4(E) → worse → low=5 > high=4 → insert at 5
    const s = simulate(createSession("new-id", peers(["A", "B", "C", "D", "E"])), ["worse", "worse", "worse"]);
    expect(s.done).toBe(true);
    expect(s.insertionIndex).toBe(5);
  });
});

describe("maxComparisons", () => {
  test("0 peers → 0 comparisons", () => {
    expect(maxComparisons(0)).toBe(0);
  });

  test("1 peer → 1 comparison", () => {
    expect(maxComparisons(1)).toBe(1);
  });

  test("2 peers → 2 comparisons", () => {
    expect(maxComparisons(2)).toBe(2);
  });

  test("3 peers → 2 comparisons", () => {
    expect(maxComparisons(3)).toBe(2);
  });

  test("4 peers → 3 comparisons", () => {
    expect(maxComparisons(4)).toBe(3);
  });

  test("5 peers → 3 comparisons", () => {
    expect(maxComparisons(5)).toBe(3);
  });

  test("10 peers → 4 comparisons", () => {
    expect(maxComparisons(10)).toBe(4);
  });

  test("100 peers → 7 comparisons", () => {
    expect(maxComparisons(100)).toBe(7);
  });
});

describe("insertionIndex covers all valid positions for N peers", () => {
  // For a given number of peers, every insertion position 0..N should be reachable
  test("all 3 positions reachable with 2 peers", () => {
    const reachable = new Set<number>();
    const base = peers(["A", "B"]);

    reachable.add(simulate(createSession("x", base), ["better"]).insertionIndex!);
    reachable.add(simulate(createSession("x", base), ["worse", "better"]).insertionIndex!);
    reachable.add(simulate(createSession("x", base), ["worse", "worse"]).insertionIndex!);

    expect(reachable).toEqual(new Set([0, 1, 2]));
  });

  test("all 4 positions reachable with 3 peers", () => {
    const reachable = new Set<number>();
    const base = peers(["A", "B", "C"]);
    // 3 peers → mid=1(B)
    // beats B → high=0 → mid=0(A): beats → 0, loses → 1
    // loses to B → low=2 → mid=2(C): beats → 2, loses → 3
    reachable.add(simulate(createSession("x", base), ["better", "better"]).insertionIndex!);
    reachable.add(simulate(createSession("x", base), ["better", "worse"]).insertionIndex!);
    reachable.add(simulate(createSession("x", base), ["worse", "better"]).insertionIndex!);
    reachable.add(simulate(createSession("x", base), ["worse", "worse"]).insertionIndex!);

    expect(reachable).toEqual(new Set([0, 1, 2, 3]));
  });
});
