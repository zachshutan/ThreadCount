import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { signInWithGoogle } from "../../services/authService";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Welcome">;
};

export default function WelcomeScreen({ navigation }: Props) {
  console.log("[WelcomeScreen] rendering");
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) Alert.alert("Google sign in failed", error.message);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }} className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-4xl font-bold mb-2">Threadcount</Text>
      <Text className="text-base text-gray-500 mb-12 text-center">
        Rate what you own. Discover what's next.
      </Text>
      <TouchableOpacity
        className="w-full bg-black py-4 rounded-xl mb-3 items-center"
        onPress={() => navigation.navigate("SignUp")}
      >
        <Text className="text-white font-semibold text-base">Create account</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="w-full border border-black py-4 rounded-xl items-center mb-6"
        onPress={() => navigation.navigate("LogIn")}
      >
        <Text className="text-black font-semibold text-base">Log in</Text>
      </TouchableOpacity>
      <View className="flex-row items-center w-full mb-6">
        <View className="flex-1 h-px bg-gray-200" />
        <Text className="mx-3 text-gray-400 text-sm">or</Text>
        <View className="flex-1 h-px bg-gray-200" />
      </View>
      <TouchableOpacity
        className={`w-full border border-gray-300 py-4 rounded-xl items-center ${
          googleLoading ? "opacity-50" : ""
        }`}
        onPress={handleGoogleSignIn}
        disabled={googleLoading}
      >
        <Text className="font-semibold text-base">
          {googleLoading ? "Connecting…" : "Continue with Google"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
