"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarBrandHeader } from "@/components/layout/SidebarBrandHeader";
import { SidebarMainSectionNav } from "@/components/layout/SidebarMainSectionNav";
import { DynamicBreadcrumb } from "@/components/layout/DynamicBreadcrumb";
import { Button } from "@/components/ui/button";
import { Bot, Search } from "lucide-react";

interface AuthorizedLayoutProps {
  children: React.ReactNode;
}

/**
 * AuthorizedLayout - Modern application layout using shadcn sidebar components
 */
export default function AuthorizedLayout({ children }: AuthorizedLayoutProps): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="flex w-full">
          <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader>
              <SidebarBrandHeader />
            </SidebarHeader>

            <SidebarContent>
              <SidebarMainSectionNav />
            </SidebarContent>

            <SidebarFooter>
              {/* User Nav placeholder */}
              <div className="p-4 text-sm text-muted-foreground">User Navigation</div>
            </SidebarFooter>
            <SidebarRail />
          </Sidebar>

          <SidebarInset>
            <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
              <SidebarTrigger className="-ml-1" variant="ghost" size="icon" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DynamicBreadcrumb />
              <div className="flex-1" />
              
              {/* Right Side Actions */}
              <div className="flex items-center gap-2">
                {/* Global Search */}
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex items-center gap-2 min-w-[200px] justify-start text-muted-foreground"
                >
                  <Search className="h-4 w-4" />
                  <span className="flex-1 text-left">Search...</span>
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ⌘K
                  </kbd>
                </Button>

                {/* Mobile Search */}
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Search className="h-5 w-5" />
                </Button>

                {/* AI Assistant Toggle */}
                <Button variant="ghost" size="sm" className="relative hover-glow">
                  <Bot className="h-6 w-6" />
                </Button>
              </div>
            </header>

            <main className="flex flex-1 flex-col gap-4 p-4 min-h-0">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </QueryClientProvider>
  );
}