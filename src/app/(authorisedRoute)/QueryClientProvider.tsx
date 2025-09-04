"use client";
import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from "@tanstack/react-query";

export function QueryClientProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // 30 seconds
            retry: 1,
          },
        },
      }),
  );

  return <TanStackQueryClientProvider client={queryClient}>{children}</TanStackQueryClientProvider>;
}
