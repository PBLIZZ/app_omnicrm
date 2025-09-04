"use client";
import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function Providers({ children }: { children: React.ReactNode }): JSX.Element {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="omnicrm-theme"
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
          <Toaster
            position="top-center" // top-left | top-center | top-right | bottom-left | bottom-center | bottom-right
            richColors // stronger color palettes for success/error/warning
            closeButton // show an explicit X button on each toast
            expand // stacks show full width as they grow
            theme="system" // light | dark | system
            visibleToasts={3} // max on-screen
            offset={16} // px from edges
            gap={8} // px between toasts
          />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
