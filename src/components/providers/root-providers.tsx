"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from "@tanstack/react-query";
import { AuthProvider } from "@/components/providers/auth-provider"; // Import our new AuthProvider

export default function RootProviders({ children }: { children: React.ReactNode }): JSX.Element {
  // Move the QueryClient state hook directly into this component
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="omnicrm-theme"
    >
      <TooltipProvider>
        <TanStackQueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </TanStackQueryClientProvider>
        <Toaster
          position="top-center"
          richColors
          closeButton
          expand
          theme="system"
          visibleToasts={3}
          offset={16}
          gap={8}
        />
      </TooltipProvider>
    </ThemeProvider>
  );
}
