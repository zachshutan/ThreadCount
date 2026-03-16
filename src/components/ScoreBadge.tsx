import React from "react";
import { View, Text } from "react-native";

type Props = {
  score: number;
  size?: "sm" | "md" | "lg";
};

const SIZE_STYLES = {
  sm: { container: "px-2 py-0.5 rounded-full", text: "text-xs font-bold" },
  md: { container: "px-3 py-1 rounded-full", text: "text-sm font-bold" },
  lg: { container: "px-4 py-1.5 rounded-full", text: "text-base font-bold" },
};

// Gold/amber when high (≥ 8), muted gold for medium (≥ 6), gray for low
function getColors(score: number) {
  if (score >= 8) return { bg: "#D4A017", text: "#fff" };
  if (score >= 6) return { bg: "#E8C56A", text: "#5C4200" };
  return { bg: "#E5E7EB", text: "#6B7280" };
}

export default function ScoreBadge({ score, size = "md" }: Props) {
  const { container, text } = SIZE_STYLES[size];
  const colors = getColors(score);
  return (
    <View className={container} style={{ backgroundColor: colors.bg }}>
      <Text className={text} style={{ color: colors.text }}>
        {score.toFixed(1)}
      </Text>
    </View>
  );
}
