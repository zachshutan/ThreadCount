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
      renderItem={({ item }) => (
        <TouchableOpacity
          className="flex-1 bg-gray-50 rounded-xl p-4 items-center"
          onPress={() => navigation.navigate("Brand", { brandId: item.id, brandName: item.name })}
        >
          {item.logo_url ? (
            <Image source={{ uri: item.logo_url }} className="w-16 h-16 mb-2" resizeMode="contain" />
          ) : (
            <View className="w-16 h-16 mb-2 bg-gray-200 rounded-lg items-center justify-center">
              <Text className="text-gray-400 text-xs">No logo</Text>
            </View>
          )}
          <Text className="font-semibold text-sm text-center" numberOfLines={2}>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
