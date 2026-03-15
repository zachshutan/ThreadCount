/**
 * Binary search insertion ranker.
 *
 * Given a list of already-ranked items (ranked peers, index 0 = rank 1 = best)
 * and a new item to place, this module drives a binary search that asks the
 * minimum number of head-to-head comparisons to find the exact insertion position.
 *
 * Usage:
 *   1. Call createSession() with the sorted peer list.
 *   2. If session.done is true, insertionIndex gives the position immediately.
 *   3. Otherwise, call getCurrentComparatorIndex() to find which peer to show.
 *   4. After user picks, call advanceBetter() (new item wins) or advanceWorse() (new item loses).
 *   5. Repeat until session.done is true, then read session.insertionIndex.
 *
 * insertionIndex is 0-based: 0 means the new item becomes #1 (best),
 * rankedPeers.length means it goes at the very end (worst).
 */

export type RankedPeer = {
  id: string;
  modelName: string;
  imageUrl: string | null;
  subtypeId: string | null;
};

export type RankingSession = {
  newEntryId: string;
  rankedPeers: RankedPeer[];
  low: number;
  high: number;
  done: boolean;
  insertionIndex: number | null;
};

/**
 * Creates a new ranking session.
 * If rankedPeers is empty, the session is immediately done at position 0.
 */
export function createSession(
  newEntryId: string,
  rankedPeers: RankedPeer[]
): RankingSession {
  if (rankedPeers.length === 0) {
    return { newEntryId, rankedPeers, low: 0, high: -1, done: true, insertionIndex: 0 };
  }
  return {
    newEntryId,
    rankedPeers,
    low: 0,
    high: rankedPeers.length - 1,
    done: false,
    insertionIndex: null,
  };
}

/**
 * Returns the index into rankedPeers of the item the user should compare against next.
 * Only call this when session.done is false.
 */
export function getCurrentComparatorIndex(session: RankingSession): number {
  return Math.floor((session.low + session.high) / 2);
}

/**
 * Call when the new item WINS against the current comparator.
 * The new item is better, so search the left (higher rank) half.
 */
export function advanceBetter(session: RankingSession): RankingSession {
  const mid = getCurrentComparatorIndex(session);
  const newHigh = mid - 1;

  // Can't go further left — the new item belongs at position mid
  if (newHigh < session.low) {
    return { ...session, done: true, insertionIndex: mid };
  }

  return { ...session, high: newHigh };
}

/**
 * Call when the new item LOSES against the current comparator.
 * The new item is worse, so search the right (lower rank) half.
 */
export function advanceWorse(session: RankingSession): RankingSession {
  const mid = getCurrentComparatorIndex(session);
  const newLow = mid + 1;

  // Can't go further right — the new item belongs at position mid + 1
  if (newLow > session.high) {
    return { ...session, done: true, insertionIndex: mid + 1 };
  }

  return { ...session, low: newLow };
}

/**
 * Returns the maximum number of comparisons needed to place a new item
 * among N existing ranked peers. This is ceil(log2(N + 1)).
 */
export function maxComparisons(peerCount: number): number {
  if (peerCount === 0) return 0;
  return Math.ceil(Math.log2(peerCount + 1));
}
