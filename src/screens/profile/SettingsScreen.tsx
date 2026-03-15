import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, Alert, TextInput, ScrollView, Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { signOut } from "../../services/authService";
import { updateUsername } from "../../services/followService";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function SettingsRow({
  icon, label, onPress, destructive = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between py-4 border-b border-gray-100"
      onPress={onPress}
    >
      <View className="flex-row items-center gap-3">
        <Ionicons name={icon} size={20} color={destructive ? "#ef4444" : "#000"} />
        <Text className={`font-medium ${destructive ? "text-red-500" : "text-black"}`}>{label}</Text>
      </View>
      {!destructive && <Ionicons name="chevron-forward" size={16} color="#9ca3af" />}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-6 px-4">
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [editingUsername, setEditingUsername] = useState(false);
  const [username, setUsername] = useState("");

  async function handleSaveUsername() {
    if (!user || !username.trim()) return;
    const { error } = await updateUsername(user.id, username.trim());
    if (error) {
      Alert.alert("Error", "Could not update username. It may already be taken.");
    } else {
      setEditingUsername(false);
      setUsername("");
      navigation.goBack();
    }
  }

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => Alert.alert("Coming soon", "Account deletion will be available soon.") },
      ]
    );
  }

  function comingSoon(feature: string) {
    Alert.alert(feature, "This feature is coming soon.");
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 48 }}>

      {/* ACCOUNT */}
      <SectionHeader title="Account" />
      <View className="px-4">
        {editingUsername ? (
          <View className="flex-row items-center gap-3 py-3">
            <TextInput
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3"
              value={username}
              onChangeText={setUsername}
              autoFocus
              placeholder="New username"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={handleSaveUsername} className="bg-black px-4 py-3 rounded-xl">
              <Text className="text-white font-semibold">Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setEditingUsername(false); setUsername(""); }}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SettingsRow icon="person-outline" label="Edit username" onPress={() => setEditingUsername(true)} />
        )}
        <SettingsRow icon="key-outline" label="Change password" onPress={() => comingSoon("Change password")} />
      </View>

      {/* NOTIFICATIONS */}
      <SectionHeader title="Notifications" />
      <View className="px-4">
        <SettingsRow icon="notifications-outline" label="Push notifications" onPress={() => comingSoon("Push notifications")} />
        <SettingsRow icon="mail-outline" label="Email preferences" onPress={() => comingSoon("Email preferences")} />
      </View>

      {/* PRIVACY */}
      <SectionHeader title="Privacy" />
      <View className="px-4">
        <SettingsRow icon="eye-outline" label="Who can see my closet" onPress={() => comingSoon("Closet visibility")} />
        <SettingsRow icon="person-add-outline" label="Who can follow me" onPress={() => comingSoon("Follow permissions")} />
      </View>

      {/* HELP & SUPPORT */}
      <SectionHeader title="Help & Support" />
      <View className="px-4">
        <SettingsRow icon="help-circle-outline" label="FAQ / Help center" onPress={() => comingSoon("Help center")} />
        <SettingsRow
          icon="bug-outline"
          label="Report a bug"
          onPress={() => Linking.openURL("mailto:support@threadcount.app?subject=Bug Report")}
        />
        <SettingsRow icon="document-text-outline" label="Terms of Service" onPress={() => comingSoon("Terms of Service")} />
        <SettingsRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => comingSoon("Privacy Policy")} />
      </View>

      {/* DANGER ZONE */}
      <SectionHeader title="Danger Zone" />
      <View className="px-4">
        <SettingsRow icon="log-out-outline" label="Log out" onPress={handleLogout} destructive />
        <SettingsRow icon="trash-outline" label="Delete account" onPress={handleDeleteAccount} destructive />
      </View>

    </ScrollView>
  );
}
