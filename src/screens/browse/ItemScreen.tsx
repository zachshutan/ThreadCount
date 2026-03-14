import React from "react";
import {
  View, Text, ScrollView, ActivityIndicator, Image,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { BrowseStackParamList } from "../../navigation/MainTabs";
import { useItem } from "../../hooks/useItem";
import { useItemImages } from "../../hooks/useItemImages";
import { useItemReviews } from "../../hooks/useItemReviews";
import AddToClosetButton from "../../components/AddToClosetButton";

type Props = {
  route: RouteProp<BrowseStackParamList, "Item">;
};

export default function ItemScreen({ route }: Props) {
  const { itemId } = route.params;
  const { item, scores, loading, error } = useItem(itemId);
  const { images } = useItemImages(itemId);
  const { reviews } = useItemReviews(itemId);

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  if (error || !item) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-red-500 text-center">{error ?? "Item not found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Primary image */}
      {images[0] ? (
        <Image source={{ uri: images[0].url }} className="w-full h-72" resizeMode="cover" />
      ) : (
        <View className="w-full h-72 bg-gray-100 items-center justify-center">
          <Text className="text-gray-400">No image</Text>
        </View>
      )}

      <View className="p-4">
        <Text className="text-2xl font-bold mb-1">{item.model_name}</Text>
        <Text className="text-gray-500 mb-4">
          {item.brands?.name} · {item.subtypes?.name ?? item.category}
        </Text>

        {/* Aggregate scores */}
        {scores && scores.scorer_count >= 3 ? (
          <View className="flex-row gap-4 mb-6">
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-2xl font-bold">
                {scores.avg_overall?.toFixed(1) ?? "—"}
              </Text>
              <Text className="text-xs text-gray-500">Overall</Text>
            </View>
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-2xl font-bold">
                {scores.avg_category?.toFixed(1) ?? "—"}
              </Text>
              <Text className="text-xs text-gray-500 capitalize">{item.category}</Text>
            </View>
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-2xl font-bold">{scores.scorer_count}</Text>
              <Text className="text-xs text-gray-500">Rated by</Text>
            </View>
          </View>
        ) : (
          <Text className="text-sm text-gray-400 mb-6">
            Not enough ratings yet.
          </Text>
        )}

        <AddToClosetButton itemId={itemId} />

        {/* Reviews */}
        <Text className="text-lg font-semibold mt-6 mb-3">Reviews</Text>
        {reviews.length === 0 ? (
          <Text className="text-gray-400 text-sm">No reviews yet.</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} className="border-b border-gray-100 pb-4 mb-4">
              <View className="flex-row justify-between mb-1">
                <Text className="font-semibold text-sm">{review.profiles?.username ?? "Unknown"}</Text>
                <Text className="text-xs text-gray-400">
                  Fit {review.fit_rating}/5 · Quality {review.quality_rating}/5
                </Text>
              </View>
              <Text className="text-sm text-gray-700">{review.body}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
