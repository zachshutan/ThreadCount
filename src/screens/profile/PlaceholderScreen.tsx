import React from "react";
import { View, Text } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { ProfileStackParamList } from "../../navigation/MainTabs";

type PlaceholderRouteProp = RouteProp<ProfileStackParamList, "Placeholder">;

export default function PlaceholderScreen() {
  const route = useRoute<PlaceholderRouteProp>();
  const { title } = route.params;

  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      <Ionicons name="construct-outline" size={48} color="#d1d5db" />
      <Text className="text-sm text-gray-400 mt-4 text-center leading-relaxed">
        This page is coming soon. We're working on it.
      </Text>
    </View>
  );
}
