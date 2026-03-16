import React, { useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useFeed } from "../../hooks/useFeed";
import type { FeedEvent } from "../../services/feedService";
import ScoreBadge from "../../components/ScoreBadge";

// Returns a short relative time string: "just now", "2h ago", "3d ago", etc.
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const EVENT_ICON: Record<FeedEvent["event_type"], React.ComponentProps<typeof Ionicons>["name"]> = {
  closet_add: "shirt-outline",
  comparison: "bar-chart-outline",
  review: "chatbubble-outline",
};

const EVENT_COPY: Record<FeedEvent["event_type"], string> = {
  closet_add: "added to their closet",
  comparison: "rated",
  review: "reviewed",
};

function EventCard({
  event,
  onUserPress,
  onItemPress,
  onCardPress,
}: {
  event: FeedEvent;
  onUserPress: () => void;
  onItemPress?: () => void;
  onCardPress?: () => void;
}) {
  const copy = EVENT_COPY[event.event_type];
  const icon = EVENT_ICON[event.event_type];
  const isComparison = event.event_type === "comparison";
  const isReview = event.event_type === "review";

  return (
    <TouchableOpacity
      onPress={onCardPress}
      activeOpacity={0.92}
      style={{
        marginHorizontal: 12,
        marginBottom: 10,
        backgroundColor: "#FAFAF8",
        borderRadius: 14,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
      }}
    >
      <View style={{ padding: 14 }}>
        {/* Top row: icon + username + action copy + score badge */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, flexWrap: "wrap", gap: 4 }}>
            <Ionicons name={icon} size={14} color="#9CA3AF" style={{ marginRight: 2, marginTop: 1 }} />
            <TouchableOpacity onPress={onUserPress}>
              <Text style={{ fontWeight: "700", fontSize: 14, color: "#111" }}>
                {event.username}
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 14, color: "#6B7280" }}>{copy}</Text>
          </View>
          {isComparison && event.overall_score != null && (
            <ScoreBadge score={event.overall_score} size="sm" />
          )}
        </View>

        {/* Item name */}
        <TouchableOpacity onPress={onItemPress} style={{ marginTop: 6 }} disabled={!onItemPress}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#111" }} numberOfLines={1}>
            {event.item_name}
          </Text>
        </TouchableOpacity>

        {/* Brand · category */}
        {event.brand_name && (
          <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
            {event.brand_name} · {event.category}
          </Text>
        )}

        {/* Review snippet */}
        {isReview && event.review_body && (
          <Text
            style={{
              fontSize: 13,
              color: "#6B7280",
              marginTop: 8,
              fontStyle: "italic",
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            "{event.review_body}"
          </Text>
        )}

        {/* Timestamp */}
        <Text style={{ fontSize: 11, color: "#C4C4C4", marginTop: 8 }}>
          {event.created_at ? relativeTime(event.created_at) : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ForYouFeedScreen() {
  const navigation = useNavigation<any>();
  const { events, loading, refreshing, friendsOnly, hasMore, refresh, loadMore, setFilter } =
    useFeed();

  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (refreshing && events.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Everyone / Friends toggle */}
      <View className="flex-row px-3 pt-3 pb-2 border-b border-gray-100">
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
              <Text className={`font-semibold text-sm ${active ? "text-white" : "text-gray-500"}`}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={events}
        keyExtractor={(e) => e.event_id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        renderItem={({ item: event }) => (
          <EventCard
            event={event}
            onUserPress={() => navigation.navigate("PublicCloset", { userId: event.user_id })}
            onItemPress={
              event.item_id
                ? () =>
                    navigation.navigate("Browse", {
                      screen: "Item",
                      params: { itemId: event.item_id },
                    })
                : undefined
            }
            onCardPress={() => navigation.navigate("PostDetail", { event })}
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
            <View className="flex-1 items-center justify-center px-8 pt-16">
              <Ionicons name={friendsOnly ? "people-outline" : "shirt-outline"} size={48} color="#d1d5db" />
              <Text className="text-lg font-semibold text-gray-800 mt-4 text-center">
                {friendsOnly ? "No friends activity yet" : "Nothing here yet"}
              </Text>
              <Text className="text-sm text-gray-400 mt-2 text-center">
                {friendsOnly
                  ? "Follow people to see what they're wearing and ranking."
                  : "Add items to your closet and start ranking them to see activity here."}
              </Text>
              {friendsOnly && (
                <TouchableOpacity
                  className="mt-6 bg-black px-6 py-3 rounded-full"
                  onPress={() => navigation.navigate("Search")}
                >
                  <Text className="text-white font-semibold text-sm">Find people to follow</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />
    </View>
  );
}
