import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type ScoreData = {
  id: string;
  closet_entry_id: string;
  overall_score: number;
  category_score: number;
  wins: number;
  losses: number;
  confidence: "low" | "medium" | "high";
};

export function useScores(closetEntryId: string | null) {
  const [score, setScore] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!closetEntryId) { setLoading(false); return; }

    supabase
      .from("scores")
      .select("*")
      .eq("closet_entry_id", closetEntryId)
      .maybeSingle()
      .then(({ data }) => {
        setScore(data ?? null);
        setLoading(false);
      });
  }, [closetEntryId]);

  return { score, loading };
}
