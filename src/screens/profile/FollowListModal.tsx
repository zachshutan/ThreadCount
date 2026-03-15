import React from "react";
import {
  View, Text, FlatList, ActivityIndicator,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ProfileStackParamList } from "../../navigation/MainTabs";
import { useFollowList } from "../../hooks/useFollowList";

type Props = {
  route: RouteProp<ProfileStackParamList, "FollowList">;
};

export default function FollowListModal({ route }: Props) {
  const { userId, type } = route.params;
  const { users, loading } = useFollowList(userId, type);

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  return (
    <View className="flex-1 bg-white">
      {users.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-400 text-center">
            {type === "followers" ? "No followers yet." : "Not following anyone yet."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-3"
          renderItem={({ item }) => (
            <View className="flex-row items-center py-3 border-b border-gray-100">
              <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-3">
                <Ionicons name="person-outline" size={18} color="#9ca3af" />
              </View>
              <Text className="font-medium text-base">@{item.username}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
