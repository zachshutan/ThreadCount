import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { RootStackParamList } from "../../navigation/RootNavigator";

type PostDetailRouteProp = RouteProp<RootStackParamList, "PostDetail">;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<PostDetailRouteProp>();
  const { event } = route.params;

  const handleShare = async () => {
    let message = event.username ?? "Someone";
    if (event.event_type === "review") {
      message += ` reviewed ${event.item_name ?? "an item"}`;
      if (event.brand_name) message += ` by ${event.brand_name}`;
      if (event.review_body) message += `\n\n"${event.review_body}"`;
    } else if (event.event_type === "comparison") {
      message += ` rated ${event.item_name ?? "an item"}`;
      if (event.brand_name) message += ` by ${event.brand_name}`;
      if (event.overall_score != null) {
        message += ` — ${event.overall_score.toFixed(1)}/10`;
      }
    } else {
      message += ` added ${event.item_name ?? "an item"} to their closet`;
      if (event.brand_name) message += ` by ${event.brand_name}`;
    }
    message += "\n\nShared from Threadcount";
    await Share.share({ message });
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-end px-4 pt-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color="#9ca3af" />
        </TouchableOpacity>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header: username + date */}
        <View className="px-6 pt-6 pb-4">
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("PublicCloset", { userId: event.user_id })
            }
          >
            <Text className="text-xl font-bold">{event.username}</Text>
          </TouchableOpacity>
          <Text className="text-xs text-gray-400 mt-1 uppercase tracking-widest">
            {formatDate(event.created_at)}
          </Text>
        </View>

        {/* Divider */}
        <View className="h-px bg-gray-100 mx-6" />

        {/* Action label + item */}
        <View className="px-6 pt-5 pb-2">
          <Text className="text-xs uppercase tracking-widest text-gray-400 mb-2">
            {event.event_type === "review"
              ? "Reviewed"
              : event.event_type === "comparison"
              ? "Rated"
              : "Added to closet"}
          </Text>

          {event.item_id ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Browse", {
                  screen: "Item",
                  params: { itemId: event.item_id },
                })
              }
            >
              <Text className="text-2xl font-bold leading-tight underline">
                {event.item_name}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-2xl font-bold leading-tight">
              {event.item_name}
            </Text>
          )}

          {event.brand_name ? (
            <Text className="text-sm text-gray-500 mt-1">{event.brand_name}</Text>
          ) : null}
          {event.category ? (
            <Text className="text-xs text-gray-400 mt-0.5">{event.category}</Text>
          ) : null}
        </View>

        {/* Review content */}
        {event.event_type === "review" && (
          <View className="px-6 pt-4">
            {event.review_body ? (
              <Text className="text-base text-gray-700 leading-relaxed italic mb-5">
                "{event.review_body}"
              </Text>
            ) : null}

            {(event.fit_rating != null || event.quality_rating != null) && (
              <View className="flex-row" style={{ gap: 12 }}>
                {event.fit_rating != null && (
                  <View
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl items-center py-3"
                  >
                    <Text className="text-xs uppercase tracking-widest text-gray-400 mb-1">
                      Fit
                    </Text>
                    <Text className="text-2xl font-bold">
                      {event.fit_rating}
                      <Text className="text-sm font-normal text-gray-400">/5</Text>
                    </Text>
                  </View>
                )}
                {event.quality_rating != null && (
                  <View
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl items-center py-3"
                  >
                    <Text className="text-xs uppercase tracking-widest text-gray-400 mb-1">
                      Quality
                    </Text>
                    <Text className="text-2xl font-bold">
                      {event.quality_rating}
                      <Text className="text-sm font-normal text-gray-400">/5</Text>
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Comparison score */}
        {event.event_type === "comparison" && event.overall_score != null && (
          <View className="px-6 pt-4">
            <View className="bg-black rounded-2xl items-center py-6">
              <Text className="text-xs uppercase tracking-widest text-gray-400 mb-1">
                Overall Score
              </Text>
              <Text className="text-5xl font-bold text-white">
                {event.overall_score.toFixed(1)}
                <Text className="text-2xl font-normal text-gray-400">/10</Text>
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Share button */}
      <View className="px-6 pb-6 pt-4 border-t border-gray-100">
        <TouchableOpacity
          className="bg-black rounded-full py-4 flex-row items-center justify-center"
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={18} color="white" />
          <Text className="text-white font-semibold ml-2">Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
