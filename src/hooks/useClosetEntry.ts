import { useState, useEffect } from "react";
import { getClosetEntryForItem, type ClosetEntry } from "../services/closetService";
import { useAuth } from "./useAuth";

export function useClosetEntry(itemId: string) {
  const { user } = useAuth();
  const [entry, setEntry] = useState<ClosetEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getClosetEntryForItem(user.id, itemId).then((e) => {
      setEntry(e);
      setLoading(false);
    });
  }, [user, itemId]);

  return { entry, loading, refetch: () => {
    if (user) getClosetEntryForItem(user.id, itemId).then(setEntry);
  }};
}
