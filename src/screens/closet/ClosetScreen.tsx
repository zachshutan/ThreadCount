import React, { useState } from "react";
import {
  View, Text, SectionList, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ClosetStackParamList } from "../../navigation/MainTabs";
import { useCloset } from "../../hooks/useCloset";
import ClosetEntryCard from "../../components/ClosetEntryCard";
import type { ClosetEntry } from "../../services/closetService";

type Props = {
  navigation: NativeStackNavigationProp<ClosetStackParamList, "ClosetList">;
};

type Tab = "owned" | "interested";

export default function ClosetScreen({ navigation }: Props) {
  const { owned, interested, ownedBySubtype, subtypeNames, loading, error } = useCloset();
  const [activeTab, setActiveTab] = useState<Tab>("owned");
  const [activeSubtype, setActiveSubtype] = useState<string | null>(null);

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  // Filter sections for the owned tab based on selected subtype pill
  const visibleSections = activeSubtype
    ? ownedBySubtype.filter((s) => s.subtypeName === activeSubtype)
    : ownedBySubtype;

  return (
    <View className="flex-1 bg-white">
      {/* Owned / Wishlist tabs */}
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
      ) : activeTab === "owned" ? (
        <>
          {/* Subcategory filter pills (only shown when owned items exist) */}
          {subtypeNames.length > 1 && (
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

          {owned.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-gray-400 text-center">
                You haven't added any owned items yet. Browse brands to get started.
              </Text>
            </View>
          ) : (
            <SectionList
              sections={visibleSections}
              keyExtractor={(item) => item.id}
              contentContainerClassName="pb-8"
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => (
                <View className="px-4 pt-5 pb-2">
                  <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {section.subtypeName}
                  </Text>
                </View>
              )}
              renderItem={({ item }: { item: ClosetEntry }) => (
                <View className="px-4 pb-2">
                  <ClosetEntryCard
                    entry={item}
                    onPress={() => navigation.navigate("ItemDetail", { closetEntryId: item.id })}
                  />
                </View>
              )}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center px-6 pt-16">
                  <Text className="text-gray-400 text-center">
                    No {activeSubtype ?? ""} items yet.
                  </Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        // Wishlist tab — simple flat list
        interested.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-gray-400 text-center">Your wishlist is empty.</Text>
          </View>
        ) : (
          <FlatList
            data={interested}
            keyExtractor={(item) => item.id}
            contentContainerClassName="p-4 gap-3"
            renderItem={({ item }) => (
              <ClosetEntryCard
                entry={item}
                onPress={null}
              />
            )}
          />
        )
      )}
    </View>
  );
}
