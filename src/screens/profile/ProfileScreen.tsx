import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
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
  const { profile, followerCount, followingCount, loading: profileLoading } = useProfile(user?.id ?? "");
  const { owned, interested, loading: closetLoading } = useCloset();

  if (profileLoading || closetLoading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Header with settings icon */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold">{profile?.username ?? "Profile"}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
          <Ionicons name="menu-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Avatar + stats row */}
      <View className="flex-row items-center px-4 py-4 gap-6">
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} className="w-20 h-20 rounded-full" />
        ) : (
          <View className="w-20 h-20 rounded-full bg-gray-200 items-center justify-center">
            <Ionicons name="person-outline" size={32} color="#9ca3af" />
          </View>
        )}
        <View className="flex-row gap-6">
          <View className="items-center">
            <Text className="text-xl font-bold">{owned.length}</Text>
            <Text className="text-xs text-gray-500">Owned</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold">{interested.length}</Text>
            <Text className="text-xs text-gray-500">Wishlist</Text>
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

      {/* Owned items list */}
      <View className="px-4 pt-2 pb-8">
        <Text className="font-bold text-base mb-3">My Closet</Text>
        {owned.length === 0 ? (
          <Text className="text-gray-400 text-sm">No owned items yet.</Text>
        ) : (
          owned.map((entry) => (
            <View key={entry.id} className="mb-2">
              <ClosetEntryCard entry={entry} onPress={null} />
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
