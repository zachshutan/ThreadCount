import { useState, useEffect, useCallback, useMemo } from "react";
import { getCloset, type ClosetEntry } from "../services/closetService";
import { useAuth } from "./useAuth";
import { groupOwnedBySubtype, getOwnedSubtypeNames, type SubtypeSection } from "../lib/closetUtils";

export function useCloset() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ClosetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const result = await getCloset(user.id);
    if (result.error) setError(result.error.message);
    else setEntries(result.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const owned = useMemo(() => entries.filter((e) => e.entry_type === "owned"), [entries]);
  const interested = useMemo(() => entries.filter((e) => e.entry_type === "interested"), [entries]);

  const ownedBySubtype = useMemo<SubtypeSection[]>(
    () => groupOwnedBySubtype(entries),
    [entries]
  );

  const subtypeNames = useMemo<string[]>(
    () => getOwnedSubtypeNames(entries),
    [entries]
  );

  return { entries, owned, interested, ownedBySubtype, subtypeNames, loading, error, refresh };
}
