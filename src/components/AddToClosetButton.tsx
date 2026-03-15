import React, { useState } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useClosetEntry } from "../hooks/useClosetEntry";
import { useAuth } from "../hooks/useAuth";
import { addToCloset } from "../services/closetService";
import AddToClosetModal from "../screens/browse/AddToClosetModal";
import type { ClosetEntry } from "../services/closetService";

type Props = {
  itemId: string;
  onOwned?: (entry: ClosetEntry) => void;
};

export default function AddToClosetButton({ itemId, onOwned }: Props) {
  const { entry, loading, refetch } = useClosetEntry(itemId);
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  if (loading) return null;

  function handleAdded(newEntry: ClosetEntry, isOwned: boolean) {
    refetch();
    if (isOwned) onOwned?.(newEntry);
  }

  async function handleAddToWishlist() {
    if (!user) return;
    setWishlistLoading(true);
    await addToCloset({ userId: user.id, itemId, entryType: "interested", color: null });
    refetch();
    setWishlistLoading(false);
  }

  // Already owned — show disabled confirmation
  if (entry?.entry_type === "owned") {
    return (
      <TouchableOpacity className="py-4 rounded-xl items-center bg-gray-100" disabled>
        <Text className="font-semibold text-gray-500">In Your Closet ✓</Text>
      </TouchableOpacity>
    );
  }

  // In wishlist — single button to upgrade to owned
  if (entry?.entry_type === "interested") {
    return (
      <>
        <TouchableOpacity
          className="py-4 rounded-xl items-center bg-black"
          onPress={() => setModalVisible(true)}
        >
          <Text className="font-semibold text-white">In Wishlist — Mark as Owned?</Text>
        </TouchableOpacity>
        <AddToClosetModal
          visible={modalVisible}
          itemId={itemId}
          existingEntry={entry}
          onClose={() => setModalVisible(false)}
          onAdded={handleAdded}
        />
      </>
    );
  }

  // No entry — show both Add to Closet and Add to Wishlist buttons
  return (
    <>
      <View className="gap-3">
        <TouchableOpacity
          className="py-4 rounded-xl items-center bg-black"
          onPress={() => setModalVisible(true)}
        >
          <Text className="font-semibold text-white">Add to Closet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`py-4 rounded-xl items-center border border-black ${wishlistLoading ? "opacity-50" : ""}`}
          onPress={handleAddToWishlist}
          disabled={wishlistLoading}
        >
          <Text className="font-semibold text-black">Add to Wishlist</Text>
        </TouchableOpacity>
      </View>
      <AddToClosetModal
        visible={modalVisible}
        itemId={itemId}
        existingEntry={null}
        onClose={() => setModalVisible(false)}
        onAdded={handleAdded}
      />
    </>
  );
}
