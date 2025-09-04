"use client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Providers({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="omnicrm-theme"
    >
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
    </ThemeProvider>
  );
}
