import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { ClosetEntry } from "../services/closetService";

type Props = {
  entry: ClosetEntry;
  onPress: (() => void) | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  top: "top",
  bottom: "bottom",
  footwear: "footwear",
};

// Score color: amber/gold when ≥ 8, muted gold when ≥ 6, neutral gray otherwise
function scoreColor(score: number | null): string {
  if (score === null) return "#9CA3AF";
  if (score >= 8) return "#C8941A";
  if (score >= 6) return "#B8860B";
  return "#9CA3AF";
}

export default function ClosetEntryCard({ entry, onPress }: Props) {
  const score = entry.scores ?? null;
  const rank = score?.category_rank ?? null;
  const overallScore = score?.overall_score ?? null;
  const subtypeName = entry.items?.subtypes?.name ?? null;

  return (
    <TouchableOpacity
      style={{
        backgroundColor: "#FAFAF8",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
      onPress={onPress ?? undefined}
      disabled={!onPress}
    >
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontWeight: "600", fontSize: 15, color: "#111" }} numberOfLines={1}>
          {entry.items?.model_name ?? "Unknown item"}
        </Text>
        <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }} numberOfLines={1}>
          {entry.items?.brands?.name ?? "Unknown brand"}
          {entry.color ? ` · ${entry.color}` : ""}
          {subtypeName ? ` · ${subtypeName}` : ""}
        </Text>
      </View>

      {entry.entry_type === "owned" ? (
        rank !== null ? (
          // Ranked item: amber-bordered pill badge + warm score
          <View style={{ alignItems: "flex-end" }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: "#C8941A",
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 3,
                marginBottom: 4,
              }}
            >
              <Text style={{ color: "#C8941A", fontSize: 11, fontWeight: "700" }}>
                #{rank}{entry.items?.category ? ` ${CATEGORY_LABELS[entry.items.category] ?? entry.items.category}` : ""}
              </Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: scoreColor(overallScore) }}>
              {overallScore?.toFixed(1) ?? "—"}
            </Text>
          </View>
        ) : (
          // Unranked item
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 12, color: "#C4C4C4" }}>Unranked</Text>
            <Text style={{ fontSize: 11, color: "#D4A017", marginTop: 1 }}>Tap to rank</Text>
          </View>
        )
      ) : (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Wishlist</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
