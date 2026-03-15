import React from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Image,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BrowseStackParamList } from "../../navigation/MainTabs";
import { useBrands } from "../../hooks/useBrands";

type Props = {
  navigation: NativeStackNavigationProp<BrowseStackParamList, "BrowseList">;
};

export default function BrowseScreen({ navigation }: Props) {
  const { brands, loading, loadingMore, loadMore, error } = useBrands();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-red-500 text-center">{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="bg-white"
      data={brands}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerClassName="p-4 gap-3"
      columnWrapperClassName="gap-3"
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" /> : null}
      renderItem={({ item }) => {
        const logoUri = item.logo_url
          ?? (item.website_url
            ? (() => { try { return `https://img.logo.dev/${new URL(item.website_url!).hostname}?token=${process.env.EXPO_PUBLIC_LOGO_DEV_TOKEN}`; } catch { return null; } })()
            : null);
        return (
          <TouchableOpacity
            className="flex-1 bg-gray-50 rounded-xl p-4 items-center"
            onPress={() => navigation.navigate("Brand", { brandId: item.id, brandName: item.name })}
          >
            <View className="w-16 h-16 mb-2 rounded-xl bg-gray-200 items-center justify-center overflow-hidden">
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={{ width: 64, height: 64 }} resizeMode="contain" />
              ) : (
                <Text className="text-xl font-bold text-gray-400">{item.name.charAt(0)}</Text>
              )}
            </View>
            <Text className="font-semibold text-sm text-center" numberOfLines={2}>{item.name}</Text>
            {item.item_count != null && (
              <Text className="text-xs text-gray-400 mt-0.5">{item.item_count} item{item.item_count !== 1 ? "s" : ""}</Text>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}
