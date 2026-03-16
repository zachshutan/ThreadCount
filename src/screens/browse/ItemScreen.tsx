import React, { useEffect } from "react";
import {
  View, Text, ScrollView, ActivityIndicator, Image,
} from "react-native";
import { RouteProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import { BrowseStackParamList } from "../../navigation/MainTabs";
import { useItem } from "../../hooks/useItem";
import { useItemImages } from "../../hooks/useItemImages";
import { useItemReviews } from "../../hooks/useItemReviews";
import AddToClosetButton from "../../components/AddToClosetButton";
import SubcategoryPlaceholder from "../../components/SubcategoryPlaceholder";

type Props = {
  route: RouteProp<BrowseStackParamList, "Item">;
};

export default function ItemScreen({ route }: Props) {
  const { itemId } = route.params;
  const navigation = useNavigation();
  const { item, scores, loading, error } = useItem(itemId);
  const { images } = useItemImages(itemId);
  const { reviews, loading: reviewsLoading, refresh: refreshReviews } = useItemReviews(itemId);

  // Update navigator header title to show the actual item name once loaded.
  // This gives the back button proper context (e.g. "< ABC Jogger").
  useEffect(() => {
    if (item?.model_name) {
      navigation.setOptions({ title: item.model_name });
    }
  }, [item?.model_name, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      refreshReviews();
    }, [refreshReviews])
  );

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

  const subtypeName = item.subtypes?.name ?? null;

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Image area — use SubcategoryPlaceholder when no real image */}
      {images[0] ? (
        <Image source={{ uri: images[0].url }} className="w-full h-72" resizeMode="cover" />
      ) : (
        <View className="w-full h-72 bg-gray-100 items-center justify-center">
          <SubcategoryPlaceholder subtypeName={subtypeName ?? item.category} size={120} />
        </View>
      )}

      <View className="px-4 pt-5 pb-10">
        {/* Title + metadata */}
        <Text className="text-2xl font-bold mb-1">{item.model_name}</Text>
        <Text className="text-base text-gray-500 mb-5">
          {item.brands?.name}{subtypeName ? ` · ${subtypeName}` : ""}
        </Text>

        {/* Ratings summary — always show something */}
        {scores && scores.scorer_count >= 3 ? (
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-2xl font-bold">
                {scores.avg_overall?.toFixed(1) ?? "—"}
              </Text>
              <Text className="text-xs text-gray-500">Avg score</Text>
            </View>
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-2xl font-bold">{scores.scorer_count}</Text>
              <Text className="text-xs text-gray-500">Ratings</Text>
            </View>
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-2xl font-bold">{reviews.length}</Text>
              <Text className="text-xs text-gray-500">Reviews</Text>
            </View>
          </View>
        ) : (
          <View className="flex-row items-center gap-3 mb-6 bg-gray-50 rounded-xl px-4 py-3">
            <Text className="text-sm text-gray-500">
              {scores && scores.scorer_count > 0
                ? `${scores.scorer_count} rating${scores.scorer_count === 1 ? "" : "s"}`
                : "No ratings yet"}
              {reviews.length > 0
                ? `  ·  ${reviews.length} review${reviews.length === 1 ? "" : "s"}`
                : ""}
            </Text>
          </View>
        )}

        {/* Primary action */}
        <AddToClosetButton itemId={itemId} />

        {/* Reviews section */}
        <View className="mt-8">
          <Text className="text-lg font-bold mb-4">Reviews</Text>
          {reviewsLoading ? (
            <ActivityIndicator />
          ) : reviews.length === 0 ? (
            <View className="bg-gray-50 rounded-xl px-4 py-5 items-center">
              <Text className="font-semibold text-base mb-1">Be the first to review</Text>
              <Text className="text-sm text-gray-500 text-center">
                Add this item to your closet, then share how it fits, feels, and holds up.
              </Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} className="border-b border-gray-100 pb-4 mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-semibold text-sm">@{review.profiles?.username ?? "Unknown"}</Text>
                  <Text className="text-xs text-gray-400">
                    Fit {review.fit_rating}/5 · Quality {review.quality_rating}/5
                  </Text>
                </View>
                <Text className="text-sm text-gray-700 leading-5">{review.body}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
