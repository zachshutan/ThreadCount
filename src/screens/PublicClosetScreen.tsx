import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { getPublicCloset, getProfile } from "../services/followService";
import { useFollow } from "../hooks/useFollow";
import { useAuth } from "../hooks/useAuth";

type PublicClosetRouteParams = { userId: string };

export default function PublicClosetScreen() {
  const route = useRoute<RouteProp<{ PublicCloset: PublicClosetRouteParams }, "PublicCloset">>();
  const navigation = useNavigation<any>();
  const { userId } = route.params;
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const { following, loading: followLoading, toggling, toggle } = useFollow(userId);

  useEffect(() => {
    Promise.all([
      getProfile(userId),
      getPublicCloset(userId),
    ]).then(([profileResult, closetResult]) => {
      if (profileResult.data) setProfile(profileResult.data);
      if (closetResult.data) setEntries(closetResult.data);
      setLoadingData(false);
    });
  }, [userId]);

  const isOwnProfile = currentUser?.id === userId;

  if (loadingData) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold">{profile?.username ?? "User"}</Text>
          <Text className="text-gray-500 text-sm">{entries.length} items</Text>
        </View>
        {!isOwnProfile && (
          <TouchableOpacity
            onPress={toggle}
            disabled={followLoading || toggling}
            className={`px-4 py-2 rounded-full border ${
              following ? "border-gray-300 bg-white" : "bg-black border-black"
            }`}
          >
            <Text className={following ? "text-gray-700 font-semibold" : "text-white font-semibold"}>
              {toggling ? "..." : following ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Closet grid */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item: entry }) => (
          <TouchableOpacity
            className="flex-1 m-1 bg-gray-50 rounded-xl p-3"
            onPress={() => navigation.navigate("BrowseTab", {
              screen: "Item",
              params: { itemId: entry.item_id },
            })}
          >
            <Text className="font-medium text-sm" numberOfLines={2}>
              {entry.items?.model_name ?? "Unknown"}
            </Text>
            <Text className="text-xs text-gray-500">{entry.items?.brands?.name}</Text>
            {entry.entry_type === "owned" && entry.scores ? (
              <Text className="text-sm font-bold mt-1">
                {entry.scores.overall_score?.toFixed(1)}
              </Text>
            ) : (
              <Text className="text-xs text-gray-400 mt-1">Wishlist</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text className="text-center text-gray-400 mt-8">This closet is empty.</Text>
        }
      />
    </View>
  );
}
