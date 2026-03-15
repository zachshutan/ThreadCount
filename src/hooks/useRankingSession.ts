import { useState, useEffect } from "react";
import {
  createSession,
  getCurrentComparatorIndex,
  advanceBetter,
  advanceWorse,
  maxComparisons,
} from "../lib/binarySearchRanker";
import type { RankedPeer, RankingSession } from "../lib/binarySearchRanker";
import { fetchRankedPeers, setCategoryRank, recalculateCategoryScores } from "../services/scoreService";
import { recordRankingComparison } from "../services/comparisonService";

export type RankingSessionState = {
  isLoading: boolean;
  isFinalizing: boolean;
  isDone: boolean;
  currentComparator: RankedPeer | null;
  totalComparisons: number;
  comparisonCount: number;
  finalRank: number | null;
  totalItems: number;
  handleNewItemWins: () => Promise<void>;
  handlePeerWins: () => Promise<void>;
};

export function useRankingSession(params: {
  newEntryId: string;
  userId: string;
  category: "top" | "bottom" | "footwear";
}): RankingSessionState {
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [peers, setPeers] = useState<RankedPeer[]>([]);
  const [session, setSession] = useState<RankingSession | null>(null);
  const [comparisonCount, setComparisonCount] = useState(0);
  const [finalRank, setFinalRank] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const rankedPeers = await fetchRankedPeers(params.userId, params.category);
      if (cancelled) return;

      const sess = createSession(params.newEntryId, rankedPeers);
      setPeers(rankedPeers);
      setSession(sess);
      setIsLoading(false);

      if (sess.done && sess.insertionIndex !== null) {
        // 0 existing ranked peers — auto-place at rank 1
        await finalize(rankedPeers, sess.insertionIndex);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  async function finalize(currentPeers: RankedPeer[], insertionIndex: number) {
    setIsFinalizing(true);
    const newRank = insertionIndex + 1;

    // Shift existing items that are at or below the insertion point down by 1
    for (let i = insertionIndex; i < currentPeers.length; i++) {
      await setCategoryRank({ closetEntryId: currentPeers[i].id, rank: i + 2 });
    }

    // Assign the new item its rank
    await setCategoryRank({ closetEntryId: params.newEntryId, rank: newRank });

    // Recalculate scores for all items in the category
    await recalculateCategoryScores({ userId: params.userId, category: params.category });

    setFinalRank(newRank);
    setIsFinalizing(false);
    setIsDone(true);
  }

  async function handleChoice(newItemWins: boolean) {
    if (!session || session.done) return;

    const compIdx = getCurrentComparatorIndex(session);
    const peer = peers[compIdx];

    // Record the comparison in the database
    await recordRankingComparison({
      userId: params.userId,
      winnerEntryId: newItemWins ? params.newEntryId : peer.id,
      loserEntryId: newItemWins ? peer.id : params.newEntryId,
    });

    const nextSession = newItemWins ? advanceBetter(session) : advanceWorse(session);
    setSession(nextSession);
    setComparisonCount((prev) => prev + 1);

    if (nextSession.done && nextSession.insertionIndex !== null) {
      await finalize(peers, nextSession.insertionIndex);
    }
  }

  const currentComparatorIndex =
    session && !session.done ? getCurrentComparatorIndex(session) : null;
  const currentComparator =
    currentComparatorIndex !== null ? peers[currentComparatorIndex] : null;

  return {
    isLoading,
    isFinalizing,
    isDone,
    currentComparator,
    totalComparisons: maxComparisons(peers.length),
    comparisonCount,
    finalRank,
    totalItems: peers.length + 1,
    handleNewItemWins: () => handleChoice(true),
    handlePeerWins: () => handleChoice(false),
  };
}
