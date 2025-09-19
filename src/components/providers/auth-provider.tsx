"use client";

import { createContext, useContext } from "react";
import { useAuth, type UseAuthResult } from "@/hooks/use-auth"; // Import from our new hook file

const AuthContext = createContext<UseAuthResult>({
  user: null,
  isLoading: true,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useUser(): UseAuthResult {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useUser must be used within an AuthProvider");
  }
  return context;
}
