import "./global.css";
import React from "react";
import * as WebBrowser from "expo-web-browser";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";

// Called at module level (not inside a component) — required by Expo to
// dismiss the auth browser session on Android when the app is reopened via redirect.
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
