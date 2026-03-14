import { useState, useEffect } from "react";
import { followUser, unfollowUser, isFollowing } from "../services/followService";
import { useAuth } from "./useAuth";

export function useFollow(targetUserId: string) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!user || !targetUserId) return;
    isFollowing(user.id, targetUserId).then((result) => {
      setFollowing(result);
      setLoading(false);
    });
  }, [user, targetUserId]);

  async function toggle() {
    if (!user) return;
    setToggling(true);
    if (following) {
      await unfollowUser(user.id, targetUserId);
      setFollowing(false);
    } else {
      await followUser(user.id, targetUserId);
      setFollowing(true);
    }
    setToggling(false);
  }

  return { following, loading, toggling, toggle };
}
