import { AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

type AuthResult = { error: AuthError | null };

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: "threadcount" });
    console.log("[signInWithGoogle] redirectUri =", redirectUri);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    console.log("[signInWithGoogle] signInWithOAuth error =", error, "url =", data?.url);

    if (error || !data.url) return { error: error ?? { message: "No OAuth URL returned" } as AuthError };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    console.log("[signInWithGoogle] browser result type =", result.type);
    if (result.type === "success") {
      console.log("[signInWithGoogle] result.url =", result.url);
    }

    if (result.type === "success" && result.url) {
      const parsed = new URL(result.url);
      const code = parsed.searchParams.get("code");
      const hashParams = new URLSearchParams(parsed.hash.slice(1));
      const hashCode = hashParams.get("code");
      console.log("[signInWithGoogle] code (query) =", code, "code (hash) =", hashCode);

      const finalCode = code ?? hashCode;
      if (finalCode) {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(finalCode);
        console.log("[signInWithGoogle] exchangeCodeForSession error =", sessionError);
        return { error: sessionError };
      }
      console.log("[signInWithGoogle] no code found in URL — full URL was:", result.url);
    }

    return { error: null };
  } catch (e) {
    console.log("[signInWithGoogle] caught exception:", e);
    return { error: { message: String(e) } as AuthError };
  }
}
