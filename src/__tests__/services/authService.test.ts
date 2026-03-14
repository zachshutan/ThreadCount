import { signUp, signIn, signOut } from "../../services/authService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe("signUp", () => {
  it("calls supabase.auth.signUp with email and password", async () => {
    (mockSupabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: "123" }, session: null },
      error: null,
    });

    const result = await signUp("test@example.com", "password123");
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.error).toBeNull();
  });

  it("returns error when supabase returns error", async () => {
    (mockSupabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: "Email already in use" },
    });

    const result = await signUp("taken@example.com", "password123");
    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBe("Email already in use");
  });
});

describe("signIn", () => {
  it("calls supabase.auth.signInWithPassword", async () => {
    (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { session: { access_token: "token" } },
      error: null,
    });

    const result = await signIn("test@example.com", "password123");
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.error).toBeNull();
  });
});

describe("signOut", () => {
  it("calls supabase.auth.signOut", async () => {
    (mockSupabase.auth.signOut as jest.Mock).mockResolvedValueOnce({ error: null });
    await signOut();
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });
});
