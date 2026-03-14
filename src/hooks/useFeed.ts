import { useState, useCallback } from "react";
import { getFeed, type FeedEvent, type FeedCursor } from "../services/feedService";

export function useFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<FeedCursor | null>(null);
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(
    async (cursor: FeedCursor | undefined, replace: boolean, isFriendsOnly: boolean) => {
      const result = await getFeed({ friendsOnly: isFriendsOnly, cursor });
      if (result.data) {
        setEvents((prev) => (replace ? result.data! : [...prev, ...result.data!]));
        setNextCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPage(undefined, true, friendsOnly);
    setRefreshing(false);
  }, [loadPage, friendsOnly]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    await loadPage(nextCursor ?? undefined, false, friendsOnly);
    setLoading(false);
  }, [hasMore, loading, nextCursor, loadPage, friendsOnly]);

  const setFilter = useCallback(
    async (isFriendsOnly: boolean) => {
      setFriendsOnly(isFriendsOnly);
      setRefreshing(true);
      await loadPage(undefined, true, isFriendsOnly);
      setRefreshing(false);
    },
    [loadPage]
  );

  return { events, loading, refreshing, friendsOnly, hasMore, refresh, loadMore, setFilter };
}
