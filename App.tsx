import "./global.css";
import React from "react";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";

// Called at module level (not inside a component) — required by Expo to
// dismiss the auth browser session on Android when the app is reopened via redirect.
WebBrowser.maybeCompleteAuthSession();
console.log("[App] module loaded");

export default function App() {
  console.log("[App] rendering");
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
