// Stub — replaced in Chunk 3, Task 13
import React, { createContext, useContext, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextValue = { session: Session | null; user: User | null; loading: boolean };
const AuthContext = createContext<AuthContextValue>({ session: null, user: null, loading: false });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={{ session: null, user: null, loading: false }}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue { return useContext(AuthContext); }
