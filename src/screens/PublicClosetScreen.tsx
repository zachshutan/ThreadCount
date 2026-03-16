import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  Image, ScrollView,
} from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getPublicCloset } from "../services/followService";
import { useFollow } from "../hooks/useFollow";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";
import ClosetEntryCard from "../components/ClosetEntryCard";
import type { ClosetEntry } from "../services/closetService";

type PublicClosetRouteParams = { userId: string };
type Tab = "owned" | "interested";

export default function PublicClosetScreen() {
  const route = useRoute<RouteProp<{ PublicCloset: PublicClosetRouteParams }, "PublicCloset">>();
  const navigation = useNavigation<any>();
  const { userId } = route.params;
  const { user: currentUser } = useAuth();

  const { profile, followerCount, followingCount, loading: profileLoading } = useProfile(userId);
  const [entries, setEntries] = useState<ClosetEntry[]>([]);
  const [closetLoading, setClosetLoading] = useState(true);
  const { following, loading: followLoading, toggling, toggle } = useFollow(userId);
  const [activeTab, setActiveTab] = useState<Tab>("owned");
  const [activeSubtype, setActiveSubtype] = useState<string | null>(null);

  useEffect(() => {
    getPublicCloset(userId).then(({ data }) => {
      if (data) setEntries(data as ClosetEntry[]);
      setClosetLoading(false);
    });
  }, [userId]);

  const isOwnProfile = currentUser?.id === userId;

  const owned = entries.filter((e) => e.entry_type === "owned");
  const interested = entries.filter((e) => e.entry_type === "interested");

  // Sort owned by overall_score descending (highest ranked first)
  const sortedOwned = [...owned].sort((a, b) => {
    const sa = a.scores?.overall_score ?? 0;
    const sb = b.scores?.overall_score ?? 0;
    return sb - sa;
  });

  // Subtype filter pills
  const subtypeNames = Array.from(
    new Set(owned.map((e) => e.items?.subtypes?.name).filter(Boolean) as string[])
  );
  const filteredOwned = activeSubtype
    ? sortedOwned.filter((e) => e.items?.subtypes?.name === activeSubtype)
    : sortedOwned;

  if (profileLoading || closetLoading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  return (
    <View className="flex-1 bg-white">
      {/* Profile header */}
      <View className="px-4 pt-4 pb-3">
        <Text className="text-2xl font-bold">
          {profile?.username ? `@${profile.username}` : "User"}
        </Text>
      </View>

      {/* Avatar + stats row */}
      <View className="flex-row items-center px-4 pb-4 gap-6">
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} className="w-16 h-16 rounded-full" />
        ) : (
          <View className="w-16 h-16 rounded-full bg-gray-200 items-center justify-center">
            <Ionicons name="person-outline" size={28} color="#9ca3af" />
          </View>
        )}
        <View className="flex-row gap-6">
          <View className="items-center">
            <Text className="text-xl font-bold">{owned.length}</Text>
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

      {/* Follow button — only when viewing another user's profile */}
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

      {/* Owned / Wishlist tabs */}
      <View className="flex-row border-b border-gray-100 px-4">
        {(["owned", "interested"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            className={`mr-6 py-3 border-b-2 ${activeTab === tab ? "border-black" : "border-transparent"}`}
            onPress={() => { setActiveTab(tab); setActiveSubtype(null); }}
          >
            <Text className={`font-semibold ${activeTab === tab ? "text-black" : "text-gray-400"}`}>
              {tab === "owned" ? `Owned (${owned.length})` : `Wishlist (${interested.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subtype filter pills — owned tab only, when >1 subtype */}
      {activeTab === "owned" && subtypeNames.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-grow-0 border-b border-gray-100"
          contentContainerClassName="px-4 py-2 gap-2"
        >
          <TouchableOpacity
            className={`px-4 py-2 rounded-full border ${
              activeSubtype === null ? "bg-black border-black" : "border-gray-300"
            }`}
            onPress={() => setActiveSubtype(null)}
          >
            <Text className={`text-sm font-medium ${activeSubtype === null ? "text-white" : "text-gray-700"}`}>
              All
            </Text>
          </TouchableOpacity>
          {subtypeNames.map((name) => (
            <TouchableOpacity
              key={name}
              className={`px-4 py-2 rounded-full border ${
                activeSubtype === name ? "bg-black border-black" : "border-gray-300"
              }`}
              onPress={() => setActiveSubtype(name)}
            >
              <Text className={`text-sm font-medium ${activeSubtype === name ? "text-white" : "text-gray-700"}`}>
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content list */}
      {activeTab === "owned" ? (
        filteredOwned.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="shirt-outline" size={40} color="#d1d5db" />
            <Text className="text-gray-400 text-center mt-3">
              {activeSubtype ? `No ${activeSubtype} items yet.` : "This closet is empty."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredOwned}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            renderItem={({ item: entry }) => (
              <ClosetEntryCard
                entry={entry}
                onPress={
                  entry.item_id
                    ? () =>
                        navigation.navigate("Browse", {
                          screen: "Item",
                          params: { itemId: entry.item_id },
                        })
                    : null
                }
              />
            )}
          />
        )
      ) : (
        interested.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="heart-outline" size={40} color="#d1d5db" />
            <Text className="text-gray-400 text-center mt-3">Nothing on their wishlist yet.</Text>
          </View>
        ) : (
          <FlatList
            data={interested}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            renderItem={({ item: entry }) => (
              <ClosetEntryCard
                entry={entry}
                onPress={
                  entry.item_id
                    ? () =>
                        navigation.navigate("Browse", {
                          screen: "Item",
                          params: { itemId: entry.item_id },
                        })
                    : null
                }
              />
            )}
          />
        )
      )}
    </View>
  );
}
