import { useState, useEffect } from "react";
import { getFollowers, getFollowing, type FollowUser } from "../services/followService";

export function useFollowList(userId: string, type: "followers" | "following") {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const fn = type === "followers" ? getFollowers : getFollowing;
    fn(userId).then((result) => {
      setUsers(result);
      setLoading(false);
    });
  }, [userId, type]);

  return { users, loading };
}
