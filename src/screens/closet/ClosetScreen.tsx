import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ClosetStackParamList } from "../../navigation/MainTabs";
import { useCloset } from "../../hooks/useCloset";
import ClosetEntryCard from "../../components/ClosetEntryCard";

type Props = {
  navigation: NativeStackNavigationProp<ClosetStackParamList, "ClosetList">;
};

type Tab = "owned" | "interested";

export default function ClosetScreen({ navigation }: Props) {
  const { owned, interested, loading, error } = useCloset();
  const [activeTab, setActiveTab] = useState<Tab>("owned");

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  const items = activeTab === "owned" ? owned : interested;

  return (
    <View className="flex-1 bg-white">
      {/* Tabs */}
      <View className="flex-row border-b border-gray-100 px-4">
        {(["owned", "interested"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            className={`mr-6 py-3 border-b-2 ${activeTab === tab ? "border-black" : "border-transparent"}`}
            onPress={() => setActiveTab(tab)}
          >
            <Text className={`font-semibold capitalize ${activeTab === tab ? "text-black" : "text-gray-400"}`}>
              {tab === "owned" ? "Owned" : "Wishlist"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <Text className="text-red-500 text-center mt-8">{error}</Text>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-400 text-center">
            {activeTab === "owned"
              ? "You haven't added any owned items yet. Browse brands to get started."
              : "Your wishlist is empty."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4 gap-3"
          renderItem={({ item }) => (
            <ClosetEntryCard
              entry={item}
              onPress={() =>
                activeTab === "owned"
                  ? navigation.navigate("ItemDetail", { closetEntryId: item.id })
                  : null
              }
            />
          )}
        />
      )}
    </View>
  );
}
