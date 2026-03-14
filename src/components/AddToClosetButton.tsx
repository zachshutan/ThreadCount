import React from "react";
import { TouchableOpacity, Text } from "react-native";

export default function AddToClosetButton({ itemId: _ }: { itemId: string }) {
  return (
    <TouchableOpacity className="bg-black py-4 rounded-xl items-center">
      <Text className="text-white font-semibold">Add to Closet</Text>
    </TouchableOpacity>
  );
}
