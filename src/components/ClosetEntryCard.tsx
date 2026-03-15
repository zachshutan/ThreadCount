import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { ClosetEntry } from "../services/closetService";

type Props = {
  entry: ClosetEntry;
  onPress: (() => void) | null;
};

export default function ClosetEntryCard({ entry, onPress }: Props) {
  const score = entry.scores?.[0] ?? null;
  const rank = score?.category_rank ?? null;
  const overallScore = score?.overall_score ?? null;
  const subtypeName = entry.items?.subtypes?.name ?? null;

  return (
    <TouchableOpacity
      className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center justify-between"
      onPress={onPress ?? undefined}
      disabled={!onPress}
    >
      <View className="flex-1 mr-3">
        <Text className="font-semibold" numberOfLines={1}>
          {entry.items?.model_name ?? "Unknown item"}
        </Text>
        <Text className="text-sm text-gray-500 capitalize">
          {entry.items?.brands?.name ?? "Unknown brand"} · {entry.color}
          {subtypeName ? ` · ${subtypeName}` : ""}
        </Text>
      </View>

      {entry.entry_type === "owned" ? (
        rank !== null ? (
          // Ranked item: show badge + score
          <View className="items-end">
            <View className="bg-black rounded-full px-3 py-1 mb-1">
              <Text className="text-white text-xs font-bold">#{rank}</Text>
            </View>
            <Text className="text-lg font-bold">{overallScore?.toFixed(1) ?? "—"}</Text>
          </View>
        ) : (
          // Unranked item
          <View className="items-end">
            <Text className="text-xs text-gray-400">Unranked</Text>
            <Text className="text-xs text-gray-400">Tap to rank</Text>
          </View>
        )
      ) : (
        <Text className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Wishlist</Text>
      )}
    </TouchableOpacity>
  );
}
