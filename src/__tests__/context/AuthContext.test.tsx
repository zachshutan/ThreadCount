import React from "react";
import { render, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthProvider, useAuth } from "../../context/AuthContext";

// Mock Supabase client
jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

function TestConsumer() {
  const { session, user, loading } = useAuth();
  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="session">{session ? "has-session" : "no-session"}</Text>
      <Text testID="user">{user ? "has-user" : "no-user"}</Text>
    </>
  );
}

describe("AuthContext", () => {
  it("renders without crashing", async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await act(async () => {});
    expect(getByTestId("session").props.children).toBe("no-session");
    expect(getByTestId("user").props.children).toBe("no-user");
  });
});
