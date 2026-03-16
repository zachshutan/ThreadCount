import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { useCloset } from "../../hooks/useCloset";
import ClosetEntryCard from "../../components/ClosetEntryCard";
import type { ProfileStackParamList } from "../../navigation/MainTabs";

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "ProfileHome">;
};

export default function ProfileScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { profile, followerCount, followingCount, loading: profileLoading, refresh: refreshProfile } = useProfile(user?.id ?? "");
  const { owned, interested, loading: closetLoading } = useCloset();

  useFocusEffect(
    React.useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  if (profileLoading || closetLoading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Header with settings icon */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold">{profile?.username ? `@${profile.username}` : "Profile"}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
          <Ionicons name="menu-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Avatar + stats row */}
      <View className="flex-row items-center px-4 py-4 gap-6">
        <TouchableOpacity onPress={() => Alert.alert("Change photo", "Avatar upload coming soon.")}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} className="w-20 h-20 rounded-full" />
          ) : (
            <View className="w-20 h-20 rounded-full bg-gray-200 items-center justify-center">
              <Ionicons name="person-outline" size={32} color="#9ca3af" />
            </View>
          )}
        </TouchableOpacity>
        <View className="flex-row gap-6">
          <TouchableOpacity
            className="items-center"
            onPress={() => navigation.getParent<any>()?.navigate("Closet", {
              screen: "ClosetList", params: { initialTab: "owned" },
            })}
          >
            <Text className="text-xl font-bold">{owned.length}</Text>
            <Text className="text-xs text-gray-500">Owned</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="items-center"
            onPress={() => navigation.getParent<any>()?.navigate("Closet", {
              screen: "ClosetList", params: { initialTab: "interested" },
            })}
          >
            <Text className="text-xl font-bold">{interested.length}</Text>
            <Text className="text-xs text-gray-500">Wishlist</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="items-center"
            onPress={() => user?.id && navigation.navigate("FollowList", { type: "followers", userId: user.id })}
          >
            <Text className="text-xl font-bold">{followerCount}</Text>
            <Text className="text-xs text-gray-500">Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="items-center"
            onPress={() => user?.id && navigation.navigate("FollowList", { type: "following", userId: user.id })}
          >
            <Text className="text-xl font-bold">{followingCount}</Text>
            <Text className="text-xs text-gray-500">Following</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Owned items list — sorted by ranking score, unranked at bottom */}
      <View className="px-4 pt-2 pb-8">
        {/* Section header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", letterSpacing: 1.2, textTransform: "uppercase" }}>
            My Closet
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: "#F0EDE8", marginLeft: 10 }} />
        </View>

        {owned.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
              Your closet is empty
            </Text>
            <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 18 }}>
              Browse brands, add items you own, and start ranking them to build your closet.
            </Text>
          </View>
        ) : (
          [...owned]
            .sort((a, b) => {
              const sa = a.scores?.overall_score ?? null;
              const sb = b.scores?.overall_score ?? null;
              if (sa === null && sb === null) return 0;
              if (sa === null) return 1;
              if (sb === null) return -1;
              return sb - sa;
            })
            .map((entry) => (
              <View key={entry.id} style={{ marginBottom: 8 }}>
                <ClosetEntryCard
                  entry={entry}
                  onPress={() =>
                    navigation.getParent<any>()?.navigate("Browse", {
                      screen: "Item",
                      params: { itemId: entry.item_id },
                    })
                  }
                />
              </View>
            ))
        )}
      </View>
    </ScrollView>
  );
}
