import React from "react";
import {
  View, Text, TextInput, TouchableOpacity, SectionList, ActivityIndicator, ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSearch } from "../../hooks/useSearch";
import { useBrands } from "../../hooks/useBrands";

const DISCOVER_CATEGORIES = [
  { label: "T-Shirts", icon: "shirt-outline" as const },
  { label: "Hoodies", icon: "cloud-outline" as const },
  { label: "Pants", icon: "reorder-three-outline" as const },
  { label: "Sneakers", icon: "footsteps-outline" as const },
  { label: "Jackets", icon: "umbrella-outline" as const },
  { label: "Shorts", icon: "sunny-outline" as const },
];

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { query, results, loading, runSearch } = useSearch();
  const { brands } = useBrands();

  const sections = [
    {
      title: "Brands",
      data: results.brands,
      renderItem: ({ item }: any) => (
        <TouchableOpacity
          className="flex-row items-center py-3 px-4 border-b border-gray-100"
          onPress={() =>
            navigation.navigate("Browse", {
              screen: "Brand",
              params: { brandId: item.id, brandName: item.name },
            })
          }
        >
          <Text className="font-medium">{item.name}</Text>
        </TouchableOpacity>
      ),
    },
    {
      title: "Items",
      data: results.items,
      renderItem: ({ item }: any) => (
        <TouchableOpacity
          className="flex-row items-center py-3 px-4 border-b border-gray-100"
          onPress={() =>
            navigation.navigate("Browse", {
              screen: "Item",
              params: { itemId: item.id },
            })
          }
        >
          <View>
            <Text className="font-medium">{item.model_name}</Text>
            <Text className="text-sm text-gray-500">
              {item.brands?.name} · {item.category}
            </Text>
          </View>
        </TouchableOpacity>
      ),
    },
    {
      title: "People",
      data: results.profiles,
      renderItem: ({ item }: any) => (
        <TouchableOpacity
          className="flex-row items-center py-3 px-4 border-b border-gray-100"
          onPress={() =>
            navigation.navigate("PublicCloset", { userId: item.id })
          }
        >
          <Text className="font-medium">@{item.username}</Text>
        </TouchableOpacity>
      ),
    },
  ].filter((s) => s.data.length > 0);

  const hasQuery = query.trim().length > 0;

  return (
    <View className="flex-1 bg-white">
      {/* Search input */}
      <View className="p-4 border-b border-gray-100">
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-3 text-base"
          placeholder="Search brands, items, or people…"
          value={query}
          onChangeText={runSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <ActivityIndicator className="mt-8" />
      ) : !hasQuery ? (
        <ScrollView contentContainerClassName="pb-8">
          {/* Browse Brands */}
          {brands.length > 0 && (
            <View className="mt-5 px-4">
              <Text className="font-semibold text-base mb-3">Browse Brands</Text>
              <View className="flex-row flex-wrap gap-2">
                {brands.slice(0, 6).map((brand) => (
                  <TouchableOpacity
                    key={brand.id}
                    className="px-4 py-2 bg-gray-100 rounded-full"
                    onPress={() =>
                      navigation.navigate("Browse", {
                        screen: "Brand",
                        params: { brandId: brand.id, brandName: brand.name },
                      })
                    }
                  >
                    <Text className="text-sm font-medium text-gray-700">{brand.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Discover by category */}
          <View className="mt-6 px-4">
            <Text className="font-semibold text-base mb-3">Discover</Text>
            <View className="flex-row flex-wrap gap-2">
              {DISCOVER_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.label}
                  className="flex-row items-center gap-2 px-4 py-2 border border-gray-200 rounded-full"
                  onPress={() => runSearch(cat.label)}
                >
                  <Ionicons name={cat.icon} size={14} color="#6b7280" />
                  <Text className="text-sm text-gray-600">{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : sections.length === 0 ? (
        <Text className="text-center text-gray-400 mt-12">No results for "{query}"</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: any) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <View className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <Text className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
                {title}
              </Text>
            </View>
          )}
          renderItem={({ item, section }: any) => section.renderItem({ item })}
        />
      )}
    </View>
  );
}
