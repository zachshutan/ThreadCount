import { useState, useEffect } from "react";
import { getProfile, getFollowerCount, getFollowingCount } from "../services/followService";

type Profile = { id: string; username: string; avatar_url: string | null };

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getProfile(userId),
      getFollowerCount(userId),
      getFollowingCount(userId),
    ]).then(([profileResult, followers, following]) => {
      setProfile(profileResult.data ?? null);
      setFollowerCount(followers);
      setFollowingCount(following);
      setLoading(false);
    });
  }, [userId]);

  return { profile, followerCount, followingCount, loading };
}
