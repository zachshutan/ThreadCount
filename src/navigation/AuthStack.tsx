import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "../screens/auth/WelcomeScreen";

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  LogIn: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      {/* SignUpScreen and LogInScreen added in Chunk 3 */}
    </Stack.Navigator>
  );
}
