"use client";

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
import { Separator } from "@/components/ui";
import { AppSidebarController } from "./AppSidebarController";
import { UserNav } from "./UserNav";
import { OmniBotFloat } from "./OmniBotFloat";
import { DynamicBreadcrumb } from "./DynamicBreadcrumb";
import { SidebarBrandHeader } from "./SidebarBrandHeader";
import { SidebarMainSectionNav } from "./SidebarMainSectionNav";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
// import { SearchModal } from "@/components/SearchModal"; // Temporarily disabled
import { toast } from "sonner";
import { useHeaderControls } from "@/hooks/use-header-controls";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsMenu } from "@/components/NotificationsMenu";

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * MainLayout - Modern application layout using shadcn sidebar components
 *
 * Layout Structure:
 * - SidebarProvider manages sidebar state
 * - Sidebar contains header, content (route-based), and footer (user nav)
 * - SidebarInset contains the main content with trigger and breadcrumbs
 * - Mobile-responsive with built-in sidebar behavior
 */
export function MainLayout({ children }: MainLayoutProps): JSX.Element {
  const {
    mounted,
    theme,
    setTheme,
    notificationCount,
    // handleSearch, // Temporarily disabled
  } = useHeaderControls();
  return (
    <SidebarProvider>
      <div className="flex w-full">
        <Sidebar collapsible="icon" variant="floating">
          <SidebarHeader>
            <SidebarBrandHeader />
          </SidebarHeader>

          <SidebarContent>
            <SidebarMainSectionNav />
            <AppSidebarController />
          </SidebarContent>

          <SidebarFooter>
            <UserNav />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1" variant="ghost" size="icon" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <DynamicBreadcrumb />
            <div className="flex-1" />
            <div className="flex items-center gap-2"></div>
            {/* Right Side - Search, AI, Notifications, User */}
            <div className="flex items-center gap-2">
              {/* Global Search - Temporarily disabled */}
              {/* TODO: Implement unified search for clients, tasks, notes, etc.
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex items-center gap-2 min-w-[200px] justify-start text-muted-foreground"
                onClick={handleSearch}
              >
                <Search className="h-4 w-4" />
                <span className="flex-1 text-left">Search clients, tasks, notes...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </Button>

              <Button variant="ghost" size="sm" className="md:hidden" onClick={handleSearch}>
                <Search className="h-5 w-5" />
              </Button>
              */}

              {/* AI Assistant Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="relative hover-glow"
                onClick={() => {
                  toast.info("AI Assistant coming soon! Track progress at GitHub Issues.");
                }}
              >
                <Bot className="h-6 w-6" />
              </Button>

              {/* Theme Toggle */}
              <ThemeToggle mounted={mounted} theme={theme} setTheme={setTheme} />

              {/* Notifications */}
              <NotificationsMenu notificationCount={notificationCount} />
            </div>
            {/* <SearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} /> */}
          </header>

          <main className="flex flex-1 flex-col gap-4 p-4 min-h-0">{children}</main>
          <OmniBotFloat />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
