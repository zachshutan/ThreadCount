import React from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { BrowseStackParamList } from "../../navigation/MainTabs";
import { useItems } from "../../hooks/useItems";

type Props = {
  navigation: NativeStackNavigationProp<BrowseStackParamList, "Brand">;
  route: RouteProp<BrowseStackParamList, "Brand">;
};

export default function BrandScreen({ navigation, route }: Props) {
  const { brandId } = route.params;
  const { items, loading, error } = useItems(brandId);

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

  return (
    <FlatList
      className="bg-white"
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerClassName="p-4 gap-3"
      ListEmptyComponent={
        <Text className="text-center text-gray-400 py-8">No items yet.</Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center justify-between"
          onPress={() => navigation.navigate("Item", { itemId: item.id })}
        >
          <View>
            <Text className="font-semibold">{item.model_name}</Text>
            <Text className="text-sm text-gray-500 capitalize">
              {item.subtypes?.name ?? item.category}
            </Text>
          </View>
          <Text className="text-gray-400">›</Text>
        </TouchableOpacity>
      )}
    />
  );
}
