import React, { useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useFeed } from "../../hooks/useFeed";
import type { FeedEvent } from "../../services/feedService";

function EventCard({ event, onUserPress }: { event: FeedEvent; onUserPress: () => void }) {
  const descriptions: Record<FeedEvent["event_type"], string> = {
    closet_add: `added ${event.item_name} to their closet`,
    comparison: `rated ${event.item_name} — ${event.overall_score?.toFixed(1) ?? "?"}/10`,
    review: `reviewed ${event.item_name}`,
  };

  return (
    <View className="p-4 border-b border-gray-100">
      <View className="flex-row items-center mb-1 flex-wrap">
        <TouchableOpacity onPress={onUserPress}>
          <Text className="font-semibold text-sm">{event.username}</Text>
        </TouchableOpacity>
        <Text className="text-gray-500 text-sm ml-1">{descriptions[event.event_type]}</Text>
      </View>
      {event.brand_name && (
        <Text className="text-xs text-gray-400">
          {event.brand_name} · {event.category}
        </Text>
      )}
      {event.event_type === "review" && event.review_body && (
        <Text className="text-sm text-gray-600 mt-1" numberOfLines={2}>
          "{event.review_body}"
        </Text>
      )}
    </View>
  );
}

export default function ForYouFeedScreen() {
  const navigation = useNavigation<any>();
  const { events, loading, refreshing, friendsOnly, hasMore, refresh, loadMore, setFilter } =
    useFeed();

  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View className="flex-1 bg-white">
      {/* Everyone / Friends toggle */}
      <View className="flex-row p-3 border-b border-gray-100">
        {(["Everyone", "Friends"] as const).map((label, i) => {
          const active = i === 0 ? !friendsOnly : friendsOnly;
          return (
            <TouchableOpacity
              key={label}
              className={`flex-1 py-2 rounded-full mr-1 items-center ${
                active ? "bg-black" : "bg-gray-100"
              }`}
              onPress={() => setFilter(i === 1)}
            >
              <Text className={`font-semibold text-sm ${active ? "text-white" : "text-gray-600"}`}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={events}
        keyExtractor={(e) => e.event_id}
        renderItem={({ item: event }) => (
          <EventCard
            event={event}
            onUserPress={() => navigation.navigate("PublicCloset", { userId: event.user_id })}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading && hasMore ? <ActivityIndicator className="py-4" /> : null
        }
        ListEmptyComponent={
          !loading && !refreshing ? (
            <Text className="text-center text-gray-400 mt-12">
              {friendsOnly ? "Follow someone to see their activity." : "No activity yet."}
            </Text>
          ) : null
        }
      />
    </View>
  );
}
