import React, { useState, useEffect } from "react";
import {
  View, Text, SectionList, TouchableOpacity, ActivityIndicator,
  Image, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { BrowseStackParamList } from "../../navigation/MainTabs";
import { useItems } from "../../hooks/useItems";
import { type Item } from "../../services/itemService";
import { getBrandById, type Brand } from "../../services/brandService";

type Props = {
  navigation: NativeStackNavigationProp<BrowseStackParamList, "Brand">;
  route: RouteProp<BrowseStackParamList, "Brand">;
};

function groupBySubtype(items: Item[]): { title: string; data: Item[] }[] {
  const map: Record<string, Item[]> = {};
  for (const item of items) {
    const key = item.subtypes?.name ?? "Other";
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, data]) => ({ title, data }));
}

export default function BrandScreen({ navigation, route }: Props) {
  const { brandId } = route.params;
  const { items, loading, error } = useItems(brandId);
  const [brand, setBrand] = useState<Brand | null>(null);

  useEffect(() => {
    getBrandById(brandId).then((result) => {
      if (result.data) setBrand(result.data);
    });
  }, [brandId]);

  // Determine logo source: prefer logo_url, fall back to logo.dev when website_url is available
  function getLogoUri(): string | null {
    if (brand?.logo_url) return brand.logo_url;
    if (brand?.website_url) {
      try {
        const domain = new URL(brand.website_url).hostname;
        return `https://img.logo.dev/${domain}?token=${process.env.EXPO_PUBLIC_LOGO_DEV_TOKEN}`;
      } catch {
        return null;
      }
    }
    return null;
  }

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-red-500 text-center">{error}</Text>
      </View>
    );
  }

  const logoUri = getLogoUri();

  return (
    <SectionList
      sections={groupBySubtype(items)}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={
        <View className="px-4 pt-5 pb-5 border-b border-gray-100">
          {/* Top row: logo + brand info side by side */}
          <View className="flex-row items-center gap-4 mb-4">
            {/* Logo — 64×64 */}
            <View className="w-16 h-16 rounded-xl bg-gray-100 items-center justify-center overflow-hidden">
              {logoUri ? (
                <Image
                  source={{ uri: logoUri }}
                  style={{ width: 64, height: 64 }}
                  resizeMode="contain"
                />
              ) : (
                <Text className="text-gray-400 text-xs font-medium">
                  {brand?.name?.charAt(0) ?? "?"}
                </Text>
              )}
            </View>

            {/* Brand name, item count, website */}
            <View className="flex-1">
              <Text className="text-xl font-bold mb-0.5">{brand?.name ?? route.params.brandName}</Text>
              <Text className="text-sm text-gray-400 mb-1">
                {items.length} {items.length === 1 ? "item" : "items"}
              </Text>
              {brand?.website_url ? (
                <TouchableOpacity onPress={() => Linking.openURL(brand.website_url!)}>
                  <Text className="text-sm text-blue-600">↗ Visit website</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Brand description */}
          {brand?.description ? (
            <View className="bg-gray-50 rounded-xl px-4 py-3">
              <Text className="text-sm text-gray-600 leading-5">{brand.description}</Text>
            </View>
          ) : null}
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View className="bg-white px-4 py-2 border-b border-gray-100">
          <Text className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50"
          onPress={() => navigation.navigate("Item", { itemId: item.id })}
        >
          <View className="flex-1 mr-3">
            <Text className="font-medium" numberOfLines={2}>{item.model_name}</Text>
            <Text className="text-sm text-gray-500 capitalize">
              {item.subtypes?.name ?? item.category}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View className="items-center justify-center py-16">
          <Text className="text-gray-400">No items yet</Text>
        </View>
      }
    />
  );
}
