import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image,
} from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getPublicCloset } from "../services/followService";
import { useFollow } from "../hooks/useFollow";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";

type PublicClosetRouteParams = { userId: string };

export default function PublicClosetScreen() {
  const route = useRoute<RouteProp<{ PublicCloset: PublicClosetRouteParams }, "PublicCloset">>();
  const navigation = useNavigation<any>();
  const { userId } = route.params;
  const { user: currentUser } = useAuth();

  const { profile, followerCount, followingCount, loading: profileLoading } = useProfile(userId);
  const [entries, setEntries] = useState<any[]>([]);
  const [closetLoading, setClosetLoading] = useState(true);
  const { following, loading: followLoading, toggling, toggle } = useFollow(userId);

  useEffect(() => {
    getPublicCloset(userId).then(({ data }) => {
      if (data) setEntries(data);
      setClosetLoading(false);
    });
  }, [userId]);

  const isOwnProfile = currentUser?.id === userId;
  const ownedCount = entries.filter((e) => e.entry_type === "owned").length;

  if (profileLoading || closetLoading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  return (
    <View className="flex-1 bg-white">
      {/* @username headline */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold">
          {profile?.username ? `@${profile.username}` : "User"}
        </Text>
      </View>

      {/* Avatar + stats row */}
      <View className="flex-row items-center px-4 py-3 gap-6">
        {profile?.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            className="w-16 h-16 rounded-full"
          />
        ) : (
          <View className="w-16 h-16 rounded-full bg-gray-200 items-center justify-center">
            <Ionicons name="person-outline" size={28} color="#9ca3af" />
          </View>
        )}

        <View className="flex-row gap-6">
          <View className="items-center">
            <Text className="text-xl font-bold">{ownedCount}</Text>
            <Text className="text-xs text-gray-500">Owned</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold">{followerCount}</Text>
            <Text className="text-xs text-gray-500">Followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold">{followingCount}</Text>
            <Text className="text-xs text-gray-500">Following</Text>
          </View>
        </View>
      </View>

      {/* Follow button — full width, only shown when viewing another user's profile */}
      {!isOwnProfile && (
        <View className="px-4 pb-4">
          <TouchableOpacity
            onPress={toggle}
            disabled={followLoading || toggling}
            className={`py-2.5 rounded-full border items-center ${
              following ? "border-gray-300 bg-white" : "bg-black border-black"
            }`}
          >
            <Text className={following ? "text-gray-700 font-semibold" : "text-white font-semibold"}>
              {toggling ? "..." : following ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Section divider */}
      <View className="h-px bg-gray-100" />

      {/* Closet grid */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item: entry }) => (
          <TouchableOpacity
            className="flex-1 m-1 bg-gray-50 rounded-xl p-3"
            onPress={() =>
              navigation.navigate("Browse", {
                screen: "Item",
                params: { itemId: entry.item_id },
              })
            }
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
